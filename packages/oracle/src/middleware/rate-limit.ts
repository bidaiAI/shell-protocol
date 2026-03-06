import type { Context } from 'hono'

/**
 * Simple in-memory rate limiter middleware for Hono.
 * Uses a sliding window counter per IP address.
 *
 * For production with multiple instances, replace with Redis-backed limiter.
 */

interface RateLimitOptions {
  windowMs: number  // Time window in milliseconds
  max: number       // Max requests per window
}

interface WindowEntry {
  count: number
  resetAt: number
}

export function rateLimiter(opts: RateLimitOptions) {
  const { windowMs, max } = opts
  const store = new Map<string, WindowEntry>()

  // Periodic cleanup to prevent memory leak
  setInterval(() => {
    const now = Date.now()
    for (const [key, entry] of store) {
      if (entry.resetAt < now) store.delete(key)
    }
  }, windowMs * 2).unref()

  return async (c: Context, next: () => Promise<void>) => {
    const ip = c.req.header('x-forwarded-for')?.split(',')[0]?.trim()
      || c.req.header('x-real-ip')
      || 'unknown'

    const now = Date.now()
    const entry = store.get(ip)

    if (!entry || entry.resetAt < now) {
      store.set(ip, { count: 1, resetAt: now + windowMs })
      c.header('X-RateLimit-Limit', String(max))
      c.header('X-RateLimit-Remaining', String(max - 1))
      await next()
      return
    }

    entry.count++

    if (entry.count > max) {
      c.header('X-RateLimit-Limit', String(max))
      c.header('X-RateLimit-Remaining', '0')
      c.header('Retry-After', String(Math.ceil((entry.resetAt - now) / 1000)))
      return c.json({ error: 'Too many requests' }, 429)
    }

    c.header('X-RateLimit-Limit', String(max))
    c.header('X-RateLimit-Remaining', String(max - entry.count))
    await next()
  }
}
