/**
 * Store for phishing result passed from notification deep link.
 * Used because router params may not flow reliably to nested (tabs) routes.
 */
let pending: { text: string; percent: number } | null = null;

export function setPendingPhishing(data: { text: string; percent: number }) {
  pending = data;
}

export function consumePendingPhishing(): { text: string; percent: number } | null {
  const p = pending;
  pending = null;
  return p;
}
