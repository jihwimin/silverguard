import os
import subprocess
from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from dotenv import load_dotenv
from openai import OpenAI
from rag_loader import VoicePhishingGuideLoader

load_dotenv()

# Inject ffmpeg path into system PATH
ffmpeg_path = r"C:\ffmpeg\bin"
os.environ["PATH"] += os.pathsep + ffmpeg_path

app = FastAPI()

# Dev Tunnel URL
BASE_URL = "https://knvpzmfq-8000.usw3.devtunnels.ms"

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files for audio playback
app.mount("/static", StaticFiles(directory="."), name="static")

# Initialize OpenAI Client
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# Initialize RAG Loader
try:
    guide_loader = VoicePhishingGuideLoader(
        section_index_path="section_index.json",
        section_dir="."
    )
    rag_enabled = True
except Exception as e:
    print(f"⚠️ RAG initialization failed: {e}. Using manual.txt as fallback.")
    rag_enabled = False

class UserRequest(BaseModel):
    user_message: str

chat_history = []

# Fallback content
try:
    with open("manual.txt", "r", encoding="utf-8") as file:
        manual_content = file.read()
except FileNotFoundError:
    manual_content = "Contact bank fraud department and file a report at ic3.gov."

def get_rag_context(user_msg: str) -> str:
    """Retrieve relevant legal context based on user query."""
    try:
        if not rag_enabled:
            return manual_content
        # Load top 2 relevant sections to keep tokens low and speed high [cite: 2026-02-28]
        return guide_loader.load_relevant_sections(query=user_msg, top_n=2)
    except Exception as e:
        print(f"RAG Retrieval Error: {e}")
        return manual_content

def get_openai_response(user_msg: str) -> str:
    """Generate professional, RAG-based advice with optimized latency."""
    guide_context = get_rag_context(user_msg)
    
    system_prompt = f"""
    You are 'SilverGuard', a calm and professional legal voicebot for voice phishing victims. 
    Your primary goal is to provide immediate, actionable advice while keeping the user calm.
    You are also a normal chabot so that you can interact with a user noramally. 

    [CONVERSATIONAL RULES]
    1. If the user says a simple greeting like 'Hi' or 'Hello', respond with a warm greeting and ask how you can assist them with their emergency.
    2. Only if the input is completely unintelligible noise, ask them to repeat.
    2. If the user is panicking, start with a short calming phrase like "Please stay calm, I am here to help."
    3. Keep all responses strictly under 3-4 sentences to ensure fast voice delivery.

    [LEGAL ADVICE PROTOCOL]
    - Base specific advice on the provided Guide Context below.
    - If the context doesn't cover the situation, provide general safety steps: "Turn on airplane mode," "Contact your guardian or close family" or "Do not transfer any money." and other examples you can think of.

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
    
    # Optimized for speed: low max_tokens and gpt-4o-mini [cite: 2026-02-26]
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
    """최신 SDK 버전에 상관없이 가장 확실하게 파일을 저장하는 방식입니다."""
    try:
        response = client.audio.speech.create(
            model="tts-1",
            voice="onyx",
            input=text,
            speed=1.15
        )
        # response.content를 직접 바이너리로 저장 (가장 안전) [cite: 2026-02-28]
        with open(filename, "wb") as f:
            f.write(response.content)
        print(f"✅ TTS 저장 성공: {filename}")
    except Exception as e:
        print(f"❌ TTS 에러 발생: {e}")

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
        
        # Convert audio for Whisper compatibility [cite: 2026-02-03]
        subprocess.run([
            r"C:\ffmpeg\bin\ffmpeg.exe", "-y", "-i", raw_path, 
            "-ac", "1", "-ar", "16000", processed_path
        ], check=True, capture_output=True)

        # Whisper STT [cite: 2026-02-03]
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