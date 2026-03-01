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

# 경로 설정
current_file = Path(__file__).resolve()
backend_dir = current_file.parent.parent
game_root = backend_dir / "game" / "scam_quiz"

for path in [str(backend_dir), str(game_root)]:
    if path not in sys.path:
        sys.path.insert(0, path)

# 팀원 모듈 임포트
try:
    from app.models.db import get_engine, init_db
    from app.routes import quiz, session
    engine = get_engine()
    print("✅ 모든 모듈 및 DB 엔진 로드 성공")
except ImportError as e:
    print(f"⚠️ 모듈 로드 실패: {e}")
    engine, quiz, session = None, None, None

load_dotenv()

# 앱 초기화
app = FastAPI()

# CORS (한 번만 등록)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# DB 초기화
@app.on_event("startup")
def on_startup():
    if engine:
        init_db(engine)
        print("✅ Database initialized.")

# 라우터 등록
if quiz and session:
    app.include_router(quiz.router, prefix="/quiz", tags=["Scam Quiz"])
    app.include_router(session.router, prefix="/session", tags=["Quiz Session"])
    print("✅ Quiz & Session 라우터 등록 완료")

# 정적 파일 (한 번만 등록)
app.mount("/static", StaticFiles(directory="."), name="static")

# OpenAI 클라이언트
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# Dev Tunnel URL
BASE_URL = "https://knvpzmfq-8000.usw3.devtunnels.ms"

# RAG 로더 (없으면 fallback)
try:
    from rag_loader import VoicePhishingGuideLoader
    guide_loader = VoicePhishingGuideLoader(
        section_index_path="section_index.json",
        section_dir="."
    )
    rag_enabled = True
    print("✅ RAG 초기화 성공")
except Exception as e:
    print(f"⚠️ RAG initialization failed: {e}. Using manual.txt as fallback.")
    rag_enabled = False

# 데이터 모델
class UserRequest(BaseModel):
    user_message: str

chat_history = []

# Fallback 콘텐츠
try:
    with open("manual.txt", "r", encoding="utf-8") as file:
        manual_content = file.read()
except FileNotFoundError:
    manual_content = "Contact bank fraud department and file a report at ic3.gov."

def get_rag_context(user_msg: str) -> str:
    try:
        if not rag_enabled:
            return manual_content
        return guide_loader.load_relevant_sections(query=user_msg, top_n=2)
    except Exception as e:
        print(f"RAG Retrieval Error: {e}")
        return manual_content

def get_openai_response(user_msg: str) -> str:
    guide_context = get_rag_context(user_msg)

    system_prompt = f"""
    You are 'SilverGuard', a calm and professional legal voicebot for voice phishing victims. 
    Your primary goal is to provide immediate, actionable advice while keeping the user calm.
    You are also a normal chatbot so that you can interact with a user normally. 

    [CONVERSATIONAL RULES]
    1. If the user says a simple greeting like 'Hi' or 'Hello', respond with a warm greeting and ask how you can assist them with their emergency.
    2. Only if the input is completely unintelligible noise, ask them to repeat.
    3. If the user is panicking, start with a short calming phrase like "Please stay calm, I am here to help."
    4. Keep all responses strictly under 3-4 sentences to ensure fast voice delivery.

    [LEGAL ADVICE PROTOCOL]
    - Base specific advice on the provided Guide Context below.
    - If the context doesn't cover the situation, provide general safety steps.

    [Legal Guide Context]
    {guide_context}

    [MANDATORY DISCLAIMERS]
    Always include one if relevant: "Contact your bank's fraud department," "File at www.ic3.gov," or "Call FBI: (312) 421-6700."
    """

    if not chat_history:
        chat_history.append({"role": "system", "content": system_prompt})
    else:
        chat_history[0] = {"role": "system", "content": system_prompt}

    chat_history.append({"role": "user", "content": user_msg})

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=chat_history,
        max_tokens=80,
        temperature=0.5
    )

    ai_response = response.choices[0].message.content
    chat_history.append({"role": "assistant", "content": ai_response})
    return ai_response

def generate_tts(text: str, filename: str = "response.mp3"):
    try:
        response = client.audio.speech.create(
            model="tts-1",
            voice="onyx",
            input=text,
            speed=1.15
        )
        with open(filename, "wb") as f:
            f.write(response.content)
        print(f"✅ TTS 저장 성공: {filename}")
    except Exception as e:
        print(f"❌ TTS 에러: {e}")

@app.post("/chat")
async def text_chat(request: UserRequest):
    ai_reply = get_openai_response(request.user_message)
    generate_tts(ai_reply)
    return {
        "reply": ai_reply,
        "audio_url": f"{BASE_URL}/static/response.mp3"
    }

@app.post("/voice-chat")
async def voice_chat(file: UploadFile = File(...)):
    raw_path = "raw_voice.wav"
    processed_path = "processed_voice.wav"

    try:
        with open(raw_path, "wb") as buffer:
            buffer.write(await file.read())

        subprocess.run([
            r"C:\ffmpeg\bin\ffmpeg.exe", "-y", "-i", raw_path,
            "-ac", "1", "-ar", "16000", processed_path
        ], check=True, capture_output=True)

        with open(processed_path, "rb") as audio_file:
            transcription = client.audio.transcriptions.create(
                model="whisper-1",
                file=audio_file,
                language="en"
            )
        user_text = transcription.text.strip()

        if not user_text:
            raise ValueError("No speech detected")

        ai_reply = get_openai_response(user_text)
        generate_tts(ai_reply)

        return {
            "user_text": user_text,
            "reply": ai_reply,
            "audio_url": f"{BASE_URL}/static/response.mp3"
        }
    except Exception as e:
        print(f"Error: {e}")
        fallback_text = "I need urgent help with a suspicious call."
        reply = get_openai_response(fallback_text)
        generate_tts(reply)
        return {"user_text": fallback_text, "reply": reply, "audio_url": f"{BASE_URL}/static/response.mp3"}

@app.get("/health")
async def health():
    return {"status": "ok", "rag": rag_enabled}