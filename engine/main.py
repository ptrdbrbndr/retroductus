import logging
import time

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from dotenv import load_dotenv

from routers import analysis, logs, connectors, insights, conformance

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s — %(message)s",
    datefmt="%Y-%m-%dT%H:%M:%S",
)
logger = logging.getLogger(__name__)

app = FastAPI(title="Retroductus Mining Engine", version="0.1.0")


@app.middleware("http")
async def log_requests(request: Request, call_next):
    start = time.perf_counter()
    response = await call_next(request)
    duration_ms = (time.perf_counter() - start) * 1000
    logger.info(
        "%s %s → %d (%.0fms)",
        request.method,
        request.url.path,
        response.status_code,
        duration_ms,
    )
    return response


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.error("Onverwachte fout op %s: %s", request.url.path, exc, exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Interne serverfout"},
    )


app.include_router(logs.router, tags=["logs"])
app.include_router(analysis.router, prefix="/analysis", tags=["analysis"])
app.include_router(connectors.router, prefix="/connectors", tags=["connectors"])
app.include_router(insights.router, prefix="/insights", tags=["insights"])
app.include_router(conformance.router, prefix="/conformance", tags=["conformance"])


@app.get("/health")
def health():
    return {"status": "ok"}
