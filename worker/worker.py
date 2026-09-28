"""Outbound-only pilot worker. Requires the tested local ACE-Step runtime and a server key."""
import importlib.util
import os
from pathlib import Path
import tempfile
import threading
import uuid

import requests

BASE = Path(__file__).resolve().parent
STYLES = {"Halay": "Anatolian halay folk dance", "Ankara havası": "Ankara Turkish folk dance", "Roman havası": "Turkish Roman dance", "Çiftetelli": "Turkish ciftetelli", "Serbest": "Turkish instrumental music"}
INSTRUMENTS = {"Bağlama": "baglama saz", "Darbuka": "darbuka", "Davul": "davul bass drum", "Klarnet": "clarinet", "Keman": "violin", "Zurna": "zurna"}


def validate(job):
    for field in ("id", "user_id"):
        if str(uuid.UUID(job[field])) != job[field]:
            raise ValueError("Invalid identifier")
    if not isinstance(job["prompt"], str) or not 1 <= len(job["prompt"].strip()) <= 1000:
        raise ValueError("Invalid prompt")
    if job["style"] not in STYLES or job["duration_seconds"] not in (15, 30):
        raise ValueError("Invalid music settings")
    if type(job["bpm"]) is not int or not 60 <= job["bpm"] <= 180:
        raise ValueError("Invalid tempo")
    if not isinstance(job["instruments"], list) or len(job["instruments"]) > 6 or any(i not in INSTRUMENTS for i in job["instruments"]):
        raise ValueError("Invalid instruments")
    if type(job["attempts"]) is not int or job["attempts"] < 1:
        raise ValueError("Invalid attempt")


class Worker:
    def __init__(self, url, key):
        self.url = url.rstrip("/")
        self.headers = {"apikey": key}
        if key.startswith("eyJ"):
            self.headers["Authorization"] = "Bearer " + key
        self.worker_id = str(uuid.uuid4())
        self.job = None
        self.lock = threading.Lock()
        self.stop = threading.Event()
        self.lost = threading.Event()

    def rpc(self, name, payload):
        result = requests.post(self.url + "/rest/v1/rpc/" + name, headers=self.headers, json=payload, timeout=25)
        result.raise_for_status()
        return result.json()

    def heartbeat(self):
        while not self.stop.is_set():
            with self.lock:
                job = self.job
            payload = {"p_worker": self.worker_id}
            if job:
                payload.update(p_job=job["id"], p_attempt=job["attempts"])
            try:
                if not self.rpc("worker_tick", payload) and job:
                    with self.lock:
                        if self.job is job:
                            self.lost.set()
            except requests.RequestException:
                # Database fencing decides whether a lease is still valid on completion.
                print("Connection interrupted; heartbeat will retry.", flush=True)
            self.stop.wait(15)

    def finish(self, job, success):
        return self.rpc("finish_generation", {"p_worker": self.worker_id, "p_job": job["id"], "p_attempt": job["attempts"], "p_success": success})

    def run(self, handler):
        from acestep.inference import GenerationParams, GenerationConfig, generate_music
        self.rpc("worker_tick", {"p_worker": self.worker_id})
        heartbeat = threading.Thread(target=self.heartbeat, daemon=True)
        heartbeat.start()
        print("Altun Studio ready. This machine uses CPU. Ctrl+C stops the worker.", flush=True)
        try:
            while not self.stop.is_set():
                try:
                    jobs = self.rpc("claim_generation", {"p_worker": self.worker_id})
                    if not jobs:
                        self.stop.wait(5)
                        continue
                    job = jobs[0]
                    with self.lock:
                        self.lost.clear()
                        self.job = job
                    try:
                        validate(job)
                        caption = f"{STYLES[job['style']]}. Instruments: {', '.join(INSTRUMENTS[i] for i in job['instruments'])}. Instrumental, no vocals. {job['prompt']}"
                        params = GenerationParams(caption=caption, lyrics="[Instrumental]", instrumental=True,
                            bpm=job["bpm"], duration=job["duration_seconds"], inference_steps=8,
                            seed=int.from_bytes(os.urandom(4), "big"), thinking=False,
                            use_cot_metas=False, use_cot_caption=False, use_cot_language=False)
                        config = GenerationConfig(batch_size=1, use_random_seed=False, audio_format="wav")
                        with tempfile.TemporaryDirectory(prefix="altun-audio-") as directory:
                            result = generate_music(handler, None, params, config, save_dir=directory)
                            if not result.success or not result.audios:
                                raise RuntimeError("Generation failed")
                            audio = Path(result.audios[0]["path"]).resolve()
                            if not audio.is_relative_to(Path(directory).resolve()) or audio.stat().st_size > 52428800:
                                raise ValueError("Invalid output")
                            if self.lost.is_set():
                                raise RuntimeError("Lease lost")
                            # Refresh/check fencing before publishing. An expired worker cannot complete a job.
                            if not self.rpc("worker_tick", {"p_worker": self.worker_id, "p_job": job["id"], "p_attempt": job["attempts"]}):
                                raise RuntimeError("Lease lost")
                            path = f"{job['user_id']}/{job['id']}/audio.wav"
                            with audio.open("rb") as stream:
                                response = requests.post(self.url + "/storage/v1/object/generated-audio/" + path,
                                    headers={**self.headers, "Content-Type": "audio/wav", "x-upsert": "false"}, data=stream, timeout=90)
                            response.raise_for_status()
                            if not self.finish(job, True):
                                raise RuntimeError("Completion rejected")
                        print("Generation completed.", flush=True)
                    except Exception as error:
                        # Never print request headers, tokens, prompts or raw server response bodies.
                        print("Generation failed: " + type(error).__name__, flush=True)
                        try:
                            self.finish(job, False)
                        except requests.RequestException:
                            print("Failure status could not be delivered; lease will expire.", flush=True)
                    finally:
                        with self.lock:
                            self.job = None
                except requests.RequestException:
                    print("Queue unavailable; retrying in 15 seconds.", flush=True)
                    self.stop.wait(15)
        finally:
            self.stop.set()
            heartbeat.join(timeout=30)


def main():
    config = BASE / ".env.local"
    if config.exists():
        for line in config.read_text(encoding="utf-8-sig").splitlines():
            if line.strip() and not line.lstrip().startswith("#") and "=" in line:
                name, value = line.split("=", 1)
                os.environ.setdefault(name.strip(), value.strip().strip('\"').strip("'"))
    url = os.environ.get("SUPABASE_URL", "")
    key = os.environ.get("SUPABASE_SECRET_KEY", "")
    runtime = Path(os.environ.get("ACESTEP_RUNTIME", "missing"))
    if not url.startswith("https://") or not key.startswith(("sb_secret_", "eyJ")) or not runtime.is_file():
        raise SystemExit("Configure worker/.env.local with Supabase URL, server key and ACESTEP_RUNTIME first.")
    worker = Worker(url, key)
    # Check migration/key before spending time loading the model. Do not announce availability yet.
    check = requests.get(url.rstrip("/") + "/rest/v1/studio_worker?select=id&limit=0", headers=worker.headers, timeout=20)
    if not check.ok:
        raise SystemExit("Worker database access failed. Check the second migration and server key.")
    spec = importlib.util.spec_from_file_location("altun_local_runtime", runtime)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    handler = module.initialize_handler()
    worker.run(handler)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("Worker stopped.")
