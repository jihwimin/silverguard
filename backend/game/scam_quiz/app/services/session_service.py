"""Session creation and lookup."""

from datetime import datetime
from typing import Optional

from sqlmodel import Session as DBSession, select

from app.models.session import Session
from app.models.db import get_engine


class SessionService:
    def __init__(self):
        self._engine = get_engine()

    def start_session(self, user_id: str) -> Session:
        """Create a new quiz session for the given user."""
        session = Session(user_id=user_id)
        with DBSession(self._engine) as db:
            db.add(session)
            db.commit()
            db.refresh(session)
            return session

    def get_latest_session(self, user_id: str) -> Optional[Session]:
        """Get the most recent *active* session for a user (not ended)."""
        with DBSession(self._engine) as db:
            stmt = (
                select(Session)
                .where(Session.user_id == user_id, Session.ended_at.is_(None))
                .order_by(Session.started_at.desc())
                .limit(1)
            )
            return db.exec(stmt).first()

    def get_session_by_id(self, session_id: int, user_id: Optional[str] = None) -> Optional[Session]:
        """Get a session by id, optionally scoped to user_id."""
        with DBSession(self._engine) as db:
            session = db.get(Session, session_id)
            if session is None:
                return None
            if user_id is not None and session.user_id != user_id:
                return None
            return session

    def end_session(self, session_id: int) -> Optional[Session]:
        """Mark a session as ended and return it, or None if not found."""
        with DBSession(self._engine) as db:
            session = db.get(Session, session_id)
            if session is None:
                return None
            if session.ended_at is None:
                session.ended_at = datetime.utcnow()
                db.add(session)
                db.commit()
                db.refresh(session)
            return session


session_service = SessionService()
