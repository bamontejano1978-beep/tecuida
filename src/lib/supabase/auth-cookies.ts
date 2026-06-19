/**
 * Construcción manual de cookies de sesión de Supabase.
 *
 * @supabase/ssr v0.3+ NO persiste cookies tras signInWithPassword()
 * ni signUp() — solo exchangeCodeForSession() (flujo OAuth) lo hace.
 *
 * Este helper construye las cookies directamente desde los datos
 * de la sesión, usando el formato EXACTO que combineChunks espera:
 *   - Valor: "base64-" + base64(JSON.stringify(session))
 *   - Chunking a 3180 chars (mismo umbral que @supabase/ssr)
 *   - Nombres: sb-<project-ref>-auth-token[.0, .1, ...]
 */

import type { Session } from '@supabase/supabase-js'

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------

/** Tamaño máximo de chunk (mismo que @supabase/ssr) */
const CHUNK_SIZE = 3180

/** Cookie options estándar */
const AUTH_COOKIE_OPTIONS = {
  path: '/',
  httpOnly: false,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 60 * 60 * 24 * 365,
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Extrae el project ref del SUPABASE_URL (subdominio antes de .supabase.co) */
function getProjectRef(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  if (!url) return 'unknown'
  try {
    return new URL(url).hostname.split('.')[0]
  } catch {
    return 'unknown'
  }
}

// ---------------------------------------------------------------------------
// API pública
// ---------------------------------------------------------------------------

export interface AuthCookie {
  name: string
  value: string
  options: typeof AUTH_COOKIE_OPTIONS
}

/**
 * Construye la(s) cookie(s) de sesión de Supabase con el formato
 * exacto que combineChunks espera:
 *   "base64-" + base64(JSON.stringify(session))
 *
 * Aplica chunking si la cookie excede CHUNK_SIZE (3180 chars).
 */
export function buildAuthCookies(session: Session): AuthCookie[] {
  const projectRef = getProjectRef()
  const baseName = `sb-${projectRef}-auth-token`

  // Formato: "base64-" + base64(JSON.stringify(session))
  const json = JSON.stringify(session)
  const encoded = `base64-${Buffer.from(json, 'utf8').toString('base64')}`

  // Chunking
  const cookies: AuthCookie[] = []
  const totalChunks = Math.ceil(encoded.length / CHUNK_SIZE)

  for (let i = 0; i < totalChunks; i++) {
    const chunk = encoded.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE)
    const name = totalChunks > 1 ? `${baseName}.${i}` : baseName
    cookies.push({ name, value: chunk, options: AUTH_COOKIE_OPTIONS })
  }

  return cookies
}
