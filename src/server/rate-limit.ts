import { HttpError } from "./http";

// In-memory: cukup untuk satu instance (Render free). Ganti dengan Redis bila instance > 1.
const hits = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const entry = hits.get(key);
  if (!entry || entry.resetAt < now) {
    hits.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }
  entry.count += 1;
  if (entry.count > limit) {
    throw new HttpError(429, "Terlalu banyak percobaan. Coba lagi beberapa menit lagi.");
  }
}

export function resetRateLimit(key: string) {
  hits.delete(key);
}
