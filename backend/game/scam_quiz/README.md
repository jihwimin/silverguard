# Phishing Quiz API

FastAPI backend for a phishing awareness quiz. Uses SQLite and SQLModel for storage.

## Setup

### 1. Create a virtual environment

```bash
python3 -m venv venv
source venv/bin/activate   # On Windows: venv\Scripts\activate
```

### 2. Install dependencies

```bash
pip install -r requirements.txt
```

### 3. Seed the database (10 questions: SMS, email, call transcript)

```bash
python -m app.seed
```

Seeding is **idempotent**: you can run it anytime. Questions are deduplicated by `content_hash` (SHA256 of `type|content`), so existing questions are skipped and only new ones are inserted. Output shows `Inserted: N, Skipped: M`. Add new entries to `QUESTIONS` in `app/seed.py` and run again to import without clearing the DB.

### 4. Run the server

```bash
uvicorn app.main:app --reload
```

API will be at **http://127.0.0.1:8000**. Docs: **http://127.0.0.1:8000/docs**.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| POST | `/v1/session/start` | Start a quiz session (body: `{"user_id": "..."}`) |
| POST | `/v1/session/{session_id}/end` | End a session (Back to Home) |
| GET | `/v1/quiz/next?user_id=...` | Get next question (optional: `&session_id=...`) |
| POST | `/v1/quiz/answer` | Submit answer (body: `session_id`, `question_id`, `user_answered_phishing`, `serve_token`) |

## Project layout

```
app/
  main.py          # FastAPI app and lifespan
  seed.py          # DB seed script (10 questions)
  models/          # SQLModel models and DB setup
  routes/          # API route handlers
  services/        # Business logic
```
