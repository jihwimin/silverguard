import os
import sys
import subprocess
from pathlib import Path
from dotenv import load_dotenv
from openai import OpenAI

from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

# ── Path setup & module imports ───────────────────────────────────────────────
current_file = Path(__file__).resolve()
backend_dir = current_file.parent
game_root = backend_dir.parent / "game" / "scam_quiz"

for path in [str(backend_dir), str(game_root)]:
    if path not in sys.path:
        sys.path.insert(0, path)

try:
    from app.models.db import get_engine, init_db
    from app.routes import quiz, session
    engine = get_engine()
    print("✅ All modules and DB engine loaded successfully.")
except ImportError as e:
    print(f"⚠️ Module load failed: {e}")
    engine, quiz, session = None, None, None

load_dotenv()
app = FastAPI(title="SilverGuard Integrated Server")

# ── CORS ──────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
from fraud_router import router as fraud_router, load_existing_fraud_data
app.include_router(fraud_router, prefix="/fraud", tags=["Fraud Scanner"])

if quiz and session:
    app.include_router(quiz.router, prefix="/quiz", tags=["Scam Quiz"])
    app.include_router(session.router, prefix="/session", tags=["Quiz Session"])

app.mount("/static", StaticFiles(directory="."), name="static")

# ── OpenAI & RAG setup ────────────────────────────────────────────────────────
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
BASE_URL = "https://knvpzmfq-8000.usw3.devtunnels.ms"

try:
    from rag_loader import VoicePhishingGuideLoader
    guide_loader = VoicePhishingGuideLoader(
        section_index_path="section_index.json",
        section_dir=".",
    )
    rag_enabled = True
    print("✅ RAG initialized successfully.")
except Exception as e:
    print(f"⚠️ RAG initialization failed: {e}")
    rag_enabled = False

# ── Request model ─────────────────────────────────────────────────────────────
class UserRequest(BaseModel):
    user_message: str

chat_history = []

# ── Startup event ─────────────────────────────────────────────────────────────
@app.on_event("startup")
async def on_startup():
    if engine:
        init_db(engine)
        print("✅ Database initialized.")
    await load_existing_fraud_data()

# ── RAG context retrieval ─────────────────────────────────────────────────────
def get_rag_context(user_msg: str) -> str:
    if not rag_enabled:
        return "Please contact your bank's fraud department immediately."
    return guide_loader.load_relevant_sections(query=user_msg, top_n=2)

# ── OpenAI chat completion ────────────────────────────────────────────────────
def get_openai_response(user_msg: str) -> str:
    guide_context = get_rag_context(user_msg)
    system_prompt = (
        "You are 'SilverGuard', a voice assistant designed to protect seniors "
        "from financial scams and voice phishing. Respond clearly, calmly, and "
        "concisely. Always prioritize the user's safety.\n\n"
        f"[Legal & Safety Guide Context]\n{guide_context}"
    )

    if not chat_history:
        chat_history.append({"role": "system", "content": system_prompt})

    chat_history.append({"role": "user", "content": user_msg})

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=chat_history,
        max_tokens=80,
        temperature=0.5,
    )
    ai_response = response.choices[0].message.content
    chat_history.append({"role": "assistant", "content": ai_response})
    return ai_response

# ── TTS generation ────────────────────────────────────────────────────────────
def generate_tts(text: str, filename: str = "response.mp3"):
    response = client.audio.speech.create(
        model="tts-1",
        voice="onyx",
        input=text,
        speed=1.15,
    )
    with open(filename, "wb") as f:
        f.write(response.content)

# ── Endpoints ─────────────────────────────────────────────────────────────────
@app.post("/chat")
async def text_chat(request: UserRequest):
    """Accept a text message, return an AI reply and a TTS audio URL."""
    ai_reply = get_openai_response(request.user_message)
    generate_tts(ai_reply)
    return {"reply": ai_reply, "audio_url": f"{BASE_URL}/static/response.mp3"}


@app.post("/voice-chat")
async def voice_chat(file: UploadFile = File(...)):
    """
    Accept a raw WAV upload, transcribe via Whisper,
    generate an AI reply, and return TTS audio.
    """
    raw_path, proc_path = "raw.wav", "proc.wav"

    with open(raw_path, "wb") as b:
        b.write(await file.read())

    subprocess.run(
        [
            r"C:\ffmpeg\bin\ffmpeg.exe",
            "-y", "-i", raw_path,
            "-ac", "1", "-ar", "16000",
            proc_path,
        ],
        check=True,
    )

    with open(proc_path, "rb") as f:
        trans = client.audio.transcriptions.create(
            model="whisper-1",
            file=f,
            language="en",
        )

    ai_reply = get_openai_response(trans.text)
    generate_tts(ai_reply)

    return {
        "user_text": trans.text,
        "reply": ai_reply,
        "audio_url": f"{BASE_URL}/static/response.mp3",
    }


@app.get("/health")
async def health():
    """Server health check."""
    return {"status": "ok", "rag": rag_enabled}