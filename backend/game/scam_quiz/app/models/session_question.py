"""SessionQuestion mapping table: locks questions to a session."""

from typing import Optional

from sqlmodel import Field, SQLModel
from sqlalchemy import UniqueConstraint


class SessionQuestion(SQLModel, table=True):
    """A question selected for a session, with fixed randomized order."""

    __tablename__ = "session_questions"
    __table_args__ = (UniqueConstraint("session_id", "question_id"),)

    id: Optional[int] = Field(default=None, primary_key=True)
    session_id: int = Field(foreign_key="sessions.id", index=True)
    question_id: int = Field(foreign_key="questions.id", index=True)
    order_index: int = Field(index=True)

