"""Exercise upload/completion boundaries without loading a model or using credentials."""
import copy
from pathlib import Path
import sys
import types
import unittest
from unittest.mock import patch, Mock

from worker import Worker

JOB = {"id": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", "user_id": "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
       "prompt": "Instrumental halay", "style": "Halay", "instruments": ["Bağlama"],
       "bpm": 100, "duration_seconds": 15, "attempts": 1}


class QueueWorker(Worker):
    def __init__(self, job, lease=True):
        super().__init__("https://example.invalid", "sb_secret_test")
        self.pending = job
        self.lease = lease
        self.finished = []

    def heartbeat(self):
        pass

    def rpc(self, name, payload):
        if name == "claim_generation":
            if self.pending:
                job, self.pending = self.pending, None
                return [job]
            self.stop.set()
            return []
        if name == "worker_tick":
            return self.lease if payload.get("p_job") else True
        if name == "finish_generation":
            self.finished.append(payload)
            return self.lease
        raise AssertionError(name)


class WorkerTests(unittest.TestCase):
    def exercise(self, job=None, lease=True, success=True):
        worker = QueueWorker(copy.deepcopy(job or JOB), lease)
        inference = types.ModuleType("acestep.inference")
        inference.GenerationParams = lambda **kwargs: kwargs
        inference.GenerationConfig = lambda **kwargs: kwargs

        def generate(*args, save_dir):
            path = Path(save_dir) / "result.wav"
            path.write_bytes(b"test audio")
            return types.SimpleNamespace(success=success, audios=[{"path": str(path)}])

        inference.generate_music = Mock(side_effect=generate)
        with patch.dict(sys.modules, {"acestep.inference": inference}), patch("worker.requests.post") as upload:
            worker.run(None)
            return worker, inference.generate_music.call_count, upload.call_count

    def test_completed_output_uploaded_before_success(self):
        worker, calls, uploads = self.exercise()
        self.assertEqual((calls, uploads), (1, 1))
        self.assertEqual([item["p_success"] for item in worker.finished], [True])

    def test_expired_lease_never_uploads_or_completes(self):
        worker, calls, uploads = self.exercise(lease=False)
        self.assertEqual((calls, uploads), (1, 0))
        self.assertEqual([item["p_success"] for item in worker.finished], [False])

    def test_model_failure_never_uploads(self):
        worker, calls, uploads = self.exercise(success=False)
        self.assertEqual((calls, uploads), (1, 0))
        self.assertFalse(worker.finished[0]["p_success"])

    def test_invalid_storage_owner_never_reaches_model(self):
        job = {**JOB, "user_id": "../../other-user"}
        worker, calls, uploads = self.exercise(job=job)
        self.assertEqual((calls, uploads), (0, 0))
        self.assertFalse(worker.finished[0]["p_success"])


if __name__ == "__main__":
    unittest.main()
