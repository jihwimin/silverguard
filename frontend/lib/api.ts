// frontend/lib/api.ts
import { BASE_DETECTOR_URL } from "@/constants/config";

const API_BASE = BASE_DETECTOR_URL;

export type PredictResult = {
  probability: number;
  percent: number;
  label: "phishing" | "safe";
  severity: "low" | "medium" | "high";
  threshold: number;
  latency_ms: number;
};

export type OCRResult = {
  text: string;
  latency_ms: number;
  model: string;
};

export async function predictText(text: string): Promise<PredictResult> {
  const res = await fetch(`${API_BASE}/predict`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export type STTResult = {
  text: string;
  latency_ms: number;
  model: string;
};

export async function transcribeAudio(uri: string): Promise<STTResult> {
  const form = new FormData();
  form.append("audio", {
    uri,
    name: "audio.wav",
    type: "audio/wav",
  } as any);

  const res = await fetch(`${API_BASE}/stt/chunk`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

/** Send audio chunk for STT (Whisper). Used for live streaming. */
export async function sttChunk(uri: string): Promise<STTResult> {
  const form = new FormData();
  form.append("audio", {
    uri,
    name: "chunk.m4a",
    type: "audio/m4a",
  } as any);
  const res = await fetch(`${API_BASE}/stt/chunk`, {
    method: "POST",
    body: form,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`STT ${res.status}: ${text || res.statusText}`);
  return JSON.parse(text);
}

export type StreamUpdateResult = {
  session_id: string;
  probability: number;
  percent: number;
  label: string;
  severity: string;
  threshold: number;
  latency_ms: number;
  chars: number;
  is_final: boolean;
};

/** Send accumulated transcript to detector; get live phishing percentage. */
export async function streamUpdate(params: {
  session_id: string;
  text: string;
  is_final?: boolean;
}): Promise<StreamUpdateResult> {
  const res = await fetch(`${API_BASE}/stream/update`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      session_id: params.session_id,
      text: params.text,
      is_final: params.is_final ?? false,
    }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function ocrImage(uri: string): Promise<OCRResult> {
  const form = new FormData();
  form.append("image", {
    uri,
    name: "screenshot.jpg",
    type: "image/jpeg",
  } as any);

  const res = await fetch(`${API_BASE}/ocr`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}