"""Database engine and initialization."""

from pathlib import Path

from sqlalchemy import inspect, text
from sqlmodel import SQLModel, create_engine

DB_PATH = Path(__file__).resolve().parent.parent.parent / "phishing_quiz.db"
DATABASE_URL = f"sqlite:///{DB_PATH}"


def get_engine():
    """Return SQLite engine with connect_args for SQLite."""
    return create_engine(DATABASE_URL, connect_args={"check_same_thread": False})


def init_db(engine=None):
    """Create all tables. Call with engine or use default."""
    # Import models so SQLModel sees metadata
    from app.models.question import Question  # noqa: F401
    from app.models.session import Session  # noqa: F401
    from app.models.answer import Answer  # noqa: F401
    from app.models.session_question import SessionQuestion  # noqa: F401
    from app.models.answer_count import AnswerCount  # noqa: F401
    from app.models.question_serve import QuestionServe  # noqa: F401

    engine = engine or get_engine()
    SQLModel.metadata.create_all(engine)
    _ensure_session_ended_at_column(engine)
    return engine


def _ensure_session_ended_at_column(engine) -> None:
    """Add ended_at column to sessions table if missing (SQLite)."""
    insp = inspect(engine)
    if "sessions" not in insp.get_table_names():
        return
    cols = [c["name"] for c in insp.get_columns("sessions")]
    if "ended_at" in cols:
        return
    with engine.connect() as conn:
        conn.execute(text("ALTER TABLE sessions ADD COLUMN ended_at DATETIME"))
        conn.commit()
