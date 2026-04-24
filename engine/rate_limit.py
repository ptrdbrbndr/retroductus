"""
Eenvoudige in-memory rate limiter voor de Mining Engine.

Gebruik:
    from rate_limit import check_rate_limit

    check_rate_limit(user_id)  # gooit HTTPException 429 als limiet bereikt
"""

import time
import logging
from collections import defaultdict

from fastapi import HTTPException

logger = logging.getLogger(__name__)

# {user_id: [timestamp, timestamp, ...]}
_request_timestamps: dict[str, list[float]] = defaultdict(list)

# Limieten per plan
RATE_LIMITS: dict[str, dict[str, int]] = {
    "free":       {"max_requests": 3,  "window_seconds": 60},
    "starter":    {"max_requests": 10, "window_seconds": 60},
    "pro":        {"max_requests": 30, "window_seconds": 60},
    "enterprise": {"max_requests": 60, "window_seconds": 60},
    "__service__": {"max_requests": 1000, "window_seconds": 60},  # Next.js proxy
}
DEFAULT_LIMIT = RATE_LIMITS["free"]


def check_rate_limit(
    user_id: str,
    plan: str = "free",
) -> None:
    """
    Controleert of de gebruiker de rate limit heeft overschreden.
    Gooit HTTPException 429 als de limiet bereikt is.
    """
    limit = RATE_LIMITS.get(plan, DEFAULT_LIMIT)
    max_requests = limit["max_requests"]
    window = limit["window_seconds"]

    now = time.monotonic()
    timestamps = _request_timestamps[user_id]

    # Verwijder verlopen timestamps
    timestamps = [t for t in timestamps if now - t < window]
    _request_timestamps[user_id] = timestamps

    if len(timestamps) >= max_requests:
        logger.warning("Rate limit bereikt voor gebruiker %s (plan: %s)", user_id, plan)
        raise HTTPException(
            status_code=429,
            detail=f"Te veel analyse-verzoeken. Wacht even en probeer opnieuw.",
        )

    timestamps.append(now)
    _request_timestamps[user_id] = timestamps
