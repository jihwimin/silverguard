# SilverGuard Detector

Phishing detection API with live audio STT (speech-to-text).

## Setup

1. **Install ffmpeg** (required for best audio transcription):
   ```bash
   brew install ffmpeg   # macOS
   # apt install ffmpeg  # Linux
   ```

2. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Configure environment:**
   ```bash
   cp .env.example .env
   # Add your OPENAI_API_KEY to .env
   ```

4. **Run:**
   ```bash
   uvicorn api:app --reload --host 0.0.0.0 --port 8000
   ```

## Endpoints

- `POST /stt/chunk` – Upload audio chunk, get transcript (uses Whisper + ffmpeg 16kHz mono)
- `POST /stream/update` – Send transcript for phishing detection
- `POST /predict` – One-shot text phishing check
- `GET /health` – Health check
