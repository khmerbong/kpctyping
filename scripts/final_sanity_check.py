"""KPCTyping final sanity check.
Run after installing requirements: python scripts/final_sanity_check.py
"""
from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REQUIRED_FILES = [
    "app.py",
    "templates/base.html",
    "templates/typing_test.html",
    "templates/ai_coach.html",
    "templates/friends.html",
    "templates/tournaments.html",
    "offline.html",
    "service-worker.js",
    "static/manifest.json",
    "static/css/final_release.css",
    "static/js/final_release.js",
]
ROUTES_TO_TEST = [
    "/", "/typing-test", "/leaderboard", "/ai-coach", "/friends",
    "/tournaments", "/mobile-app", "/offline.html", "/api/health",
    "/api/pwa/status", "/api/security/status",
]

def check_files() -> list[str]:
    missing = [p for p in REQUIRED_FILES if not (ROOT / p).exists()]
    return missing

def check_routes() -> list[str]:
    sys.path.insert(0, str(ROOT))
    import app as kpc_app  # type: ignore
    client = kpc_app.app.test_client()
    failures: list[str] = []
    for route in ROUTES_TO_TEST:
        resp = client.get(route)
        if resp.status_code >= 500:
            failures.append(f"{route} -> {resp.status_code}")
    return failures

def main() -> int:
    missing = check_files()
    if missing:
        print("Missing files:")
        for item in missing:
            print(f" - {item}")
        return 1
    try:
        failures = check_routes()
    except Exception as exc:
        print(f"Route check could not run: {exc}")
        return 2
    if failures:
        print("Route failures:")
        for item in failures:
            print(f" - {item}")
        return 1
    print("Final sanity check passed.")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
