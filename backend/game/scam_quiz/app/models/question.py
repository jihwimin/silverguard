"""Question model for phishing quiz."""

import enum
from typing import Optional
from sqlmodel import Field, SQLModel


class QuestionType(str, enum.Enum):
    SMS = "sms"
    EMAIL = "email"
    CALL_TRANSCRIPT = "call_transcript"


class Question(SQLModel, table=True):
    """Phishing quiz question."""

    __tablename__ = "questions"

    id: Optional[int] = Field(default=None, primary_key=True)
    content: str = Field(index=False)
    type: QuestionType = Field(index=True)
    is_phishing: bool = Field(index=True)
    explanation: str = Field(index=False)
    content_hash: Optional[str] = Field(default=None, unique=True, index=True)
