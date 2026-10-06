"""Small per-process fixed-window limiter; use an edge limiter for multi-instance deploys."""

from __future__ import annotations

import threading
import time
from typing import Callable


class RateLimiter:
    def __init__(
        self,
        *,
        max_requests: int = 60,
        window_seconds: int = 60,
        max_keys: int = 10_000,
        clock: Callable[[], float] = time.monotonic,
    ) -> None:
        if max_requests < 1 or window_seconds < 1 or max_keys < 1:
            raise ValueError("rate limit values must be positive")
        self._max_requests = max_requests
        self._window_seconds = window_seconds
        self._max_keys = max_keys
        self._clock = clock
        self._windows: dict[str, tuple[int, int]] = {}
        self._lock = threading.Lock()

    def allow(self, key: str) -> tuple[bool, int]:
        now = self._clock()
        window = int(now // self._window_seconds)
        retry_after = max(1, int((window + 1) * self._window_seconds - now))
        with self._lock:
            prior_window, count = self._windows.get(key, (window, 0))
            if key not in self._windows and len(self._windows) >= self._max_keys:
                self._windows = {
                    entry_key: state
                    for entry_key, state in self._windows.items()
                    if state[0] >= window
                }
                if len(self._windows) >= self._max_keys:
                    return False, retry_after
            if prior_window != window:
                count = 0
            if count >= self._max_requests:
                self._windows[key] = (window, count)
                return False, retry_after
            self._windows[key] = (window, count + 1)
            return True, retry_after
