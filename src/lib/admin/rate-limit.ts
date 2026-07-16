/** Rate limiting compartido para rutas sensibles y administrativas. */

import { NextResponse } from 'next/server'

const DEFAULT_LIMIT = 30
const DEFAULT_WINDOW_MS = 60_000

export interface RateLimitOptions {
  limit?: number
  windowMs?: number
  namespace?: string
}

interface RateLimitEntry {
  count: number
  resetAt: number
}

const memoryStore = new Map<string, RateLimitEntry>()

function getClientIP(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return request.headers.get('x-real-ip') || 'unknown'
}

function getNamespace(request: Request, custom?: string): string {
  if (custom) return custom
  const url = new URL(request.url)
  return `${request.method.toLowerCase()}:${url.pathname}`
}

function limitedResponse(limit: number, retryAfter: number): NextResponse {
  return NextResponse.json(
    {
      error: 'Demasiadas peticiones. Intenta de nuevo más tarde.',
      retryAfter,
    },
    {
      status: 429,
      headers: {
        'Retry-After': String(retryAfter),
        'X-RateLimit-Limit': String(limit),
        'X-RateLimit-Remaining': '0',
      },
    },
  )
}

function checkMemoryLimit(
  key: string,
  limit: number,
  windowMs: number,
): NextResponse | null {
  const now = Date.now()
  const entry = memoryStore.get(key)

  if (!entry || now >= entry.resetAt) {
    memoryStore.set(key, { count: 1, resetAt: now + windowMs })
    return null
  }

  entry.count += 1
  if (entry.count <= limit) return null

  return limitedResponse(limit, Math.max(1, Math.ceil((entry.resetAt - now) / 1000)))
}

function hasRedisConfig(): boolean {
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL &&
      process.env.UPSTASH_REDIS_REST_TOKEN,
  )
}

async function hashIdentifier(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

/** Fallback síncrono para entornos locales sin Redis. */
export function checkRateLimit(
  request: Request,
  options: RateLimitOptions = {},
): NextResponse | null {
  const limit = options.limit ?? DEFAULT_LIMIT
  const windowMs = options.windowMs ?? DEFAULT_WINDOW_MS
  const key = `${getNamespace(request, options.namespace)}:${getClientIP(request)}`
  return checkMemoryLimit(key, limit, windowMs)
}

/**
 * Usa Upstash Redis en producción para compartir el contador entre instancias.
 * Si Redis no está configurado o falla temporalmente, degrada al límite local.
 */
export async function checkRateLimitAsync(
  request: Request,
  options: RateLimitOptions = {},
): Promise<NextResponse | null> {
  if (!hasRedisConfig()) return checkRateLimit(request, options)

  const limit = options.limit ?? DEFAULT_LIMIT
  const windowMs = options.windowMs ?? DEFAULT_WINDOW_MS
  const namespace = getNamespace(request, options.namespace)

  try {
    const [{ Redis }, identifier] = await Promise.all([
      import('@upstash/redis'),
      hashIdentifier(getClientIP(request)),
    ])
    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
    const key = `rate-limit:${namespace}:${identifier}`
    const script = `
      local count = redis.call('INCR', KEYS[1])
      if count == 1 then redis.call('PEXPIRE', KEYS[1], ARGV[1]) end
      return { count, redis.call('PTTL', KEYS[1]) }
    `
    const [count, ttlMs] = await redis.eval<[string], [number, number]>(
      script,
      [key],
      [String(windowMs)],
    )

    if (count <= limit) return null
    return limitedResponse(limit, Math.max(1, Math.ceil(ttlMs / 1000)))
  } catch (error) {
    console.error('[rate-limit] Redis no disponible; usando fallback local.', error)
    return checkRateLimit(request, options)
  }
}
