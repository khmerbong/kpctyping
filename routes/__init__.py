"""Blueprint package for the ongoing KPCTyping backend refactor.

The v38 full update safely extracts shared config/response helpers first. High-traffic
routes remain in app.py until every Blueprint group has full regression coverage.
"""
