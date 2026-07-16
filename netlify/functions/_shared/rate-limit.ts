import { HttpError } from "./http";

interface Bucket {
  count: number;
  resetAt: number;
}
const buckets = new Map<string, Bucket>();

export function enforceRateLimit(key: string, limit = 10, windowMs = 15 * 60_000): void {
  const now = Date.now();
  const current = buckets.get(key);
  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }
  current.count += 1;
  if (current.count > limit) throw new HttpError(429, "Too many attempts. Try again later.");
}

export function clearRateLimit(key: string): void {
  buckets.delete(key);
}
