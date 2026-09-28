-- Run after 202609290001_initial_queue.sql. Worker RPCs are service-role only.
begin;
create table public.studio_worker (
  id boolean primary key default true check (id),
  last_seen timestamptz not null default now()
);
alter table public.studio_worker enable row level security;
revoke all on public.studio_worker from anon, authenticated;
grant select on public.studio_worker to authenticated;
grant all on public.studio_worker to service_role;
create policy "Pilots see worker availability" on public.studio_worker for select to authenticated
using (exists(select 1 from public.studio_members where user_id = (select auth.uid())));

create function public.worker_tick(p_worker text, p_job uuid default null, p_attempt integer default null)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  insert into public.studio_worker(id,last_seen) values(true,now())
  on conflict(id) do update set last_seen=excluded.last_seen;
  if p_job is null then return true; end if;
  update public.generation_jobs set lease_expires_at=now()+interval '2 minutes'
  where id=p_job and worker_id=p_worker and attempts=p_attempt and status='processing'
    and lease_expires_at>now();
  return found;
end;
$$;

create function public.claim_generation(p_worker text)
returns setof public.generation_jobs language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  -- One active generation across worker processes. Never retry expired work automatically.
  perform pg_catalog.pg_advisory_xact_lock(728391);
  update public.generation_jobs set status='failed',completed_at=now(),
    error_message='Üretim programıyla bağlantı kesildi.',lease_expires_at=null
  where status='processing' and lease_expires_at<=now();
  if exists(select 1 from public.generation_jobs where status='processing') then return; end if;
  select id into v_id from public.generation_jobs where status='queued'
    order by created_at for update skip locked limit 1;
  if v_id is null then return; end if;
  return query update public.generation_jobs set status='processing',worker_id=p_worker,
    attempts=attempts+1,started_at=now(),lease_expires_at=now()+interval '2 minutes'
    where id=v_id returning *;
end;
$$;

create function public.finish_generation(p_worker text,p_job uuid,p_attempt integer,p_success boolean)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  update public.generation_jobs set status=case when p_success then 'completed' else 'failed' end,
    output_path=case when p_success then user_id::text||'/'||id::text||'/audio.wav' else null end,
    error_message=case when p_success then null else 'Müzik üretilemedi. Yeniden deneyebilirsin.' end,
    completed_at=now(),lease_expires_at=null
  where id=p_job and worker_id=p_worker and attempts=p_attempt and status='processing'
    and lease_expires_at>now();
  return found;
end;
$$;

revoke all on function public.worker_tick(text,uuid,integer) from public,anon,authenticated;
revoke all on function public.claim_generation(text) from public,anon,authenticated;
revoke all on function public.finish_generation(text,uuid,integer,boolean) from public,anon,authenticated;
grant execute on function public.worker_tick(text,uuid,integer) to service_role;
grant execute on function public.claim_generation(text) to service_role;
grant execute on function public.finish_generation(text,uuid,integer,boolean) to service_role;

create function public.cancel_generation(p_job uuid) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  update public.generation_jobs set status='cancelled',completed_at=now()
    where id=p_job and user_id=auth.uid() and status='queued';
  return found;
end;
$$;
revoke all on function public.cancel_generation(uuid) from public,anon;
grant execute on function public.cancel_generation(uuid) to authenticated;
commit;
