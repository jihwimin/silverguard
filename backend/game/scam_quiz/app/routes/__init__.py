"""API route modules."""

from fastapi import APIRouter

from app.routes import health, session, quiz

# Health at root (no /v1)
health_router = health.router

api_router = APIRouter(prefix="/v1")
api_router.include_router(session.router, prefix="/session", tags=["session"])
api_router.include_router(quiz.router, prefix="/quiz", tags=["quiz"])
