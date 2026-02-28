"""Quiz next question and answer endpoints (practice mode)."""

from typing import Optional, Literal

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from app.services.quiz_service import (
    InvalidAnswerRequestError,
    ServeTokenConflictError,
    SessionEndedError,
    quiz_service,
)

router = APIRouter()


class QuestionPayload(BaseModel):
    id: int
    content: str
    type: Literal["sms", "email", "call_transcript"]

class TTSConfig(BaseModel):
    enabled: bool
    voice: str = "default"
    text: str
    interruptible: bool = True
    autoplay: bool = False


class UIConfig(BaseModel):
    template: Literal["sms", "email", "call"]
    tts: TTSConfig


class CoachConfig(BaseModel):
    id: str = "coach"
    name: str = "Coach"
    tone: Literal["encouraging", "supportive"] = "encouraging"


class NextQuestionResponse(BaseModel):
    session_id: int
    question: QuestionPayload
    serve_token: str
    ui: UIConfig


class AnswerRequest(BaseModel):
    session_id: int
    question_id: int
    user_answered_phishing: bool
    serve_token: str


class AnswerResponse(BaseModel):
    correct: bool
    explanation: str
    question_id: int
    coach: CoachConfig


@router.get("/next", response_model=NextQuestionResponse)
def get_next_question(
    user_id: str = Query(..., description="User ID"),
    session_id: Optional[int] = Query(None, description="Optional session ID (uses latest if omitted)"),
):
    """Get the next practice question for the user.

    Frontend should store the returned `serve_token` alongside the question and
    include it once in the subsequent /answer call to prevent double-submit.
    """
    result = quiz_service.get_next_question(user_id=user_id, session_id=session_id)
    if result is None:
        raise HTTPException(
            status_code=404,
            detail="No active session for this user. Start a new session with POST /v1/session/start.",
        )

    qtype = result["question"]["type"]  # "sms" | "email" | "call_transcript"
    template = "call" if qtype == "call_transcript" else qtype

    tts_enabled = template == "call"
    tts_text = result["question"]["content"]  # what the frontend should read aloud

    result["ui"] = {
        "template": template,
        "tts": {
            "enabled": tts_enabled,
            "voice": "default",
            "text": tts_text,
            "interruptible": True,
            "autoplay": tts_enabled,  # ✅ autoplay for call transcripts
        },
    }

    return result


@router.post("/answer", response_model=AnswerResponse)
def submit_answer(body: AnswerRequest):
    """Submit an answer for a served question (practice mode).

    Frontend: after a successful 200 response (or a 409), lock the UI for this
    question and do not re-use the same `serve_token` in future requests.
    """
    try:
        result = quiz_service.submit_answer(
            session_id=body.session_id,
            question_id=body.question_id,
            user_answered_phishing=body.user_answered_phishing,
            serve_token=body.serve_token,
        )
        tone = "encouraging" if result.get("correct") else "supportive"
        result["coach"] = {"id": "coach", "name": "Coach", "tone": tone}
        return result
    except SessionEndedError as exc:
        raise HTTPException(status_code=409, detail=str(exc))
    except ServeTokenConflictError as exc:
        raise HTTPException(status_code=409, detail=str(exc))
    except InvalidAnswerRequestError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
