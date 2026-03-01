import os
import time
from typing import Dict, Optional

from fastapi import FastAPI, HTTPException, UploadFile, File
from pydantic import BaseModel, Field

from dotenv import load_dotenv

from predict import load_latest_model
import base64
import mimetypes
from fastapi.middleware.cors import CORSMiddleware

# --- OpenAI SDK (modern) ---
from openai import OpenAI

# Load .env (OPENAI_API_KEY, etc.)
HERE = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(HERE, ".env"))

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
client = OpenAI(api_key=OPENAI_API_KEY) if OPENAI_API_KEY else None

app = FastAPI(title="SilverGuard Detector API", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # hackathon/dev. tighten later.
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)
# Load phishing model once
model = None

# Simple in-memory session store for realtime transcript updates
SESSIONS: Dict[str, Dict] = {}
SESSION_TTL_SECONDS = 60 * 10  # 10 minutes

def severity_from_prob(prob: float) -> str:
    if prob >= 0.85:
        return "high"
    if prob >= 0.50:
        return "medium"
    return "low"

def _to_data_url(image_bytes: bytes, content_type: str) -> str:
    """
    Convert raw image bytes to a data URL that the Responses API can accept as input_image.image_url.
    """
    b64 = base64.b64encode(image_bytes).decode("utf-8")
    return f"data:{content_type};base64,{b64}"


def extract_text_with_openai_vision(image_bytes: bytes, content_type: str) -> str:
    """
    Uses an OpenAI vision-capable model to extract text from an image.
    Returns ONLY the extracted text (no commentary).
    """
    if client is None:
        raise HTTPException(status_code=503, detail="OPENAI_API_KEY not configured")

    data_url = _to_data_url(image_bytes, content_type)

    prompt = (
        "You are an OCR engine. Extract all readable message text from this screenshot.\n"
        "Rules:\n"
        "- Return ONLY the extracted text.\n"
        "- Preserve URLs exactly.\n"
        "- Preserve line breaks.\n"
        "- Do NOT add explanations or extra words.\n"
        "- If no text is readable, return an empty string.\n"
    )

    # Responses API with image input
    resp = client.responses.create(
        model="gpt-4o-mini",
        input=[{
            "role": "user",
            "content": [
                {"type": "input_text", "text": prompt},
                {"type": "input_image", "image_url": data_url},
            ],
        }],
    )

    # Most SDK versions expose resp.output_text for convenience.
    text = getattr(resp, "output_text", None)
    if text is None:
        # Fallback: try to stringify
        text = str(resp)

    return text.strip()

@app.on_event("startup")
def startup_event():
    global model
    model = load_latest_model()


class PredictRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=20000)


class PredictResponse(BaseModel):
    probability: float
    percent: float
    label: str
    severity: str
    threshold: float
    latency_ms: float


@app.get("/health")
def health():
    return {
        "status": "ok",
        "model_loaded": model is not None,
        "openai_configured": client is not None,
    }


@app.post("/predict", response_model=PredictResponse)
def predict(req: PredictRequest):
    if model is None:
        raise HTTPException(status_code=503, detail="Model not loaded")

    t0 = time.time()
    prob = float(model.predict_proba([req.text])[0, 1])
    percent = prob * 100.0

    threshold = 0.70
    label = "phishing" if prob >= threshold else "safe"
    severity = severity_from_prob(prob)

    return PredictResponse(
        probability=prob,
        percent=percent,
        label=label,
        severity=severity,
        threshold=threshold,
        latency_ms=(time.time() - t0) * 1000.0,
    )


class StreamUpdateRequest(BaseModel):
    session_id: str = Field(..., min_length=3, max_length=64)
    text: str = Field(..., min_length=1, max_length=20000)
    is_final: bool = False


class StreamUpdateResponse(BaseModel):
    session_id: str
    probability: float
    percent: float
    label: str
    severity: str
    threshold: float
    latency_ms: float
    chars: int
    is_final: bool

class OCRResponse(BaseModel):
    text: str
    latency_ms: float
    model: str


class DetectImageResponse(BaseModel):
    extracted_text: str
    probability: float
    percent: float
    label: str
    severity: str
    threshold: float
    ocr_latency_ms: float
    ml_latency_ms: float
    total_latency_ms: float

@app.post("/stream/update", response_model=StreamUpdateResponse)
def stream_update(req: StreamUpdateRequest):
    if model is None:
        raise HTTPException(status_code=503, detail="Model not loaded")

    # cleanup expired sessions
    now = time.time()
    expired = [sid for sid, v in SESSIONS.items() if now - v["last_seen"] > SESSION_TTL_SECONDS]
    for sid in expired:
        del SESSIONS[sid]

    SESSIONS[req.session_id] = {"last_seen": now}

    t0 = time.time()
    prob = float(model.predict_proba([req.text])[0, 1])
    percent = prob * 100.0
    threshold = 0.70
    label = "phishing" if prob >= threshold else "safe"
    severity = severity_from_prob(prob)
    latency_ms = (time.time() - t0) * 1000.0

    if req.is_final:
        SESSIONS.pop(req.session_id, None)

    return StreamUpdateResponse(
        session_id=req.session_id,
        probability=prob,
        percent=percent,
        label=label,
        severity=severity,
        threshold=threshold,
        latency_ms=latency_ms,
        chars=len(req.text),
        is_final=req.is_final,
    )


class STTResponse(BaseModel):
    text: str
    latency_ms: float
    model: str


@app.post("/stt/chunk", response_model=STTResponse)
async def stt_chunk(audio: UploadFile = File(...)):
    """
    Upload a short audio chunk (e.g., 1–2 seconds). Returns transcript text.
    """
    if client is None:
        raise HTTPException(status_code=503, detail="OPENAI_API_KEY not configured")

    t0 = time.time()
    audio_bytes = await audio.read()

    # Use OpenAI Audio Transcriptions API
    # Models: gpt-4o-transcribe (higher quality) or whisper-1 (classic) :contentReference[oaicite:2]{index=2}
    transcript = client.audio.transcriptions.create(
        model="gpt-4o-transcribe",
        file=(audio.filename or "chunk.wav", audio_bytes),
    )

    text = transcript.text if hasattr(transcript, "text") else str(transcript)
    return STTResponse(text=text, latency_ms=(time.time() - t0) * 1000.0, model="gpt-4o-transcribe")

@app.post("/ocr", response_model=OCRResponse)
async def ocr(image: UploadFile = File(...)):
    """
    Upload a CROPPED screenshot (ideally just the chat bubble area).
    Returns extracted text only.
    """
    if client is None:
        raise HTTPException(status_code=503, detail="OPENAI_API_KEY not configured")

    t0 = time.time()
    image_bytes = await image.read()

    content_type = image.content_type or mimetypes.guess_type(image.filename or "")[0] or "image/png"
    if not content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail=f"Unsupported content type: {content_type}")

    text = extract_text_with_openai_vision(image_bytes, content_type)
    latency_ms = (time.time() - t0) * 1000.0

    return OCRResponse(text=text, latency_ms=latency_ms, model="gpt-4o-mini")


@app.post("/detect/image", response_model=DetectImageResponse)
async def detect_image(image: UploadFile = File(...)):
    """
    Upload a CROPPED screenshot -> OCR -> run ML phishing detector.
    Returns both extracted text and phishing score.
    """
    if model is None:
        raise HTTPException(status_code=503, detail="Model not loaded")
    if client is None:
        raise HTTPException(status_code=503, detail="OPENAI_API_KEY not configured")

    total_start = time.time()

    # --- OCR ---
    ocr_start = time.time()
    image_bytes = await image.read()
    content_type = image.content_type or mimetypes.guess_type(image.filename or "")[0] or "image/png"
    if not content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail=f"Unsupported content type: {content_type}")

    extracted_text = extract_text_with_openai_vision(image_bytes, content_type)
    ocr_latency_ms = (time.time() - ocr_start) * 1000.0

    # If OCR returns empty, return a helpful response
    if not extracted_text.strip():
        return DetectImageResponse(
            extracted_text="",
            probability=0.0,
            percent=0.0,
            label="safe",
            severity="low",
            threshold=0.70,
            ocr_latency_ms=ocr_latency_ms,
            ml_latency_ms=0.0,
            total_latency_ms=(time.time() - total_start) * 1000.0,
        )

    # --- ML prediction ---
    ml_start = time.time()
    prob = float(model.predict_proba([extracted_text])[0, 1])
    ml_latency_ms = (time.time() - ml_start) * 1000.0

    percent = prob * 100.0
    threshold = 0.70
    label = "phishing" if prob >= threshold else "safe"
    severity = severity_from_prob(prob)

    total_latency_ms = (time.time() - total_start) * 1000.0

    return DetectImageResponse(
        extracted_text=extracted_text,
        probability=prob,
        percent=percent,
        label=label,
        severity=severity,
        threshold=threshold,
        ocr_latency_ms=ocr_latency_ms,
        ml_latency_ms=ml_latency_ms,
        total_latency_ms=total_latency_ms,
    )