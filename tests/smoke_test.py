"""Small pre-deploy smoke test for KPC Typing.
Run from the project root:
    python tests/smoke_test.py
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from app import app  # noqa: E402

PAGES = [
    "/",
    "/typing-test",
    "/training-mode",
    "/lessons",
    "/global-leaderboard",
    "/profile",
    "/analytics-pro",
]


def get_csrf(html: str) -> str:
    match = re.search(r'name="csrf-token"\s+content="([^"]+)"', html)
    if match:
        return match.group(1)
    match = re.search(r'csrf_token\(\)\s*}}', html)
    if match:
        raise RuntimeError("Unrendered CSRF token found")
    raise RuntimeError("CSRF token not found")


def main() -> None:
    app.config.update(TESTING=True)
    with app.test_client() as client:
        for route in PAGES:
            response = client.get(route)
            assert response.status_code < 500, f"{route} returned {response.status_code}"
            print(f"PASS page {route}: {response.status_code}")

        typing_page = client.get("/typing-test")
        csrf = get_csrf(typing_page.get_data(as_text=True))
        headers = {"X-CSRFToken": csrf, "Content-Type": "application/json"}

        score_payload = {
            "username": "Smoke Tester",
            "wpm": 42,
            "accuracy": 97,
            "errors": 1,
            "mode": "smoke",
            "duration": 60,
        }
        response = client.post("/api/submit-score", json=score_payload, headers=headers)
        assert response.status_code in (200, 201), f"submit-score failed: {response.status_code} {response.text}"
        print("PASS api /api/submit-score")

        response = client.get("/api/global-leaderboard")
        assert response.status_code == 200, f"global leaderboard failed: {response.status_code}"
        print("PASS api /api/global-leaderboard")

    print("All smoke tests passed.")


if __name__ == "__main__":
    main()
