import importlib.util
import pathlib
import unittest

spec = importlib.util.spec_from_file_location("observer", pathlib.Path(__file__).with_name("check-worker-readiness.py"))
observer = importlib.util.module_from_spec(spec)
spec.loader.exec_module(observer)


class ReadinessTests(unittest.TestCase):
    def test_healthy(self):
        self.assertTrue(observer.validate_readiness(200, {"status": "ready", "checks": dict.fromkeys(observer.REQUIRED, True)}))

    def test_each_missing_or_failed_heartbeat(self):
        for key in observer.REQUIRED:
            for value in (False, None, "true", 1):
                with self.subTest(key=key, value=value):
                    checks = dict.fromkeys(observer.REQUIRED, True)
                    checks[key] = value
                    self.assertFalse(observer.validate_readiness(200, {"status": "ready", "checks": checks}))
            checks = dict.fromkeys(observer.REQUIRED, True)
            del checks[key]
            self.assertFalse(observer.validate_readiness(200, {"status": "ready", "checks": checks}))

    def test_invalid_or_degraded(self):
        for status, payload in ((503, {}), (401, {}), (200, []), (200, {"status": "ready"}), (200, {"status": "degraded", "checks": dict.fromkeys(observer.REQUIRED, True)})):
            self.assertFalse(observer.validate_readiness(status, payload))

    def test_network_failure(self):
        def offline(*args, **kwargs):
            raise OSError("sensitive exception must not be logged")
        self.assertFalse(observer.observe("test-fixture", offline))

    def test_missing_secret_does_not_send(self):
        self.assertFalse(observer.observe("", lambda *a, **k: self.fail("network called")))


if __name__ == "__main__":
    unittest.main()
