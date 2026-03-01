# SilverGuard
### *AI-powered real-time voice-text phishing defense for seniors*

SilverGuard is a mobile fraud prevention platform built for elderly users. It combines real-time audio analysis, screenshot scanning, a guardian alert network, and a gamified training mode into one large-button, voice-guided interface designed for seniors who may not be tech-savvy.

---

## Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [How the ML Works](#how-the-phishing-ml-works)
- [API Reference](#api-reference)
- [Project Structure](#project-structure)
- [Notes](#notes)

---

## Features

### 1. Real-Time Call Detection

The **Live Detect** tab turns the phone into a live phishing detector during a call.

```
🎙️  Microphone
       ↓
🔊  FFmpeg preprocessing (16kHz mono, highpass filter, 2× volume boost)
       ↓
📝  OpenAI Whisper STT  →  transcript
       ↓
🤖  scikit-learn ML classifier  →  risk score (0–100%)
       ↓
📊  Live RiskGauge  →  🔴 RED ALERT if ≥ 70%
```

- **Keyword triggers** (instant alert regardless of ML score):
  - *"your account is frozen"* · *"transfer right now"* · *"grandchild emergency"* · *"IRS arrest warrant"*
- **Streaming mode** — `/stream/update` accumulates transcript chunks and recalculates score in real time
- **AI voice response** via OpenAI TTS (`shimmer` voice)
- **RiskGauge** component: animated semicircular meter, color-shifts green → yellow → red


---

### 2. Smishing & Screenshot Diagnosis

The **Diagnosis** tab accepts a pasted message or a photo of a suspicious text/KakaoTalk screenshot.

| Input | Pipeline | Output |
|-------|----------|--------|
| Pasted text | `/predict` | Risk % + flagged signals |
| Screenshot photo | `/ocr` (GPT-4o Vision) → `/predict` | Extracted text + Risk % + explanation |
| Screenshot (one-tap) | `/detect/image` (OCR + ML combined) | Same as above, single call |

**Example output for "Your package is on hold. Pay $2.99: http://track-xyz.com":**

```
⚠️  Risk Score: 94%

Danger signals detected:
  · Creates false urgency
  · Contains external link
  · Requests payment information
  · Unusual sender / short URL
```


---

### 3. Guardian Alert System

Seniors can link a family member as a **Guardian**. When a high-risk event is detected:

```
Senior's phone detects risk ≥ 85%
              ↓
  Push notification sent to Guardian:
  "⚠️ A suspicious call was detected.
   Risk level: HIGH (91%).
   Recommended action: call immediately."
              ↓
  Guardian taps → sees risk type, time, suggested steps
  Guardian taps "Contact" → phone dialer opens
```

**What IS shared with guardians:**
- Risk type (call / text / screenshot)
- Risk percentage and severity
- Recommended actions

**What is NEVER shared:**
- Call content or transcript
- Account numbers or personal details
- The full message text

**Linking flow:**
1. Senior goes to **More → Guardian link & alerts**
2. Taps **Link Guardian** → a 6-digit code appears (10-minute expiry)
3. Guardian enters the code in their own SilverGuard app
4. Both are linked — guardian receives alerts from that moment on

Guardian linking is handled by the Node server via a **Twilio Verify OTP** flow, with JWT authentication on both sides.

---

### 4. Nessie Fraud Scanner

Before sending money, search an **account number or merchant name** in **Transfer Protection**.

```
User types: "Quick Loan"
                ↓
  GET /fraud/check?query=Quick+Loan
                ↓
  Nessie API: fetch all merchants
                ↓
  normalize("Quick L0an") → "quick loan"  (0→o substitution)
  SequenceMatcher similarity: 97%  ✅ MATCH
                ↓
  ┌────────────────────────────────────────────┐
  │  ⚠️  HIGH RISK DETECTED                    │
  │  Name:        Quick L0an Services          │
  │  Impersonating: Quick Loan Services        │
  │  Fraud reports: 31                         │
  │  Similarity: ████████████░  97%            │
  │  Reason: Impersonates licensed lenders...  │
  └────────────────────────────────────────────┘
```

**20 fraud account profiles** seeded into Nessie — covering the most common senior scams:

| Nickname | Scam Type | Reports |
|----------|-----------|---------|
| `FRAUD_irs_imposter` | Fake IRS agent demanding wire transfer | 55 |
| `FRAUD_investment_ponzi` | Guaranteed 30% monthly returns (Ponzi) | 62 |
| `FRAUD_social_security` | SSN suspended — wire transfer demanded | 47 |
| `FRAUD_bank_spoof_01` | Spoofed bank number, "safe account" trap | 44 |
| `FRAUD_crypto_pump` | Crypto pump-and-dump targeting seniors | 41 |
| `FRAUD_medicare_fraud` | Fake Medicare refund harvesting data | 38 |
| `FRAUD_lottery_scam` | Upfront fee to claim fake prize | 34 |
| `FRAUD_romance_scam_01` | Online romance before money request | 27 |
| `FRAUD_grandparent_scam` | "Your grandchild is in jail" | 23 |
| `FRAUD_student_loan` | Fake loan forgiveness fee | 29 |
| *(+ 10 more)* | | |

**Homoglyph / typo detection** catches merchants that swap characters to fool victims:

| Fraudulent Name | Impersonating | Trick Used |
|----------------|---------------|------------|
| `Quick L0an Services` | Quick Loan Services | `o` → `0` |
| `OffiCial Po1ice Dept` | Official Police Department | `l` → `1`, mixed case |
| `Nationa1 Tax Service` | National Tax Service | `l` → `1` |
| `KB Savings Bankk` | KB Savings Bank | extra `k` |
| `Financial Supervisory Serivce` | Financial Supervisory Service | transposed letters |

**Detection uses two layers:**
1. **Character normalization** — `0→o`, `1→l`, `3→e`, `@→a`, `$→s`
2. **`difflib.SequenceMatcher`** — ≥ 75% similarity → flagged as impersonation

Fraud data persists in `fraud_data.json` across server restarts — no re-seeding needed.

---

### 5. Scam Training Game

The **Response Training** tab is a gamified phishing awareness quiz.

```
┌─────────────────────────────────────────────────────┐
│  📱  SMS · EMAIL · CALL TRANSCRIPT                  │
│                                                     │
│  "Your account has been compromised.                │
│   Click here to verify: http://secure-bnk.com"      │
│                                                     │
│  [ 🚨 PHISHING ]        [ ✅ SAFE ]                │
└─────────────────────────────────────────────────────┘
         ↓ Answer
┌─────────────────────────────────────────────────────┐
│  ✓ Correct! This is a phishing message.             │
│  Red flags: external link, urgency, spoofed URL     │
└─────────────────────────────────────────────────────┘
```

- **30 real-world scenarios** seeded via `app/seed.py` — SMS smishing, email fraud, call transcripts
- **Least-answered-first** question ordering via `answer_count` table — ensures balanced coverage
- **Serve tokens** — UUID per question prevents double-submission race conditions
- **Session-based scoring** with badge tiers on result screen:
  - 🥇 *Security Expert* (≥ 90%)
  - 🥈 *Security Apprentice* (70–89%)
  - 📚 *Needs Practice* (< 70%)

---

### 6. SilverGuard Voicebot

```
User message (text or voice)
         ↓
  Keyword matching against section_index.json
         ↓
  Load 2 most relevant sections from Illinois Voice Phishing Legal Guide
         ↓
  GPT-4o-mini  (max 80 tokens, temp 0.5)
         ↓
  Response + mandatory disclaimer
         ↓
  TTS (shimmer voice, 1.1× speed, loudnorm filter)  →  audio URL
```

**8 guide sections available:**

| Section | Topics |
|---------|--------|
| `immediate_response` | First steps after a scam call |
| `bank_procedures` | How to call your bank's fraud line |
| `wire_recovery` | Recovering a wired transfer |
| `identity_theft` | SSN compromise, credit freeze |
| `credit_card` | Chargebacks, card cancellation |
| `p2p_fraud` | Zelle, Venmo, CashApp recovery |
| `special_situations` | Grandparent scam, romance scam |
| `resources_support` | FBI IC3, FTC, AARP hotlines |

Each response includes at least one of: *"Contact your bank's fraud department"*, *"File at www.ic3.gov"*, *"Call FBI: (312) 421-6700"*

---

### 7. Senior-First UI Design

- **4 large feature cards** on the home screen — one tap to any feature
- **100×100px mic button** on Live Detect with a pulsing red ring animation when active
- **Large text throughout** — minimum 17px body, 24px headings
- **High contrast** — white cards on light gray background, blue primary, red danger
- **No hidden menus** — every action is one or two taps from Home
- **Voice guidance** — TTS plays automatically after detection events
- **Phone OTP login** — no passwords, no complexity

---

## How the Phishing ML Works

```
Raw text
    ↓
TF-IDF vectorization
    ↓
scikit-learn binary classifier
    ↓
Probability score  →  Severity band

  0.00 – 0.49  →  🟢 Low risk
  0.50 – 0.69  →  🟡 Medium risk
  0.70 – 0.84  →  🟠 High risk
  0.85 – 1.00  →  🔴 Critical — guardian alert triggered
```

**Streaming mode** (`/stream/update`):
- Session accumulates transcript chunks
- Score recalculated after each chunk
- `is_final: true` clears the session buffer

**RAG routing** for the voicebot:
- User message → keyword match against `section_index.json`
- Top 2 sections loaded into GPT-4o-mini context window
- Keeps token usage minimal while maintaining accuracy

---

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│                    SilverGuard App                        │
│             Expo React Native (iOS + Android)             │
└────────────┬─────────────────────────┬───────────────────┘
             │                         │
    ┌────────▼────────┐       ┌────────▼──────────────────┐
    │   Node Server   │       │     Python Backend         │
    │  Express + JWT  │       │     FastAPI · Port 8000    │
    │  MongoDB        │       └────────┬──────────────────┘
    │  Port 4000      │                │
    │                 │       ┌────────▼──────────────────┐
    │  · OTP (Twilio) │       │       OpenAI APIs          │
    │  · JWT Auth     │       │  · Whisper STT             │
    │  · Guardian     │       │  · GPT-4o Vision OCR       │
    │    Linking      │       │  · GPT-4o-mini (chat/RAG)  │
    └─────────────────┘       │  · TTS (shimmer voice)     │
                              └────────┬──────────────────┘
                                       │
                              ┌────────▼──────────────────┐
                              │   Capital One Nessie API   │
                              │   Virtual fraud account    │
                              │   & merchant database      │
                              └───────────────────────────┘
```

| Component | Tech | Port | Purpose |
|-----------|------|------|---------|
| **Frontend** | Expo / React Native | — | Mobile app (iOS + Android) |
| **Node Server** | Express, MongoDB, Twilio | 4000 | Auth, OTP, guardian linking |
| **Python Backend** | FastAPI, scikit-learn | 8000 | Phishing ML, STT, OCR, TTS, Fraud Scanner, Quiz API |
| **Nessie** | Capital One API | — | Virtual fraud account & merchant database |

---

## Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+
- MongoDB (local or Atlas)
- ffmpeg — `brew install ffmpeg` (Mac) or download to `C:\ffmpeg\` (Windows)

---

### 1. Python Backend

```bash
cd backend/voicebot
pip install -r requirements.txt
cp .env.example .env       # fill in OPENAI_API_KEY and NESSIE_API_KEY
uvicorn main:app --host 0.0.0.0 --port 8000
```

**Seed quiz questions (first run only):**
```bash
cd ../game/scam_quiz
python -m app.seed
```

**Seed Nessie fraud data (first run only):**
```
# Option A: open http://localhost:8000/docs → /fraud/seed → Try it out → Execute
# Option B: PowerShell
Invoke-RestMethod -Method POST -Uri http://localhost:8000/fraud/seed
```

---

### 2. Node Server

```bash
cd backend/node-server
npm install
cp .env.example .env
npm start
```

---

### 3. Frontend

```bash
cd frontend
npm install --legacy-peer-deps
# Edit frontend/constants/config.ts — set your local IP
npx expo start
```

Scan the QR code with **Expo Go** (iOS: Camera app · Android: Expo Go app).

> ⚠️ Use your machine's local IP (e.g. `192.168.1.x`), not `localhost`. Your phone needs to reach your computer on the same Wi-Fi.

---

## Configuration

### `frontend/constants/config.ts`

```typescript
export const BASE_URL = "http://192.168.x.x:8000";       // Python backend
export const AUTH_API_BASE = "http://192.168.x.x:4000";  // Node server
```

---

### Python Backend `.env`

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENAI_API_KEY` | ✓ | Whisper STT, GPT-4o Vision OCR, GPT-4o-mini chat, TTS |
| `NESSIE_API_KEY` | ✓ | Capital One Nessie API for fraud DB |

---

### Node Server `.env`

| Variable | Required | Description |
|----------|----------|-------------|
| `MONGODB_URI` | ✓ | MongoDB connection string |
| `JWT_SECRET` | ✓ | Secret for JWT signing |
| `TWILIO_ACCOUNT_SID` | ✓ | Twilio account SID |
| `TWILIO_AUTH_TOKEN` | ✓ | Twilio auth token |
| `TWILIO_VERIFY_SERVICE_SID` | ✓ | Twilio Verify service SID (starts with `VA`) |
| `PORT` | | Default: 4000 |

---

## API Reference

### Python Backend — `localhost:8000`

#### Voicebot & Detection

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check + RAG + model status |
| POST | `/chat` | Text → AI response + TTS. Body: `{ user_message }` |
| POST | `/voice-chat` | Audio → Whisper → AI response + TTS. FormData: `file` |
| POST | `/predict` | Phishing score for text. Body: `{ text }` |
| POST | `/stream/update` | Live phishing score (streaming). Body: `{ session_id, text, is_final? }` |
| POST | `/ocr` | Extract text from screenshot. FormData: `image` |
| POST | `/detect/image` | OCR + phishing score in one call. FormData: `image` |

#### Fraud Scanner (Nessie)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/fraud/check?query=` | Check account number or merchant name for fraud |
| POST | `/fraud/seed` | Seed Nessie with fraud accounts + merchants (run once) |
| GET | `/fraud/accounts` | List all seeded fraud accounts |
| GET | `/fraud/merchants` | List all seeded impersonation merchants |

#### Quiz Game

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/session/start` | Start a new quiz session. Body: `{ user_id }` |
| GET | `/quiz/next?user_id=&session_id=` | Fetch next question + serve token |
| POST | `/quiz/answer` | Submit answer. Body: `{ session_id, question_id, user_answered_phishing, serve_token }` |
| POST | `/session/{id}/end` | End session, return final score + badge |

---

### Node Server — `localhost:4000`

Base path: `/auth`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/otp/send` | — | Send OTP via Twilio. Body: `{ phoneE164 }` |
| POST | `/otp/verify` | — | Verify code, return JWT. Body: `{ phoneE164, code, role }` |
| POST | `/dev-login` | — | Skip OTP for development |
| POST | `/link/create-code` | ✓ | Generate 6-digit link code (10-min expiry) |
| POST | `/link/confirm` | ✓ | Link with another user. Body: `{ code }` |
| POST | `/link/unlink` | ✓ | Unlink guardian |
| GET | `/me` | ✓ | Current user profile + link status |

---

## Project Structure

```
silverguard/
├── frontend/
│   ├── app/
│   │   ├── (tabs)/
│   │   │   ├── home.tsx              # Dashboard — 4 feature cards + Voicebot
│   │   │   ├── protection.tsx        # Live mic → STT → RiskGauge
│   │   │   ├── diagnosis.tsx         # Text / screenshot phishing scan
│   │   │   └── more.tsx              # Settings, guardian, logout
│   │   ├── guardian-hub.tsx          # Link status, alert toggles, contact
│   │   ├── guardian-link.tsx         # Generate + enter 6-digit link code
│   │   ├── guardian-alerts.tsx       # Alert history
│   │   ├── verification.tsx          # Phone OTP login
│   │   ├── training-game.tsx         # Quiz start
│   │   ├── training-play.tsx         # Quiz play (phase-based state machine)
│   │   ├── training-result.tsx       # Score + badge
│   │   ├── transfer-protection.tsx   # Nessie fraud scanner
│   │   └── reporting-chatbot.tsx     # Voicebot chat + voice interface
│   ├── components/
│   │   └── RiskGauge.tsx             # Animated semicircle risk meter
│   └── constants/
│       └── config.ts                 # BASE_URL, AUTH_API_BASE
│
├── backend/
│   ├── voicebot/                     # Python FastAPI server (port 8000)
│   │   ├── main.py                   # Unified server: chat, STT, OCR, TTS
│   │   ├── fraud_router.py           # Nessie fraud scanner + typo detection
│   │   ├── rag_loader.py             # RAG section retrieval for voicebot
│   │   ├── fraud_data.json           # Persistent local cache of Nessie IDs
│   │   ├── section_index.json        # RAG topic routing index
│   │   ├── section_*.txt             # Illinois voice phishing legal guide (8 sections)
│   │   └── requirements.txt
│   │
│   ├── game/scam_quiz/               # Quiz backend (integrated on port 8000)
│   │   └── app/
│   │       ├── models/               # SQLModel: Question, Session, Answer, AnswerCount
│   │       ├── routes/               # quiz.py, session.py
│   │       ├── services/             # quiz_service.py (serve token, load balancing)
│   │       └── seed.py               # 30 phishing scenario seed questions
│   │
│   └── node-server/                  # Express server (port 4000)
│       ├── server.js
│       └── src/
│           ├── routes/auth.js        # OTP send/verify, JWT, guardian link/unlink
│           └── models/User.js        # MongoDB user schema
│
└── README.md
```

---

## Notes

- **Twilio trial accounts** require verifying phone numbers in Twilio Console before OTP delivery works.
- **ffmpeg path on Windows** defaults to `C:\ffmpeg\bin\ffmpeg.exe` in `main.py`. Update if your install path differs.
- **Nessie seed** runs only once — IDs are saved to `fraud_data.json` and reloaded automatically on server startup.
- **Same Wi-Fi** — phone and backend computer must be on the same network when using a local IP address.
- **Expo Go** — no native build required. Run `npx expo start`.
