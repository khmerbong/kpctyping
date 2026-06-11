import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

"""Minimal production smoke test for KPCTyping."""
from app import app, ensure_user_tables

if __name__ == "__main__":
    ensure_user_tables()
    client = app.test_client()
    checks = [
        "/", "/login", "/register", "/api/health", "/deploy-status",
        "/api/pwa/status", "/leaderboard", "/typing-test"
    ]
    failed = []
    for path in checks:
        res = client.get(path)
        ok = res.status_code < 500
        print(f"{path:24} {res.status_code} {'PASS' if ok else 'FAIL'}")
        if not ok:
            failed.append((path, res.status_code))
    if failed:
        raise SystemExit(f"Smoke test failed: {failed}")
    print("Smoke test passed.")
