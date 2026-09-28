"use client";

import { useEffect, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { getSupabaseClient } from "../lib/supabase/client";

type Job = {
  id: string;
  prompt: string;
  status: string;
  output_path: string | null;
  error_message: string | null;
  duration_seconds: number;
};
type Props = {
  prompt: string;
  style: string;
  instruments: string[];
  bpm: number;
  duration: number;
};
const labels: Record<string, string> = {
  queued: "Sırada",
  processing: "Üretiliyor",
  completed: "Hazır",
  failed: "Başarısız",
  cancelled: "İptal edildi",
};

export function GenerationPanel(props: Props) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [signup, setSignup] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [member, setMember] = useState(false);
  const [online, setOnline] = useState(false);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [audio, setAudio] = useState<{ id: string; url: string } | null>(null);
  const identity = useRef<string | undefined>(undefined);

  useEffect(() => {
    const db = getSupabaseClient();
    const {
      data: { subscription },
    } = db.auth.onAuthStateChange((_event, session) => {
      const next = session?.user ?? null;
      if (identity.current !== next?.id) {
        identity.current = next?.id;
        setJobs([]);
        setAudio(null);
        setMember(false);
        setOnline(false);
        setMessage("");
      }
      setUser(next);
      setLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    const db = getSupabaseClient();
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    async function refresh() {
      try {
        const [access, history, worker] = await Promise.all([
          db
            .from("studio_members")
            .select("user_id")
            .eq("user_id", user!.id)
            .maybeSingle(),
          db
            .from("generation_jobs")
            .select(
              "id,prompt,status,output_path,error_message,duration_seconds",
            )
            .eq("user_id", user!.id)
            .order("created_at", { ascending: false })
            .limit(10),
          db
            .from("studio_worker")
            .select("last_seen")
            .eq("id", true)
            .maybeSingle(),
        ]);
        if (stopped) return;
        if (access.error || history.error)
          throw new Error("Veriler alınamadı. Bağlantı yeniden denenecek.");
        setMember(Boolean(access.data));
        setJobs(history.data ?? []);
        setOnline(
          !worker.error &&
            Boolean(worker.data) &&
            Date.now() - Date.parse(worker.data!.last_seen) < 45000,
        );
      } catch {
        if (!stopped) {
          setOnline(false);
          setMessage("Kuyruk bilgisi alınamadı. Bağlantı yeniden denenecek.");
        }
      } finally {
        if (!stopped) timer = setTimeout(refresh, 5000);
      }
    }
    void refresh();
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [user?.id]); // Refresh only when the account changes, not when its token refreshes.

  async function authenticate(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const db = getSupabaseClient();
      const result = signup
        ? await db.auth.signUp({
            email,
            password,
            options: { emailRedirectTo: window.location.origin },
          })
        : await db.auth.signInWithPassword({ email, password });
      if (result.error) {
        setMessage(
          result.error.code === "email_not_confirmed"
            ? "Önce e-postandaki onay bağlantısını aç."
            : signup
              ? "Hesap açılamadı. Bilgilerini kontrol et; e-posta gönderim sınırı nedeniyle daha sonra denemen gerekebilir."
              : "Giriş yapılamadı. E-posta ve şifreni kontrol et.",
        );
      } else {
        setPassword("");
        setMessage(
          signup && !result.data.session
            ? "E-postana gelen bağlantıyla hesabını doğrula, ardından giriş yap."
            : "",
        );
      }
    } catch {
      setMessage("Bağlantı kurulamadı. Yeniden dene.");
    } finally {
      setBusy(false);
    }
  }

  async function enqueue() {
    const owner = user?.id;
    setBusy(true);
    setMessage("");
    try {
      const { error } = await getSupabaseClient().rpc("enqueue_generation", {
        p_prompt: props.prompt.trim(),
        p_style: props.style,
        p_instruments: props.instruments,
        p_bpm: props.bpm,
        p_duration: props.duration,
      });
      if (identity.current !== owner) return;
      setMessage(
        error
          ? error.message.includes("already active")
            ? "Zaten sırada veya üretilen bir isteğin var."
            : error.message.includes("Daily")
              ? "Bugünkü 20 üretim sınırına ulaştın."
              : "İstek eklenemedi. Pilot erişimini ve ayarlarını kontrol et."
          : "İsteğin sıraya eklendi. Sonucu aşağıdan takip edebilirsin.",
      );
    } catch {
      if (identity.current === owner)
        setMessage("İsteğin durumunu kuyruktan kontrol et; bağlantı kesildi.");
    } finally {
      setBusy(false);
    }
  }

  async function listen(job: Job) {
    if (!job.output_path) return;
    const owner = user?.id;
    setBusy(true);
    try {
      const { data, error } = await getSupabaseClient()
        .storage.from("generated-audio")
        .createSignedUrl(job.output_path, 3600);
      if (identity.current !== owner) return;
      if (error) setMessage("Ses dosyası açılamadı. Yeniden dene.");
      else setAudio({ id: job.id, url: data.signedUrl });
    } catch {
      if (identity.current === owner) setMessage("Ses bağlantısı alınamadı.");
    } finally {
      setBusy(false);
    }
  }

  async function cancel(id: string) {
    setBusy(true);
    try {
      const { data, error } = await getSupabaseClient().rpc(
        "cancel_generation",
        { p_job: id },
      );
      setMessage(
        error
          ? "İptal edilemedi."
          : data
            ? "İstek iptal edildi."
            : "Üretim başlamış olabilir; kuyruk yenileniyor.",
      );
    } catch {
      setMessage("Bağlantı kurulamadı.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="generation-panel" aria-label="Hesap ve müzik üretimi">
      <h3>Stüdyona bağlan</h3>
      {loading ? (
        <p>Hesap kontrol ediliyor…</p>
      ) : !user ? (
        <>
          <p>
            Üretimlerini hesabında saklamak için giriş yap. Müzik üretimi
            şimdilik pilot hesaplara açık.
          </p>
          <form onSubmit={authenticate}>
            <label>
              E-posta
              <input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <label>
              Şifre
              <input
                type="password"
                autoComplete={signup ? "new-password" : "current-password"}
                minLength={8}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
            <button className="primary-button" disabled={busy}>
              {busy ? "Bağlanıyor…" : signup ? "Hesap oluştur" : "Giriş yap"}
            </button>
            <button
              type="button"
              className="account-link"
              disabled={busy}
              onClick={() => {
                setSignup(!signup);
                setMessage("");
              }}
            >
              {signup ? "Hesabım var, giriş yap" : "Hesabım yok, kayıt ol"}
            </button>
          </form>
        </>
      ) : (
        <>
          <div className="account-row">
            <span>{user.email}</span>
            <button
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  const { error } = await getSupabaseClient().auth.signOut();
                  if (error) setMessage("Çıkış yapılamadı. Yeniden dene.");
                } finally {
                  setBusy(false);
                }
              }}
            >
              Çıkış
            </button>
          </div>
          {!member ? (
            <p>
              Hesabın açık. Müzik üretmek için pilot erişiminin tanımlanması
              gerekiyor.
            </p>
          ) : (
            <>
              <p>
                {online
                  ? "Üretim bilgisayarı hazır · Enstrümantal demo"
                  : "Üretim bilgisayarı çevrimdışı veya henüz bağlanmadı."}
              </p>
              <button
                className="primary-button"
                onClick={enqueue}
                disabled={
                  busy ||
                  !online ||
                  !props.prompt.trim() ||
                  props.prompt.trim().length > 1000 ||
                  ![15, 30].includes(props.duration) ||
                  jobs.some((j) => ["queued", "processing"].includes(j.status))
                }
              >
                Müzik üret · {props.duration} saniye
              </button>
            </>
          )}
          {jobs.length > 0 && (
            <div className="generation-history">
              <h4>Son üretimlerin</h4>
              {jobs.map((job) => (
                <article key={job.id}>
                  <div>
                    <strong>
                      {labels[job.status] ?? job.status} ·{" "}
                      {job.duration_seconds} sn
                    </strong>
                    <p>{job.prompt}</p>
                  </div>
                  {job.status === "completed" && (
                    <button disabled={busy} onClick={() => listen(job)}>
                      Dinle / indir
                    </button>
                  )}
                  {job.status === "queued" && (
                    <button disabled={busy} onClick={() => cancel(job.id)}>
                      İptal et
                    </button>
                  )}
                  {job.error_message && <p>{job.error_message}</p>}
                  {audio?.id === job.id && (
                    <audio
                      controls
                      autoPlay
                      src={audio.url}
                      onError={() =>
                        setMessage(
                          "Ses bağlantısı eskimiş olabilir. Dinle düğmesine tekrar bas.",
                        )
                      }
                    />
                  )}
                </article>
              ))}
            </div>
          )}
        </>
      )}
      {message && (
        <p role="status" className="account-message">
          {message}
        </p>
      )}
    </section>
  );
}
