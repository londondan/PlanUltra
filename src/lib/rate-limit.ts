// Simple in-memory rate limiter. Resets per deployment instance, not per hour
// across restarts — acceptable for anonymous plan creation abuse prevention.

interface Bucket {
  count: number
  resetAt: number
}

const store = new Map<string, Bucket>()

export function checkRateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now()
  const bucket = store.get(key)

  if (!bucket || now > bucket.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }

  if (bucket.count >= limit) return false

  bucket.count++
  return true
}
