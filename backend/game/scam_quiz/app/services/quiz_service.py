"""Quiz flow: next question and submitting answers (practice mode)."""

import random
import time
import uuid
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple

from sqlalchemy import delete, text
from sqlmodel import Session as DBSession, select

from app.models.answer import Answer
from app.models.answer_count import AnswerCount
from app.models.db import get_engine
from app.models.question import Question
from app.models.question_serve import QuestionServe
from app.services.session_service import session_service


class SessionEndedError(Exception):
    """Raised when trying to use an ended session."""


class ServeTokenConflictError(Exception):
    """Raised when a serve_token is missing, invalid, or already used."""


class InvalidAnswerRequestError(Exception):
    """Raised when the answer payload references invalid session/question data."""


class QuizService:
    """Practice-mode quiz logic with per-session balancing and serve tokens."""

    # session_id -> (expires_at_ts, candidate_question_ids)
    _candidate_cache: Dict[int, Tuple[float, List[int]]] = {}
    _cache_ttl_seconds: float = 3.0

    def __init__(self):
        self._engine = get_engine()

    def _invalidate_cache_for_session(self, session_id: int) -> None:
        """Clear cached candidates for a session (called after answers)."""
        self._candidate_cache.pop(session_id, None)

    def get_next_question(self, user_id: str, session_id: Optional[int] = None) -> Optional[dict]:
        """Return the next practice question for the user's active session.

        Questions do not repeat within a session until the full pool has been used;
        after that, they are reshuffled and can appear again.
        """
        session = (
            session_service.get_session_by_id(session_id, user_id)
            if session_id is not None
            else session_service.get_latest_session(user_id)
        )
        if session is None or session.ended_at is not None:
            return None

        with DBSession(self._engine) as db:
            # Idempotency: if there is a very recent, unused serve for this session,
            # return the same question + token instead of creating a new one.
            now_dt = datetime.utcnow()
            recent_serve = db.exec(
                select(QuestionServe)
                .where(
                    QuestionServe.session_id == session.id,
                    QuestionServe.used_at.is_(None),
                    QuestionServe.created_at >= now_dt - timedelta(seconds=60),
                )
                .order_by(QuestionServe.created_at.desc())
            ).first()
            if recent_serve is not None:
                question = db.get(Question, recent_serve.question_id)
                if question is not None:
                    return {
                        "session_id": session.id,
                        "question": {
                            "id": question.id,
                            "content": question.content,
                            "type": question.type.value,
                        },
                        "serve_token": recent_serve.serve_token,
                    }

            # All question IDs in the pool
            all_ids = list(db.exec(select(Question.id)))
            if not all_ids:
                return None

            now = time.time()
            cache_entry = self._candidate_cache.get(session.id)
            candidate_ids: List[int]

            if cache_entry is not None:
                expires_at, cached_ids = cache_entry
                if cached_ids and now < expires_at:
                    candidate_ids = cached_ids
                else:
                    candidate_ids = []
            else:
                candidate_ids = []

            if not candidate_ids:
                # Compute how many times each question has been answered in this session
                rows = db.exec(
                    select(AnswerCount.question_id, AnswerCount.count).where(
                        AnswerCount.session_id == session.id
                    )
                ).all()
                counts = {question_id: count for question_id, count in rows}

                min_count = min(counts.get(qid, 0) for qid in all_ids)
                candidate_ids = [qid for qid in all_ids if counts.get(qid, 0) == min_count]

                # Optional UX tweak: avoid showing the same question twice in a row
                # when there are multiple least-answered candidates.
                last_serve = db.exec(
                    select(QuestionServe)
                    .where(QuestionServe.session_id == session.id)
                    .order_by(QuestionServe.created_at.desc())
                ).first()
                if (
                    last_serve is not None
                    and last_serve.question_id in candidate_ids
                    and len(candidate_ids) > 1
                ):
                    alt = [qid for qid in candidate_ids if qid != last_serve.question_id]
                    if alt:
                        candidate_ids = alt

                # Cache least-answered candidates for a short time window
                self._candidate_cache[session.id] = (now + self._cache_ttl_seconds, candidate_ids)

            question_id = random.choice(candidate_ids)
            question = db.get(Question, question_id)
            if question is None:
                return None

            # Lightweight cleanup: remove unused serves older than 30 minutes
            cleanup_cutoff = datetime.utcnow() - timedelta(minutes=30)
            db.exec(
                delete(QuestionServe).where(
                    QuestionServe.session_id == session.id,
                    QuestionServe.used_at.is_(None),
                    QuestionServe.created_at < cleanup_cutoff,
                )
            )

            # Create a one-time serve token for this question+session
            token = uuid.uuid4().hex
            serve = QuestionServe(
                session_id=session.id,
                question_id=question.id,
                serve_token=token,
            )
            db.add(serve)
            db.commit()

            return {
                "session_id": session.id,
                "question": {
                    "id": question.id,
                    "content": question.content,
                    "type": question.type.value,
                },
                "serve_token": token,
            }

    def submit_answer(
        self,
        session_id: int,
        question_id: int,
        user_answered_phishing: bool,
        serve_token: str,
        user_id: Optional[str] = None,
    ) -> dict:
        """Record answer and return immediate feedback (correct, explanation).

        Raises:
            SessionEndedError: if the session has already ended.
            ServeTokenConflictError: if the token is missing/invalid/already used.
            InvalidAnswerRequestError: for bad session/question references.
        """
        session = session_service.get_session_by_id(session_id, user_id)
        if session is None:
            raise InvalidAnswerRequestError("Session not found.")
        if session.ended_at is not None:
            raise SessionEndedError("Session has ended. Start a new session to continue.")

        with DBSession(self._engine) as db:
            # Validate serve_token and ensure it matches this session/question
            serve = db.exec(
                select(QuestionServe).where(QuestionServe.serve_token == serve_token)
            ).first()
            if serve is None or serve.session_id != session_id or serve.question_id != question_id:
                raise ServeTokenConflictError(
                    "Answer already submitted for this served question or token is invalid."
                )
            # Expire old serve tokens so very stale UI cannot submit answers
            if serve.created_at < datetime.utcnow() - timedelta(minutes=10):
                raise ServeTokenConflictError(
                    "Serve token expired. Fetch the next question again."
                )
            if serve.used_at is not None:
                raise ServeTokenConflictError("Answer already submitted for this served question.")

            question = db.get(Question, question_id)
            if question is None:
                raise InvalidAnswerRequestError("Question not found.")

            correct = user_answered_phishing == question.is_phishing

            # Store full answer for analytics/debugging
            answer = Answer(
                session_id=session_id,
                question_id=question_id,
                user_answered_phishing=user_answered_phishing,
                correct=correct,
            )
            db.add(answer)

            # Maintain per-session per-question counts for faster /next selection.
            # Use a single upsert statement to be race-safe under concurrent answers.
            db.exec(
                text(
                    """
                    INSERT INTO answer_counts (session_id, question_id, count)
                    VALUES (:session_id, :question_id, 1)
                    ON CONFLICT(session_id, question_id)
                    DO UPDATE SET count = answer_counts.count + 1
                    """
                ),
                params={"session_id": session_id, "question_id": question_id},
            )

            # Mark token as used so double-submit is rejected
            serve.used_at = datetime.utcnow()
            db.add(serve)

            db.commit()

            # Any future /next for this session should see updated counts
            self._invalidate_cache_for_session(session_id)

            return {
                "correct": correct,
                "explanation": question.explanation,
                "question_id": question.id,
            }


quiz_service = QuizService()
