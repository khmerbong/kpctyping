"""Auth route group target for the next Blueprint migration.

Current live auth handlers remain registered in app.py to avoid deployment regressions.
Shared auth/security helpers have been separated into config.py and api_response.py first.
"""
