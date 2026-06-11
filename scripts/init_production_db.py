import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
"""Initialize KPCTyping database tables for local SQLite or production PostgreSQL."""
from app import ensure_user_tables

if __name__ == "__main__":
    ensure_user_tables()
    print("KPCTyping database tables initialized successfully.")
