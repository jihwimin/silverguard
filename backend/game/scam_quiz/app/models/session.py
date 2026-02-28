"""Quiz session model."""

from datetime import datetime
from typing import Optional
from sqlmodel import Field, SQLModel


class Session(SQLModel, table=True):
    """User quiz session."""

    __tablename__ = "sessions"

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: str = Field(index=True)
    started_at: datetime = Field(default_factory=datetime.utcnow)
    ended_at: Optional[datetime] = Field(default=None, index=True)
