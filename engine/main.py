from fastapi import FastAPI, Security, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
import os

from routers import analysis

load_dotenv()

MINING_ENGINE_SECRET = os.getenv("MINING_ENGINE_SECRET", "")

app = FastAPI(title="Retroductus Mining Engine", version="0.1.0")
security = HTTPBearer()


def verify_token(credentials: HTTPAuthorizationCredentials = Security(security)):
    if not MINING_ENGINE_SECRET or credentials.credentials != MINING_ENGINE_SECRET:
        raise HTTPException(status_code=401, detail="Unauthorized")
    return credentials.credentials


app.include_router(analysis.router, prefix="/analysis", tags=["analysis"])


@app.get("/health")
def health():
    return {"status": "ok"}
