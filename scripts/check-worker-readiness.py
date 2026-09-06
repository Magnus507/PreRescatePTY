"""Read-only independent worker observer. Never print response bodies or credentials."""
import json
import os
import sys
import urllib.request

REQUIRED = ("notificationWorker", "commerceWorker", "expiryWorker")


def validate_readiness(status, payload):
    if status != 200 or not isinstance(payload, dict) or payload.get("status") != "ready":
        return False
    checks = payload.get("checks")
    return isinstance(checks, dict) and all(checks.get(key) is True for key in REQUIRED) and all(value is True for value in checks.values())


def observe(secret, opener=urllib.request.urlopen):
    if not secret:
        return False
    request = urllib.request.Request(
        "https://www.prerescatepty.com/api/health/ready",
        headers={"Authorization": "Bearer " + secret},
    )
    try:
        with opener(request, timeout=20) as response:
            raw = response.read(65537)
            if len(raw) > 65536:
                return False
            return validate_readiness(response.status, json.loads(raw))
    except (OSError, ValueError):
        return False


if __name__ == "__main__":
    healthy = observe(os.environ.get("CRON_SECRET", ""))
    print("Worker readiness: " + ("PASS" if healthy else "FAIL (missing heartbeat, degraded health, or request failure)"))
    sys.exit(0 if healthy else 1)
