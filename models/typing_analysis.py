"""Phase 4 AI Coach helpers for offline analysis and future server-side expansion."""
from __future__ import annotations
from dataclasses import dataclass
from typing import Iterable, Dict, List

@dataclass
class KeyEvent:
    key: str
    correct: bool = True
    time_ms: int = 0


def summarize_key_events(events: Iterable[KeyEvent]) -> Dict[str, Dict[str, int]]:
    stats: Dict[str, Dict[str, int]] = {}
    for ev in events:
        key = (ev.key or "?")[:8]
        row = stats.setdefault(key, {"correct": 0, "wrong": 0, "slow": 0, "total_time_ms": 0})
        row["correct" if ev.correct else "wrong"] += 1
        row["slow"] += 1 if ev.time_ms >= 900 else 0
        row["total_time_ms"] += max(0, int(ev.time_ms or 0))
    return stats


def weak_key_order(stats: Dict[str, Dict[str, int]], limit: int = 8) -> List[str]:
    def risk(item):
        key, row = item
        attempts = max(1, row.get("correct", 0) + row.get("wrong", 0))
        accuracy = row.get("correct", 0) / attempts * 100
        return (row.get("wrong", 0) * 3) + (row.get("slow", 0) * 2) + max(0, 90 - accuracy)
    return [key for key, _ in sorted(stats.items(), key=risk, reverse=True)[:limit]]
