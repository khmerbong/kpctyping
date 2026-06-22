#!/usr/bin/env python3
"""Small deploy smoke test for KPCTyping.
Run after installing requirements: python scripts/deploy_smoke_test.py
"""
from __future__ import annotations

import importlib
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

REQUIRED_ROUTES = [
    "/",
    "/typing-test",
    "/lessons",
    "/training-mode",
    "/api/lessons",
    "/api/deploy/status",
]


def main() -> int:
    app_module = importlib.import_module("app")
    flask_app = app_module.app
    with flask_app.test_client() as client:
        failures: list[str] = []
        for route in REQUIRED_ROUTES:
            response = client.get(route)
            if response.status_code >= 500:
                failures.append(f"{route} returned {response.status_code}")
        if failures:
            print("SMOKE TEST FAILED")
            for failure in failures:
                print("-", failure)
            return 1
    print("SMOKE TEST PASSED")
    return 0


if __name__ == "__main__":
    sys.exit(main())
