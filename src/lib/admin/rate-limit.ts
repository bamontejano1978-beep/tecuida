/**
 * Rate Limiter — Protección de APIs admin
 *
 * Limitador en memoria basado en IP. Cada IP tiene un bucket
 * de tokens que se consume con cada petición.
 *
 * Configuración:
 *   - 30 peticiones por minuto por IP
 *   - Se limpia automáticamente cada 5 minutos
 *
 * Requisitos: 13.4
 */

import { NextResponse } from 'next/server'

// ---------------------------------------------------------------------------
// Configuración
// ---------------------------------------------------------------------------

const MAX_REQUESTS = 30 // peticiones por minuto por IP
const WINDOW_MS = 60 * 1000 // ventana de 1 minuto
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000 // limpiar cada 5 min

// ---------------------------------------------------------------------------
// Estado en memoria
// ---------------------------------------------------------------------------

interface RateLimitEntry {
  count: number
  resetAt: number
}

const store = new Map<string, RateLimitEntry>()

// Limpieza periódica de entradas expiradas
let cleanupTimer: ReturnType<typeof setInterval> | null = null

function startCleanup() {
  if (cleanupTimer) return
  cleanupTimer = setInterval(() => {
    const now = Date.now()
    const keysToDelete: string[] = []
    store.forEach((entry, key) => {
      if (now > entry.resetAt) {
        keysToDelete.push(key)
      }
    })
    keysToDelete.forEach((key) => store.delete(key))
  }, CLEANUP_INTERVAL_MS)

  // Permitir que el timer no bloquee el proceso
  if (cleanupTimer && 'unref' in cleanupTimer) {
    cleanupTimer.unref()
  }
}

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

/**
 * Extrae la IP del cliente desde los headers de la request.
 *
 * Prioriza X-Forwarded-For (Vercel, proxies) y fallback a la IP directa.
 */
function getClientIP(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  const realIp = request.headers.get('x-real-ip')
  if (realIp) return realIp
  return 'unknown'
}

// ---------------------------------------------------------------------------
// Middleware de rate limiting
// ---------------------------------------------------------------------------

/**
 * Verifica si una petición excede el límite de tasa.
 *
 * @param request - La petición entrante
 * @returns NextResponse 429 si excede el límite, o null si está OK
 */
export function checkRateLimit(request: Request): NextResponse | null {
  startCleanup()

  const ip = getClientIP(request)
  const now = Date.now()
  const entry = store.get(ip)

  // Primera petición de esta IP en la ventana actual
  if (!entry || now > entry.resetAt) {
    store.set(ip, { count: 1, resetAt: now + WINDOW_MS })
    return null
  }

  // Incrementar contador
  entry.count++

  // Verificar límite
  if (entry.count > MAX_REQUESTS) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000)
    return NextResponse.json(
      {
        error: 'Demasiadas peticiones. Intenta de nuevo más tarde.',
        retryAfter,
      },
      {
        status: 429,
        headers: { 'Retry-After': String(retryAfter) },
      },
    )
  }

  return null
}

/**
 * Versión asíncrona para usar en API routes.
 *
 * @example
 * ```ts
 * export async function GET(request: Request) {
 *   const rateLimitResponse = await checkRateLimitAsync(request)
 *   if (rateLimitResponse) return rateLimitResponse
 *   // ... lógica normal
 * }
 * ```
 */
export async function checkRateLimitAsync(
  request: Request,
): Promise<NextResponse | null> {
  return checkRateLimit(request)
}
