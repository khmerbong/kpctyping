"""Simple deploy smoke test for KPCTyping.
Usage:
  python scripts/deploy_smoke_test.py http://127.0.0.1:5000
  python scripts/deploy_smoke_test.py https://your-app.onrender.com
"""
import sys, requests
base = (sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:5000").rstrip("/")
paths = [
    "/", "/training-mode", "/career", "/analytics-pro", "/multiplayer-race",
    "/global-leaderboard", "/friends", "/tournaments", "/champions",
    "/api/pwa/status", "/api/phase15/status", "/api/tournaments", "/api/champions",
]
failed = []
for path in paths:
    try:
        r = requests.get(base + path, timeout=12, allow_redirects=False)
        ok = r.status_code in (200, 302, 401)
        print(f"{path:28} {r.status_code} {'PASS' if ok else 'FAIL'}")
        if not ok:
            failed.append((path, r.status_code))
    except Exception as exc:
        print(f"{path:28} ERROR {exc}")
        failed.append((path, 'ERROR'))
if failed:
    print("\nFAILED:", failed)
    sys.exit(1)
print("\nSmoke test PASS")
