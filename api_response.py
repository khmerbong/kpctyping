"""Small response helpers used by app.py and future Blueprint route modules."""
from flask import jsonify


def api_success(**payload):
    payload.setdefault("ok", True)
    payload.setdefault("success", True)
    return jsonify(payload)


def api_error(message, status=400, **payload):
    payload.setdefault("ok", False)
    payload.setdefault("success", False)
    payload.setdefault("error", message)
    payload.setdefault("message", message)
    return jsonify(payload), status
