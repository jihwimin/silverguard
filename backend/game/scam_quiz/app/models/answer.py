"""Answer model for quiz responses."""

from datetime import datetime
from typing import Optional
from sqlmodel import Field, SQLModel


class Answer(SQLModel, table=True):
    """User's answer to a quiz question."""

    __tablename__ = "answers"

    id: Optional[int] = Field(default=None, primary_key=True)
    session_id: int = Field(foreign_key="sessions.id", index=True)
    question_id: int = Field(foreign_key="questions.id", index=True)
    user_answered_phishing: bool = Field(index=False)
    correct: bool = Field(index=False)
    created_at: datetime = Field(default_factory=datetime.utcnow)
