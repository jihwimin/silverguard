"""Health check endpoint (no version prefix)."""

from fastapi import APIRouter

router = APIRouter()


@router.get("/health")
def health():
    """Liveness/readiness check."""
    return {"status": "ok"}
