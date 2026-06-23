/**
 * Construcción manual de cookies de sesión de Supabase.
 *
 * @supabase/ssr v0.3+ NO persiste cookies tras signInWithPassword()
 * ni signUp() — solo exchangeCodeForSession() (flujo OAuth) lo hace.
 *
 * Este helper construye las cookies directamente desde los datos
 * de la sesión, usando el formato EXACTO que @supabase/ssr v0.3+
 * espera:
 *   - Valor: JSON.stringify(session) — JSON crudo sin base64.
 *     @supabase/auth-js (getItemAsync → JSON.parse) lo parsea
 *     directamente; un prefijo "base64-" rompería el parseo.
 *   - Chunking seguro a 3180 chars (mismo umbral que createChunks).
 *     Usa encodeURIComponent / decodeURIComponent para no partir
 *     secuencias %XX en los límites de chunk.
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
 * exacto que @supabase/ssr v0.3+ espera:
 *
 *   - Caso común (≤ 3180 chars): 1 cookie con el JSON crudo.
 *   - Sesiones grandes: chunking con encodeURIComponent para
 *     preservar integridad de caracteres multi-byte en los límites.
 *
 * combineChunks (lectura) recupera los chunks, los une sin
 * decodificar y getItemAsync (auth-js) los parsea con JSON.parse.
 */
export function buildAuthCookies(session: Session): AuthCookie[] {
  const projectRef = getProjectRef()
  const baseName = `sb-${projectRef}-auth-token`

  const json = JSON.stringify(session)
  const cookies: AuthCookie[] = []

  // Caso común: la sesión cabe en un solo chunk.
  // createChunks de @supabase/ssr guarda el valor crudo sin encodear.
  if (json.length <= CHUNK_SIZE) {
    cookies.push({ name: baseName, value: json, options: AUTH_COOKIE_OPTIONS })
    return cookies
  }

  // Caso poco frecuente: sesión grande → chunking seguro.
  // Replicamos la lógica de createChunks:
  //   1. encodeURIComponent para manipulación segura de límites
  //   2. slice evitando partir secuencias %XX
  //   3. decodeURIComponent de cada slice → valor almacenado
  const encoded = encodeURIComponent(json)
  let offset = 0
  let chunkIndex = 0

  while (offset < encoded.length) {
    let end = Math.min(offset + CHUNK_SIZE, encoded.length)

    // No partir en medio de una secuencia %XX.
    // lastIndexOf con fromIndex inclusivo; usamos end-1 porque
    // slice(offset, end) es exclusivo en 'end'.
    if (end < encoded.length) {
      const lastPercent = encoded.lastIndexOf('%', end - 1)
      if (lastPercent > end - 3) {
        // Retroceder hasta antes del %XX incompleto
        end = lastPercent
      }
    }

    const encodedChunk = encoded.slice(offset, end)
    const decodedChunk = decodeURIComponent(encodedChunk)
    const name = `${baseName}.${chunkIndex}`

    cookies.push({ name, value: decodedChunk, options: AUTH_COOKIE_OPTIONS })

    offset = end
    chunkIndex++
  }

  return cookies
}
