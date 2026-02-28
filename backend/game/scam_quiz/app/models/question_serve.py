"""QuestionServe: tracks individual served questions via tokens."""

from datetime import datetime
from typing import Optional

from sqlalchemy import UniqueConstraint
from sqlmodel import Field, SQLModel


class QuestionServe(SQLModel, table=True):
    """A specific served question instance, identified by a one-time token."""

    __tablename__ = "question_serves"
    __table_args__ = (UniqueConstraint("serve_token"),)

    id: Optional[int] = Field(default=None, primary_key=True)
    session_id: int = Field(foreign_key="sessions.id", index=True)
    question_id: int = Field(foreign_key="questions.id", index=True)
    serve_token: str = Field(index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    used_at: Optional[datetime] = Field(default=None, index=True)

