import os
import sys
import subprocess
import time
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
# UIUC 환경에 맞춘 경로 설정 유지 [cite: 2025-12-10]
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

# 모든 정적 파일 접근 허용 [cite: 2026-02-28]
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
    system_prompt = f"""
    You are 'SilverGuard', a calm and professional legal voicebot for voice phishing victims. 
    Your primary goal is to provide immediate, actionable advice while keeping the user calm.
    
    [CONVERSATIONAL RULES]
    1. If the user says a simple greeting, respond with a warm greeting.
    2. Start with a short calming phrase if the user is panicking.
    3. Keep all responses strictly under 3-4 sentences for fast delivery.

    [Legal Guide Context]
    {guide_context}

    [MANDATORY DISCLAIMERS]
    Always include one if relevant: "Contact your bank's fraud department," "File at www.ic3.gov," or "Call FBI: (312) 421-6700."
    """

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

# ── TTS generation with Loudness Normalization ────────────────────────────────
def generate_tts(text: str) -> str:
    """
    고유 파일명 생성 + Loudnorm 필터로 음량 표준화 및 증폭 [cite: 2026-02-28]
    """
    timestamp = int(time.time())
    temp_filename = f"temp_{timestamp}.mp3"
    final_filename = f"res_{timestamp}.mp3"
    
    # 1. OpenAI TTS 생성 (고음역대가 또렷한 shimmer 목소리 추천) [cite: 2026-02-28]
    response = client.audio.speech.create(
        model="tts-1",
        voice="shimmer", 
        input=text,
        speed=1.1,
    )
    with open(temp_filename, "wb") as f:
        f.write(response.content)

    # 2. FFmpeg: loudnorm(표준 음량화) + highpass(저음 제거)로 가독성 및 볼륨 확보 [cite: 2026-02-28]
    try:
        subprocess.run([
            r"C:\ffmpeg\bin\ffmpeg.exe", "-y", 
            "-i", temp_filename,
            "-filter:a", "loudnorm=I=-14:TP=-1.5:LRA=11,highpass=f=200", 
            final_filename
        ], check=True, capture_output=True)
        # 임시 파일 삭제
        os.remove(temp_filename)
        return final_filename
    except Exception as e:
        print(f"⚠️ 오디오 처리 실패: {e}")
        return temp_filename

# ── Endpoints ─────────────────────────────────────────────────────────────────
@app.post("/chat")
async def text_chat(request: UserRequest):
    ai_reply = get_openai_response(request.user_message)
    audio_file = generate_tts(ai_reply)
    return {
        "reply": ai_reply, 
        "audio_url": f"{BASE_URL}/static/{audio_file}" 
    }

@app.post("/voice-chat")
async def voice_chat(file: UploadFile = File(...)):
    raw_path, proc_path = "raw.wav", "proc.wav"

    with open(raw_path, "wb") as b:
        b.write(await file.read())

    # Whisper를 위한 전처리
    subprocess.run([
        r"C:\ffmpeg\bin\ffmpeg.exe", "-y", "-i", raw_path,
        "-af", "highpass=f=200,lowpass=f=3000,volume=2.0", # 200Hz 이하 소음 제거 + 볼륨 2배 [cite: 2026-02-28]
        "-ac", "1", "-ar", "16000", proc_path
    ], check=True)

    with open(proc_path, "rb") as f:
        trans = client.audio.transcriptions.create(
            model="whisper-1",
            file=f,
            language="en",
        )

    ai_reply = get_openai_response(trans.text)
    audio_file = generate_tts(ai_reply) # 고유 파일명 생성 [cite: 2026-02-28]

    return {
        "user_text": trans.text,
        "reply": ai_reply,
        "audio_url": f"{BASE_URL}/static/{audio_file}",
    }

@app.get("/health")
async def health():
    return {"status": "ok", "rag": rag_enabled}