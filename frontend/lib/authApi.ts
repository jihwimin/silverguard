// lib/authApi.ts - Node-server auth & guardian link API
import { AUTH_API_BASE } from "@/constants/config";

function authFetch(path: string, options: RequestInit & { token?: string } = {}) {
  const { token, ...rest } = options;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(rest.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return fetch(`${AUTH_API_BASE}/auth${path}`, { ...rest, headers });
}

/** Convert US phone to E.164 (+1...) */
export function toE164(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("1") && digits.length === 11) return `+${digits}`;
  if (digits.length === 10) return `+1${digits}`;
  return `+1${digits.replace(/^1/, "")}`;
}

export type Role = "senior" | "guardian";

/** Send OTP to phone */
export async function otpSend(phoneE164: string): Promise<{ ok: boolean }> {
  const res = await authFetch("/otp/send", {
    method: "POST",
    body: JSON.stringify({ phoneE164 }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.details || data?.error || "Failed to send OTP";
    throw new Error(msg);
  }
  return data;
}

/** Verify OTP and get JWT */
export async function otpVerify(params: {
  phoneE164: string;
  code: string;
  role: Role;
}): Promise<{ ok: boolean; token: string; user: { userId: string; role: string; phoneE164: string } }> {
  const res = await authFetch("/otp/verify", {
    method: "POST",
    body: JSON.stringify(params),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || "Failed to verify OTP");
  return data;
}

/** Create 6-digit link code (requires auth) */
export async function linkCreateCode(token: string): Promise<{
  ok: boolean;
  code: string;
  expiresAt: string;
}> {
  const res = await authFetch("/link/create-code", { method: "POST", token });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || "Failed to create code");
  return data;
}

/** Confirm link with 6-digit code (requires auth) */
export async function linkConfirm(token: string, code: string): Promise<{
  ok: boolean;
  linked: { me: string; other: string };
}> {
  const res = await authFetch("/link/confirm", {
    method: "POST",
    body: JSON.stringify({ code }),
    token,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || "Failed to link");
  return data;
}

/** Unlink from guardian (requires auth) */
export async function linkUnlink(token: string): Promise<{ ok: boolean }> {
  const res = await authFetch("/link/unlink", { method: "POST", token });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || "Failed to unlink");
  return data;
}

/** Get current user and link status (requires auth) */
export async function getMe(token: string): Promise<{
  ok: boolean;
  userId: string;
  phoneE164: string;
  role: string;
  linkedUserId: string | null;
  linkedUserPhone: string | null;
  linkCode: string | null;
  linkCodeExpiresAt: string | null;
}> {
  const res = await authFetch("/me", { token });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || "Unauthorized");
  return data;
}
