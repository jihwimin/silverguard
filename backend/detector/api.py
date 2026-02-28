from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
import time
from pathlib import Path

from predict import load_latest_model, MODELS_DIR

app = FastAPI(title="SilverGuard Phishing Detector", version="1.0.0")


class PredictRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=5000)


class PredictResponse(BaseModel):
    probability: float
    percent: float
    label: str
    severity: str
    threshold: float
    latency_ms: float
    model_run_dir: str


model = None
model_run_dir = "unknown"


@app.on_event("startup")
def startup_event():
    global model, model_run_dir
    model = load_latest_model()

    # Determine latest run dir name for debugging
    run_dirs = sorted([p for p in MODELS_DIR.glob("*") if p.is_dir()],
                      key=lambda p: p.stat().st_mtime, reverse=True)
    if run_dirs:
        model_run_dir = run_dirs[0].name


@app.post("/predict", response_model=PredictResponse)
def predict(req: PredictRequest):
    if model is None:
        raise HTTPException(status_code=503, detail="Model not loaded")

    t0 = time.time()

    prob = float(model.predict_proba([req.text])[0, 1])
    percent = round(prob * 100.0, 2)
    prob = round(prob, 4)

    threshold = 0.70
    label = "phishing" if prob >= threshold else "safe"

    if prob >= 0.85:
        severity = "high"
    elif prob >= 0.50:
        severity = "medium"
    else:
        severity = "low"

    latency_ms = (time.time() - t0) * 1000.0

    return PredictResponse(
        probability=prob,
        percent=percent,
        label=label,
        severity=severity,
        threshold=threshold,
        latency_ms=latency_ms,
        model_run_dir=model_run_dir,
    )