"""FastAPI application entrypoint."""

from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.models.db import init_db
from app.routes import health_router, api_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Create DB tables on startup."""
    init_db()
    yield


app = FastAPI(
    title="Phishing Quiz API",
    description="Backend for phishing awareness quiz (SMS, email, call transcript).",
    version="1.0.0",
    lifespan=lifespan,
)

app.include_router(health_router)
app.include_router(api_router)
