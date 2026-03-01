"""Session start and end endpoints."""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.services.session_service import session_service

router = APIRouter()


class StartSessionRequest(BaseModel):
    user_id: str


@router.post("/start")
def start_session(body: StartSessionRequest):
    """Start a new quiz session for the given user."""
    session = session_service.start_session(user_id=body.user_id)
    return {
        "session_id": session.id,
        "user_id": session.user_id,
        "started_at": session.started_at.isoformat(),
    }


@router.post("/{session_id}/end")
def end_session(session_id: int):
    """End an existing session so the user can go back home."""
    session = session_service.end_session(session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found.")
    return {
        "session_id": session.id,
        "ended_at": session.ended_at.isoformat() if session.ended_at else None,
    }
