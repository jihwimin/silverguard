"""Per-session per-question answer counters for practice mode."""

from typing import Optional

from sqlalchemy import UniqueConstraint
from sqlmodel import Field, SQLModel


class AnswerCount(SQLModel, table=True):
    """Tracks how many times a question was answered in a given session."""

    __tablename__ = "answer_counts"
    __table_args__ = (UniqueConstraint("session_id", "question_id"),)

    id: Optional[int] = Field(default=None, primary_key=True)
    session_id: int = Field(foreign_key="sessions.id", index=True)
    question_id: int = Field(foreign_key="questions.id", index=True)
    count: int = Field(default=0)

