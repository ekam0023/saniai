import { AppError } from '../errors';

// Simple in-memory token bucket per IP+route. Swap for Redis/Upstash when running multiple instances.
const buckets = new Map<string, { count: number; reset: number }>();

export function rateLimit(req: Request, route: string, limit: number, windowMs = 60_000) {
  const ip = (req.headers.get('x-forwarded-for') || 'local').split(',')[0].trim();
  const key = `${route}:${ip}`;
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.reset < now) {
    buckets.set(key, { count: 1, reset: now + windowMs });
  } else if (++b.count > limit) {
    throw new AppError('Please wait a moment and try again.', 429);
  }
  if (buckets.size > 5000) for (const [k, v] of buckets) if (v.reset < now) buckets.delete(k);
}
