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