"""
Authenticatie middleware voor de Retroductus Mining Engine.

Ondersteunt twee modi:
1. Service-to-service: Bearer MINING_ENGINE_SECRET (Next.js proxy → engine)
2. Directe JWT: Bearer <Supabase JWT> (voor toekomstige directe API-toegang)

Gebruik:
    from auth import verify_token, get_current_user_id

    @router.post("/endpoint")
    async def endpoint(_token: str = Security(verify_token)):
        ...
"""

import os
import logging

import jwt
from fastapi import HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

logger = logging.getLogger(__name__)

security = HTTPBearer()

MINING_ENGINE_SECRET = os.getenv("MINING_ENGINE_SECRET", "")
SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET", "")


def verify_token(
    credentials: HTTPAuthorizationCredentials = Security(security),
) -> str:
    """
    Valideert het Bearer token.

    Accepteert:
    - MINING_ENGINE_SECRET: service-to-service token (Next.js proxy)
    - Supabase JWT: geldig ondertekend JWT (indien SUPABASE_JWT_SECRET is geconfigureerd)

    Geeft de user_id terug (sub-claim) of '__service__' bij service-token.
    Gooit HTTPException 401 bij ongeldig token.
    """
    token = credentials.credentials

    # Service-to-service authenticatie
    if MINING_ENGINE_SECRET and token == MINING_ENGINE_SECRET:
        return "__service__"

    # Supabase JWT authenticatie
    if SUPABASE_JWT_SECRET:
        try:
            payload = jwt.decode(
                token,
                SUPABASE_JWT_SECRET,
                algorithms=["HS256"],
                audience="authenticated",
            )
            user_id: str = payload.get("sub", "")
            if not user_id:
                raise HTTPException(status_code=401, detail="Ongeldig token: ontbrekende sub-claim")
            return user_id
        except jwt.ExpiredSignatureError:
            logger.warning("Verlopen JWT ontvangen")
            raise HTTPException(status_code=401, detail="Token verlopen")
        except jwt.InvalidTokenError as exc:
            logger.warning("Ongeldig JWT: %s", exc)
            raise HTTPException(status_code=401, detail="Ongeldig token")

    # Geen geldige authenticatiemethode beschikbaar
    logger.error("Authenticatie mislukt: geen geldig service-secret of JWT-secret geconfigureerd")
    raise HTTPException(status_code=401, detail="Niet geautoriseerd")


def get_current_user_id(
    credentials: HTTPAuthorizationCredentials = Security(security),
) -> str:
    """Shorthand: geeft de geverifieerde user_id terug."""
    return verify_token(credentials)
