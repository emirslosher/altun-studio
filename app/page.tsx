"use client";

import { useEffect, useRef, useState } from "react";
import {
  AudioLines,
  ArrowDownToLine,
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Clock3,
  Headphones,
  Heart,
  Library,
  ListMusic,
  Music2,
  Pause,
  Play,
  Plus,
  Search,
  SlidersHorizontal,
  Sparkles,
  Volume2,
  VolumeX,
  WandSparkles,
  X,
} from "lucide-react";

type Track = {
  id: string;
  title: string;
  subtitle: string;
  src: string;
  cover: string;
  liked: boolean;
  prompt?: string;
};
type Draft = {
  id: string;
  prompt: string;
  style: string;
  instruments: string[];
  bpm: number;
  duration: string;
  date: string;
};
const initialTracks: Track[] = [
  {
    id: "halay",
    title: "Anadolu'dan bir ses",
    subtitle: "Halay · 100 BPM · Hazır örnek",
    src: "/audio/halay-demo.wav",
    cover: "sun",
    liked: false,
  },
  {
    id: "lora",
    title: "Aynı ritim, yeni bir deneme",
    subtitle: "LoRA denemesi · Hazır örnek",
    src: "/audio/lora-demo.wav",
    cover: "olive",
    liked: false,
  },
];
const styles = [
  "Halay",
  "Ankara havası",
  "Roman havası",
  "Çiftetelli",
  "Serbest",
];
const instruments = [
  "Bağlama",
  "Darbuka",
  "Davul",
  "Klarnet",
  "Keman",
  "Zurna",
];
const inspirations = [
  {
    title: "Toprağın ritmi",
    genre: "HALAY",
    art: "earth",
    prompt:
      "Bağlama ve davulun öne çıktığı, güçlü ritimli, coşkulu bir Anadolu halayı. Vokalsiz, sıcak ve canlı bir kayıt hissi.",
    style: "Halay",
    instruments: ["Bağlama", "Davul"],
    bpm: 100,
  },
  {
    title: "Biraz Ankara",
    genre: "ANKARA HAVASI",
    art: "rose",
    prompt:
      "Bağlama ve darbuka ağırlıklı, hareketli ve neşeli bir Ankara oyun havası. Vokalsiz, kıvrak bir melodi.",
    style: "Ankara havası",
    instruments: ["Bağlama", "Darbuka"],
    bpm: 104,
  },
  {
    title: "Sokağın neşesi",
    genre: "ROMAN HAVASI",
    art: "sage",
    prompt:
      "Klarnet, keman ve darbukayla 9/8 ölçüsünde, enerjik ve kıvrak bir Roman havası. Vokalsiz.",
    style: "Roman havası",
    instruments: ["Klarnet", "Keman", "Darbuka"],
    bpm: 125,
  },
];
function Wave({
  active = false,
  large = false,
}: {
  active?: boolean;
  large?: boolean;
}) {
  return (
    <div
      className={`wave ${active ? "active" : ""} ${large ? "large" : ""}`}
      aria-hidden="true"
    >
      {Array.from({ length: large ? 62 : 24 }, (_, i) => (
        <i
          key={i}
          style={{
            height: `${18 + ((i * 37 + i * i * 3) % 79)}%`,
            animationDelay: `${i * 0.035}s`,
          }}
        />
      ))}
    </div>
  );
}
function Cover({ kind, small = false }: { kind: string; small?: boolean }) {
  return (
    <div className={`cover ${kind} ${small ? "small" : ""}`} aria-hidden="true">
      <div className="disc" />
      <div className="cover-line" />
    </div>
  );
}
const formatTime = (time: number) =>
  `${Math.floor(time / 60)}:${String(Math.floor(time % 60)).padStart(2, "0")}`;

export default function Studio() {
  const [view, setView] = useState("studio");
  const [prompt, setPrompt] = useState("");
  const [style, setStyle] = useState("Halay");
  const [selected, setSelected] = useState(["Bağlama", "Darbuka"]);
  const [bpm, setBpm] = useState(100);
  const [duration, setDuration] = useState("30");
  const [tracks, setTracks] = useState(initialTracks);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [query, setQuery] = useState("");
  const [current, setCurrent] = useState<Track>(initialTracks[0]);
  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [audioDuration, setAudioDuration] = useState(10);
  const [volume, setVolume] = useState(0.75);
  const [toast, setToast] = useState("");
  const [ready, setReady] = useState(false);
  const audio = useRef<HTMLAudioElement>(null);
  const help = useRef<HTMLDialogElement>(null);
  const promptInput = useRef<HTMLTextAreaElement>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("altun-drafts") || "[]");
      if (Array.isArray(saved))
        setDrafts(
          saved.filter(
            (d) =>
              typeof d?.id === "string" &&
              typeof d?.prompt === "string" &&
              Array.isArray(d?.instruments) &&
              typeof d?.style === "string" &&
              typeof d?.bpm === "number" &&
              typeof d?.duration === "string" &&
              typeof d?.date === "string",
          ),
        );
      const liked = JSON.parse(localStorage.getItem("altun-likes") || "[]");
      if (Array.isArray(liked))
        setTracks(
          initialTracks.map((t) => ({ ...t, liked: liked.includes(t.id) })),
        );
    } catch {
      /* Unavailable browser storage does not block the studio. */
    }
    setReady(true);
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);
  useEffect(() => {
    if (ready) {
      try {
        localStorage.setItem("altun-drafts", JSON.stringify(drafts));
        localStorage.setItem(
          "altun-likes",
          JSON.stringify(tracks.filter((t) => t.liked).map((t) => t.id)),
        );
      } catch {
        /* In-memory state remains usable. */
      }
    }
  }, [drafts, tracks, ready]);
  useEffect(() => {
    if (audio.current) audio.current.volume = volume;
  }, [volume]);
  function notify(message: string) {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 4500);
  }
  async function play(track: Track) {
    const player = audio.current;
    if (!player) return;
    if (track.id === current.id && !player.paused) {
      player.pause();
      return;
    }
    if (track.id !== current.id || !player.getAttribute("src")) {
      player.src = track.src;
      setCurrent(track);
      setPosition(0);
    }
    try {
      await player.play();
    } catch {
      notify("Ses oynatılamadı. Tekrar deneyebilirsin.");
    }
  }
  function like(id: string) {
    setTracks((old) =>
      old.map((t) => (t.id === id ? { ...t, liked: !t.liked } : t)),
    );
  }
  function saveDraft() {
    if (!prompt.trim()) {
      promptInput.current?.focus();
      notify("Önce hayalindeki müziği birkaç kelimeyle anlat.");
      return;
    }
    setDrafts((old) =>
      [
        {
          id: crypto.randomUUID(),
          prompt: prompt.trim(),
          style,
          instruments: selected,
          bpm,
          duration,
          date: new Date().toISOString(),
        },
        ...old,
      ].slice(0, 50),
    );
    notify("Taslağın bu tarayıcıya kaydedildi. Henüz yeni müzik üretilmedi.");
  }
  function useInspiration(index: number) {
    const item = inspirations[index];
    setPrompt(item.prompt);
    setStyle(item.style);
    setSelected(item.instruments);
    setBpm(item.bpm);
    setView("studio");
    promptInput.current?.focus();
  }
  function loadDraft(draft: Draft) {
    setPrompt(draft.prompt);
    setStyle(draft.style);
    setSelected(draft.instruments);
    setBpm(draft.bpm);
    setDuration(draft.duration);
    setView("studio");
  }
  const visibleTracks = tracks.filter(
    (t) =>
      (view !== "favorites" || t.liked) &&
      `${t.title} ${t.subtitle}`
        .toLocaleLowerCase("tr")
        .includes(query.toLocaleLowerCase("tr")),
  );
  const filteredDrafts = drafts.filter((d) =>
    `${d.prompt} ${d.style}`
      .toLocaleLowerCase("tr")
      .includes(query.toLocaleLowerCase("tr")),
  );

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        İçeriğe geç
      </a>
      <aside className="sidebar">
        <a className="brand" href="/" aria-label="Altun Studio ana sayfa">
          <span className="brand-symbol">
            <AudioLines size={26} />
          </span>
          <span>
            altun<span className="brand-sub">STUDIO</span>
          </span>
        </a>
        <div className="workspace-label">SENİN STÜDYON</div>
        <nav aria-label="Ana menü">
          {[
            { id: "studio", label: "Müzik oluştur", icon: WandSparkles },
            { id: "library", label: "Kütüphanem", icon: Library },
            { id: "favorites", label: "Beğendiklerim", icon: Heart },
          ].map((item) => (
            <button
              key={item.id}
              className={`nav-item ${view === item.id ? "selected" : ""}`}
              aria-current={view === item.id ? "page" : undefined}
              onClick={() => {
                setView(item.id);
                setQuery("");
              }}
            >
              <item.icon size={18} />
              <span>{item.label}</span>
              {item.id === "studio" && <span className="nav-dot" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-note">
          <span className="small-spark">
            <Sparkles size={18} />
          </span>
          <h3>Bir fikirle başlar.</h3>
          <p>
            Bir ritim, bir duygu,
            <br />
            sana ait bir ses.
          </p>
          <button
            onClick={() => {
              setView("studio");
              setPrompt("");
              promptInput.current?.focus();
            }}
          >
            Yeni bir fikir <Plus size={15} />
          </button>
        </div>
        <div className="sidebar-bottom">
          <button
            className="help-button"
            onClick={() => help.current?.showModal()}
          >
            <CircleHelp size={18} /> Nasıl çalışır?
          </button>
          <div className="profile">
            <span className="avatar">A</span>
            <div>
              Misafir stüdyosu<small>Bu cihazda çalışıyorsun</small>
            </div>
            <span className="profile-dot" />
          </div>
        </div>
      </aside>

      <div className="workspace">
        <header className="topbar">
          <div className="breadcrumb">
            Stüdyo <ChevronRight size={13} />
            <span>
              {view === "studio"
                ? "Müzik oluştur"
                : view === "library"
                  ? "Kütüphanem"
                  : "Beğendiklerim"}
            </span>
          </div>
          <div className="topbar-right">
            <span className="preview-pill">
              <span /> Önizleme sürümü
            </span>
            <button
              className="icon-button"
              aria-label="Yardımı aç"
              onClick={() => help.current?.showModal()}
            >
              <CircleHelp size={19} />
            </button>
          </div>
        </header>
        <main id="main">
          <section className="page-heading">
            <div className="eyebrow">
              <span />{" "}
              {view === "studio" ? "FİKRİNDEN İLK NOTAYA" : "SESİNE YER AÇ"}
            </div>
            <div className="heading-row">
              <div>
                <h1>
                  {view === "studio" ? (
                    <>
                      Sen hayal et.
                      <br className="mobile-break" /> Müziğin şekillensin.
                    </>
                  ) : view === "library" ? (
                    "Fikirlerin burada birikiyor."
                  ) : (
                    "Yeniden duymak istediklerin."
                  )}
                </h1>
                <p>
                  {view === "studio"
                    ? "Köklerinden ilham al. Kendi sesini keşfet."
                    : "Örnek kayıtlarını dinle, kaydettiğin fikirlere geri dön."}
                </p>
              </div>
              <span className="heading-mark" aria-hidden="true">
                <AudioLines size={42} strokeWidth={1} />
              </span>
            </div>
          </section>

          {view === "studio" ? (
            <>
              <div className="studio-grid">
                <section
                  className="creation-panel panel"
                  aria-labelledby="create-title"
                >
                  <div className="panel-heading">
                    <div>
                      <span className="step-number">01</span>
                      <h2 id="create-title">Müziğini tarif et</h2>
                    </div>
                    <span className="tiny-label">
                      SENİN FİKRİN, SENİN SESİN
                    </span>
                  </div>
                  <div className="prompt-wrap">
                    <textarea
                      ref={promptInput}
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      maxLength={1000}
                      aria-label="Müzik açıklaması"
                      placeholder="Nasıl bir müzik hayal ediyorsun? Örneğin: Bağlama ve darbukayla, içimi kıpır kıpır eden bir halay…"
                    />
                    <div className="prompt-bottom">
                      <button
                        onClick={() =>
                          useInspiration(
                            (styles.indexOf(style) + 1) % inspirations.length,
                          )
                        }
                      >
                        <Sparkles size={14} /> İlham ver
                      </button>
                      <span>{prompt.length}/1000</span>
                    </div>
                  </div>
                  <div className="field-label">
                    Tarz <span>Ruhunu seç</span>
                  </div>
                  <div className="chips">
                    {styles.map((s) => (
                      <button
                        key={s}
                        className={`chip ${style === s ? "chosen" : ""}`}
                        aria-pressed={style === s}
                        onClick={() => setStyle(s)}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                  <div className="field-label instrument-label">
                    Enstrümanlar <span>Birlikte nasıl tınlasın?</span>
                  </div>
                  <div className="chips instruments">
                    {instruments.map((i) => (
                      <button
                        key={i}
                        className={`chip ${selected.includes(i) ? "chosen" : ""}`}
                        aria-pressed={selected.includes(i)}
                        onClick={() =>
                          setSelected((old) =>
                            old.includes(i)
                              ? old.filter((x) => x !== i)
                              : [...old, i],
                          )
                        }
                      >
                        {selected.includes(i) ? (
                          <Check size={12} />
                        ) : (
                          <Plus size={12} />
                        )}
                        {i}
                      </button>
                    ))}
                  </div>
                  <div className="settings-row">
                    <div className="tempo-field">
                      <label htmlFor="tempo">
                        Tempo{" "}
                        <span>
                          {bpm} <small>BPM</small>
                        </span>
                      </label>
                      <input
                        id="tempo"
                        type="range"
                        min="60"
                        max="180"
                        value={bpm}
                        onChange={(e) => setBpm(Number(e.target.value))}
                      />
                    </div>
                    <div className="duration-field">
                      <label htmlFor="duration">Süre</label>
                      <div className="select-wrap">
                        <select
                          id="duration"
                          value={duration}
                          onChange={(e) => setDuration(e.target.value)}
                        >
                          <option value="15">15 saniye</option>
                          <option value="30">30 saniye</option>
                          <option value="60">60 saniye</option>
                        </select>
                        <ChevronDown size={14} />
                      </div>
                    </div>
                  </div>
                  <div className="instrumental-note">
                    <Music2 size={15} />
                    <span>Vokalsiz / enstrümantal</span>
                    <span className="mini-pill">İlk sürüm</span>
                  </div>
                  <button className="primary-button" onClick={saveDraft}>
                    <WandSparkles size={18} /> Taslağımı kaydet{" "}
                    <ArrowRight size={18} />
                  </button>
                  <p className="demo-note">
                    Önizlemede fikirlerini kaydedebilirsin. Canlı müzik üretimi
                    henüz açık değil.
                  </p>
                </section>

                <section
                  className="listening-panel panel"
                  aria-labelledby="listen-title"
                >
                  <div className="panel-heading">
                    <div>
                      <Headphones size={18} />
                      <h2 id="listen-title">Stüdyodan ilk sesler</h2>
                    </div>
                    <span className="live-dot" />
                  </div>
                  <div className="featured-art">
                    <div className="art-orbit orbit-one" />
                    <div className="art-orbit orbit-two" />
                    <div className="art-orbit orbit-three" />
                    <div className="vinyl">
                      <div className="vinyl-label">
                        <AudioLines size={29} />
                        <span>
                          ALTUN
                          <br />
                          SESSIONS / 001
                        </span>
                      </div>
                    </div>
                    <span className="art-top">KÖKLERDEN GELEN SES</span>
                    <span className="art-bottom">
                      ANADOLU
                      <br />
                      <em>bir başlangıç.</em>
                    </span>
                    <span className="art-index">01 — 02</span>
                  </div>
                  <div className="featured-info">
                    <div>
                      <span className="eyebrow">İLK DENEMELER</span>
                      <h3>Her sesin bir hikâyesi var.</h3>
                      <p>Stüdyonun ilk iki kaydına kulak ver.</p>
                    </div>
                    <button
                      className="round-play"
                      aria-label="İlk örneği dinle"
                      onClick={() => play(tracks[0])}
                    >
                      {playing && current.id === tracks[0].id ? (
                        <Pause size={19} fill="currentColor" />
                      ) : (
                        <Play size={19} fill="currentColor" />
                      )}
                    </button>
                  </div>
                  <div className="mini-track-list">
                    {tracks.map((track, index) => (
                      <div className="mini-track" key={track.id}>
                        <button
                          className="mini-track-main"
                          onClick={() => play(track)}
                          aria-label={`${track.title} ${playing && current.id === track.id ? "duraklat" : "dinle"}`}
                        >
                          <span className="track-index">
                            {playing && current.id === track.id ? (
                              <AudioLines size={15} />
                            ) : (
                              `0${index + 1}`
                            )}
                          </span>
                          <div>
                            <strong>{track.title}</strong>
                            <span>
                              {index === 0
                                ? "Temel model"
                                : "Kısa eğitim denemesi"}{" "}
                              · 10 sn
                            </span>
                          </div>
                        </button>
                        <button
                          className={`icon-button like ${track.liked ? "liked" : ""}`}
                          aria-label={`${track.title} ${track.liked ? "beğeniyi kaldır" : "beğen"}`}
                          aria-pressed={track.liked}
                          onClick={() => like(track.id)}
                        >
                          <Heart
                            size={16}
                            fill={track.liked ? "currentColor" : "none"}
                          />
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="sample-caption">
                    Hazır örneklerdir; yazdığın tarife göre değişmez.
                  </div>
                </section>
              </div>
              <section className="inspiration-section">
                <div className="section-title">
                  <div>
                    <span className="eyebrow">BİR YERDEN BAŞLA</span>
                    <h2>Bugün hangi ruh hâlindesin?</h2>
                  </div>
                  <span>
                    Bir fikri seç, kendine göre değiştir{" "}
                    <ArrowUpRight size={15} />
                  </span>
                </div>
                <div className="inspiration-grid">
                  {inspirations.map((item, i) => (
                    <button
                      className={`inspiration-card ${item.art}`}
                      key={item.title}
                      onClick={() => useInspiration(i)}
                    >
                      <div className="motif" aria-hidden="true">
                        <i />
                        <i />
                        <i />
                        <i />
                      </div>
                      <div>
                        <span>{item.genre}</span>
                        <h3>{item.title}</h3>
                        <p>{item.instruments.join(" · ")}</p>
                      </div>
                      <span className="card-arrow">
                        <ArrowUpRight size={19} />
                      </span>
                    </button>
                  ))}
                </div>
              </section>
            </>
          ) : (
            <section className="library-panel panel">
              <div className="library-heading">
                <div>
                  <h2>
                    {view === "library"
                      ? "Kayıtlar & taslaklar"
                      : "Beğendiğin kayıtlar"}
                  </h2>
                  <p>
                    {view === "library"
                      ? "Taslakların yalnızca bu tarayıcıda saklanır."
                      : "Sevdiğin sesi bir kez daha dinle."}
                  </p>
                </div>
                <label className="search">
                  <Search size={16} />
                  <input
                    aria-label="Kütüphanede ara"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Bir ses veya fikir ara"
                  />
                </label>
              </div>
              <div className="library-tracks">
                {visibleTracks.map((track) => (
                  <div className="library-track" key={track.id}>
                    <Cover kind={track.cover} small />
                    <button
                      className="library-track-name"
                      onClick={() => play(track)}
                    >
                      <strong>{track.title}</strong>
                      <span>{track.subtitle}</span>
                    </button>
                    <span className="track-length">0:10</span>
                    <button
                      className={`icon-button like ${track.liked ? "liked" : ""}`}
                      aria-label={`${track.title} beğeni durumunu değiştir`}
                      aria-pressed={track.liked}
                      onClick={() => like(track.id)}
                    >
                      <Heart
                        size={17}
                        fill={track.liked ? "currentColor" : "none"}
                      />
                    </button>
                    <button
                      className="icon-button"
                      aria-label={`${track.title} dinle veya duraklat`}
                      onClick={() => play(track)}
                    >
                      {playing && current.id === track.id ? (
                        <Pause size={18} />
                      ) : (
                        <Play size={18} />
                      )}
                    </button>
                    <a
                      className="icon-button"
                      href={track.src}
                      download
                      aria-label={`${track.title} indir`}
                    >
                      <ArrowDownToLine size={17} />
                    </a>
                  </div>
                ))}
                {visibleTracks.length === 0 && (
                  <div className="empty-state">
                    <Heart size={28} />
                    <h3>
                      {query
                        ? "Aradığın ses burada yok."
                        : "Bir ses kalbine dokunsun."}
                    </h3>
                    <p>
                      {query
                        ? "Başka bir kelimeyle aramayı dene."
                        : "Kayıtların yanındaki kalbe dokunarak buraya ekleyebilirsin."}
                    </p>
                  </div>
                )}
              </div>
              {view === "library" && (
                <div className="drafts">
                  <h3>
                    <ListMusic size={17} /> Fikir taslakları{" "}
                    <span>{filteredDrafts.length}</span>
                  </h3>
                  {filteredDrafts.length ? (
                    filteredDrafts.map((d) => (
                      <article className="draft" key={d.id}>
                        <div>
                          <span>
                            {d.style} · {d.bpm} BPM · {d.duration} sn
                          </span>
                          <p>{d.prompt}</p>
                          <small>{d.instruments.join(" · ")}</small>
                        </div>
                        <button
                          className="text-button"
                          onClick={() => loadDraft(d)}
                        >
                          Düzenle <ArrowUpRight size={14} />
                        </button>
                        <button
                          className="icon-button"
                          aria-label="Taslağı sil"
                          onClick={() => {
                            setDrafts((old) =>
                              old.filter((x) => x.id !== d.id),
                            );
                            notify("Taslak silindi.");
                          }}
                        >
                          <X size={15} />
                        </button>
                      </article>
                    ))
                  ) : (
                    <div className="draft-empty">
                      <p>
                        {query
                          ? "Bu aramayla eşleşen taslak yok."
                          : "İlk fikrine burada yer ayırdık."}
                      </p>
                      <button
                        className="text-button"
                        onClick={() => setView("studio")}
                      >
                        Müziğini tarif et <ArrowRight size={15} />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </section>
          )}
          <footer className="page-footer">
            <span>ALTUN STUDIO</span>
            <p>Birlikte yeni bir ses arıyoruz.</p>
            <span>Erken erişim · 2026</span>
          </footer>
        </main>
      </div>

      <div className="player" aria-label="Ses oynatıcı">
        <div className="player-track">
          <Cover kind={current.cover} small />
          <div>
            <strong>{current.title}</strong>
            <span>Hazır örnek · 10 saniye</span>
          </div>
          <button
            className={`icon-button like ${tracks.find((t) => t.id === current.id)?.liked ? "liked" : ""}`}
            aria-label="Çalan kaydı beğen"
            aria-pressed={
              tracks.find((t) => t.id === current.id)?.liked || false
            }
            onClick={() => like(current.id)}
          >
            <Heart
              size={16}
              fill={
                tracks.find((t) => t.id === current.id)?.liked
                  ? "currentColor"
                  : "none"
              }
            />
          </button>
        </div>
        <div className="player-center">
          <button
            className="player-play"
            onClick={() => play(current)}
            aria-label={playing ? "Duraklat" : "Oynat"}
          >
            {playing ? (
              <Pause size={17} fill="currentColor" />
            ) : (
              <Play size={17} fill="currentColor" />
            )}
          </button>
          <span className="time">{formatTime(position)}</span>
          <div className="scrubber">
            <Wave active={playing} large />
            <input
              type="range"
              min="0"
              max={audioDuration || 10}
              step="0.05"
              value={position}
              aria-label="Ses içinde ilerle"
              onChange={(e) => {
                if (audio.current && Number.isFinite(audio.current.duration)) {
                  audio.current.currentTime = Number(e.target.value);
                  setPosition(Number(e.target.value));
                }
              }}
            />
          </div>
          <span className="time">{formatTime(audioDuration)}</span>
        </div>
        <div className="player-tools">
          <button
            className="icon-button"
            aria-label={volume ? "Sesi kapat" : "Sesi aç"}
            onClick={() => setVolume(volume ? 0 : 0.75)}
          >
            {volume ? <Volume2 size={17} /> : <VolumeX size={17} />}
          </button>
          <input
            aria-label="Ses seviyesi"
            type="range"
            min="0"
            max="1"
            step=".05"
            value={volume}
            onChange={(e) => setVolume(Number(e.target.value))}
          />
          <span className="player-divider" />
          <a
            className="icon-button"
            href={current.src}
            download
            aria-label="Çalan kaydı indir"
          >
            <ArrowDownToLine size={18} />
          </a>
        </div>
        <audio
          ref={audio}
          preload="metadata"
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => setPlaying(false)}
          onTimeUpdate={() => setPosition(audio.current?.currentTime || 0)}
          onLoadedMetadata={() =>
            setAudioDuration(audio.current?.duration || 10)
          }
          onError={() => notify("Ses dosyası yüklenemedi. Lütfen tekrar dene.")}
        />
      </div>
      {toast && (
        <div className="toast" role="status">
          <Check size={17} />
          <span>{toast}</span>
          <button
            className="icon-button"
            aria-label="Bildirimi kapat"
            onClick={() => setToast("")}
          >
            <X size={15} />
          </button>
        </div>
      )}
      <dialog ref={help} className="help-dialog">
        <button
          className="dialog-close icon-button"
          aria-label="Yardımı kapat"
          onClick={() => help.current?.close()}
        >
          <X size={21} />
        </button>
        <span className="brand-symbol">
          <AudioLines size={26} />
        </span>
        <h2>İlk notaya hoş geldin.</h2>
        <p>
          Altun Studio’nun bu sürümü, gelecekteki müzik üretim deneyiminin
          etkileşimli önizlemesidir.
        </p>
        <ol>
          <li>
            <strong>Fikrini şekillendir.</strong> Müziğini tarif et, tarzını ve
            enstrümanlarını seç.
          </li>
          <li>
            <strong>Taslağını sakla.</strong> Kaydettiklerin bu tarayıcıdaki
            kütüphanende kalır.
          </li>
          <li>
            <strong>İlk sesleri dinle.</strong> İki gerçek deneme kaydını
            karşılaştır, beğen veya indir.
          </li>
        </ol>
        <div className="dialog-note">
          Yeni müzik üretimi, hesap açma ve bulut eşitleme bu sürümde
          bulunmuyor. Örnekler, seçtiğin ayarlardan bağımsız 10 saniyelik
          kayıtlardır.
        </div>
        <button
          className="primary-button"
          onClick={() => help.current?.close()}
        >
          Stüdyoya dön <ArrowRight size={17} />
        </button>
      </dialog>
    </div>
  );
}
