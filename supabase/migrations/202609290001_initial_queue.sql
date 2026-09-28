-- Altun Studio: private pilot foundation. Run once in this project's SQL Editor.
-- No existing application tables are dropped; changes are transactional.
begin;

create table public.studio_members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.studio_members enable row level security;
revoke all on public.studio_members from anon, authenticated;
grant select on public.studio_members to authenticated;
grant all on public.studio_members to service_role;
create policy "Members can see their own access" on public.studio_members
  for select to authenticated using (user_id = (select auth.uid()));

create table public.generation_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  prompt text not null check (char_length(btrim(prompt)) between 1 and 1000),
  style text not null check (style in ('Halay','Ankara havası','Roman havası','Çiftetelli','Serbest')),
  instruments text[] not null default '{}'
    check (cardinality(instruments) <= 6 and instruments <@ array['Bağlama','Darbuka','Davul','Klarnet','Keman','Zurna']::text[]),
  bpm integer not null check (bpm between 60 and 180),
  duration_seconds integer not null check (duration_seconds in (15,30)),
  status text not null default 'queued'
    check (status in ('queued','processing','completed','failed','cancelled')),
  output_path text,
  error_message text,
  worker_id text,
  lease_expires_at timestamptz,
  attempts integer not null default 0 check (attempts >= 0),
  created_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  check (output_path is null or output_path like user_id::text || '/' || id::text || '/%'),
  check (status <> 'completed' or (output_path is not null and completed_at is not null))
);
create index generation_jobs_queue on public.generation_jobs (created_at) where status = 'queued';
create index generation_jobs_user_history on public.generation_jobs (user_id, created_at desc);
alter table public.generation_jobs enable row level security;
revoke all on public.generation_jobs from anon, authenticated;
grant select on public.generation_jobs to authenticated;
grant all on public.generation_jobs to service_role;
create policy "Users can read their own jobs" on public.generation_jobs
  for select to authenticated using (user_id = (select auth.uid()));

-- Only this bounded function may accept browser-submitted jobs.
create function public.enqueue_generation(
  p_prompt text, p_style text, p_instruments text[], p_bpm integer, p_duration integer
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_id uuid;
begin
  if v_user is null then raise exception 'Sign in required' using errcode = '42501'; end if;
  -- Serialize concurrent submissions from the same pilot account.
  perform 1 from public.studio_members where user_id = v_user for update;
  if not found then raise exception 'Pilot access required' using errcode = '42501'; end if;
  if exists (select 1 from public.generation_jobs where user_id = v_user and status in ('queued','processing')) then
    raise exception 'A generation is already active';
  end if;
  if (select count(*) from public.generation_jobs where user_id = v_user and created_at >= now() - interval '24 hours') >= 20 then
    raise exception 'Daily generation limit reached';
  end if;
  insert into public.generation_jobs(user_id, prompt, style, instruments, bpm, duration_seconds)
    values (v_user, btrim(p_prompt), p_style, p_instruments, p_bpm, p_duration)
    returning id into v_id;
  return v_id;
end;
$$;
revoke all on function public.enqueue_generation(text,text,text[],integer,integer) from public, anon;
grant execute on function public.enqueue_generation(text,text,text[],integer,integer) to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('generated-audio','generated-audio',false,52428800,array['audio/wav','audio/wave','audio/x-wav','audio/mpeg','audio/flac']);

-- Uploads are reserved for the trusted worker. Users can only read their own completed audio.
create policy "Users can read their own completed audio" on storage.objects
  for select to authenticated using (
    bucket_id = 'generated-audio'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and exists (
      select 1 from public.generation_jobs j
      where j.output_path = storage.objects.name and j.user_id = (select auth.uid())
        and j.status = 'completed'
    )
  );

commit;
