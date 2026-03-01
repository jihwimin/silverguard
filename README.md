# SilverGuard

AI-powered real-time voice phishing defense. Protects seniors with live audio detection, screenshot analysis, and guardian alerts.

---

## Architecture

| Component | Tech | Port | Purpose |
|-----------|------|------|---------|
| **Frontend** | Expo / React Native | — | Mobile app (iOS, Android, Web) |
| **Node Server** | Express, MongoDB | 4000 | Auth, OTP, guardian linking |
| **Detector** | FastAPI, Python | 8000 | Phishing ML, Whisper STT, OCR |

---

## Quick Start

### 1. Detector (phishing + STT + OCR)

```bash
brew install ffmpeg   # Required for audio transcription

cd backend/detector
pip install -r requirements.txt
cp .env.example .env   # Add OPENAI_API_KEY
uvicorn api:app --reload --host 0.0.0.0 --port 8000
```

### 2. Node Server (auth + guardian link)

```bash
cd backend/node-server
npm install
cp .env.example .env   # Add MONGODB_URI, JWT_SECRET, Twilio credentials
npm start             # or: npm run dev (nodemon)
```

### 3. Frontend

```bash
cd frontend
npm install
# Edit frontend/constants/config.ts with your API URLs
npm start
```

---

## Configuration

### `frontend/constants/config.ts`

| Variable | Description |
|----------|-------------|
| `AUTH_API_BASE` | Node server URL (auth, guardian link) |
| `BASE_DETECTOR_URL` | Detector API URL (phishing, STT, OCR) |

For local dev: use `http://localhost:4000` and `http://localhost:8000`, or expose via devtunnels and paste the public URLs.

### Node Server `.env`

| Variable | Required | Description |
|----------|----------|-------------|
| `MONGODB_URI` | ✓ | MongoDB connection string |
| `JWT_SECRET` | ✓ | Secret for JWT signing |
| `TWILIO_ACCOUNT_SID` | ✓ | Twilio account SID |
| `TWILIO_AUTH_TOKEN` | ✓ | Twilio auth token |
| `TWILIO_VERIFY_SERVICE_SID` | ✓ | Twilio Verify service SID (starts with `VA`) |
| `PORT` | | Default: 4000 |

### Detector `.env`

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENAI_API_KEY` | ✓ | For Whisper STT and Vision OCR |

---

## API Reference

### Node Server (Auth API)

Base path: `/auth`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/otp/send` | — | Send OTP to phone. Body: `{ phoneE164: string }` |
| POST | `/otp/verify` | — | Verify OTP, create/get user, return JWT. Body: `{ phoneE164, code, role: "senior" \| "guardian" }` |
| POST | `/dev-login` | — | Skip OTP for dev. Body: `{ phoneE164, role }` |
| POST | `/link/create-code` | ✓ | Create 6-digit link code (10 min expiry) |
| POST | `/link/confirm` | ✓ | Link with another user. Body: `{ code: string }` |
| POST | `/link/unlink` | ✓ | Unlink from guardian |
| GET | `/me` | ✓ | Current user + link status (includes `linkedUserPhone`) |

### Detector API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check + model status |
| POST | `/predict` | Phishing score for text. Body: `{ text }` |
| POST | `/stream/update` | Live phishing score. Body: `{ session_id, text, is_final? }` |
| POST | `/stt/chunk` | Transcribe audio (Whisper). FormData: `audio` file |
| POST | `/ocr` | Extract text from image. FormData: `image` file |
| POST | `/detect/image` | OCR + phishing for screenshot. FormData: `image` file |

---

## Frontend Features

### Screens

| Screen | Tab | Description |
|--------|-----|-------------|
| **Home** | Home | Dashboard, quick actions |
| **Protection** | Live Detect | Live audio recording → STT → real-time phishing % (RiskGauge) |
| **Diagnosis** | Diagnosis | Screenshot analysis, text input for phishing check |
| **More** | More | Settings, Guardian Hub, Alert settings, **Log out** |

### Auth Flow

1. **Onboarding** — First-time intro
2. **Verification** — Phone OTP (US +1, Twilio). Creates user, stores JWT.
3. **Log out** — Clears token + verified state; returns to verification on next open.

### Guardian Linking

1. **Guardian Hub** (More → Guardian link & alerts)
2. **Link Guardian** — Opens Guardian Link screen
3. **User A** generates 6-digit code, shares with **User B**
4. **User B** enters code → both users linked
5. **Contact** — Call linked guardian (opens dialer)
6. **Unlink** — Break link (both sides cleared)

---

## Project Structure

```
silverguard/
├── frontend/                 # Expo React Native app
│   ├── app/
│   │   ├── (tabs)/          # home, protection, diagnosis, more
│   │   ├── guardian-hub.tsx # Link status, Contact, Unlink
│   │   ├── guardian-link.tsx# Create/enter link code
│   │   ├── verification.tsx # Phone OTP login
│   │   └── ...
│   ├── lib/
│   │   ├── api.ts           # Detector API (predict, STT, stream, OCR)
│   │   └── authApi.ts       # Auth API (OTP, link, me)
│   └── constants/config.ts
├── backend/
│   ├── node-server/         # Auth + guardian link
│   │   ├── server.js
│   │   └── src/
│   │       ├── routes/auth.js
│   │       └── models/User.js
│   └── detector/            # Phishing ML + STT + OCR
│       ├── api.py
│       ├── predict.py
│       └── requirements.txt
└── README.md
```

---

## Notes

- **Twilio trial**: Verify phone numbers in Twilio Console for OTP to work.
- **ffmpeg**: Required for best Whisper accuracy (converts to 16kHz mono).
- **Phishing model**: Loaded from `backend/detector` on startup.
- More features will be merged from teammates later.
