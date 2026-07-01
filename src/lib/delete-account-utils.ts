/**
 * Utilidades puras para el flujo de eliminación de cuenta RGPD.
 *
 * Extraídas de la API route para poder testearlas sin depender de
 * Supabase, Next.js Request/Response ni cookies.
 *
 * Todas las funciones son puras — no tienen efectos secundarios.
 */

import { z } from 'zod'

// ---------------------------------------------------------------------------
// Schema de validación
// ---------------------------------------------------------------------------

/** Schema Zod para validar la contraseña en la solicitud de eliminación. */
export const requestSchema = z.object({
  password: z.string().min(1, 'Debes introducir tu contraseña actual'),
})

// ---------------------------------------------------------------------------
// Expiración del token
// ---------------------------------------------------------------------------

/** Milisegundos de validez del token de eliminación (1 hora). */
export const DELETION_TOKEN_TTL_MS = 3600_000

/**
 * Determina si un token de eliminación ha caducado.
 *
 * @param requestedAtISO - Timestamp ISO 8601 de cuándo se solicitó la eliminación
 * @param nowMs - Timestamp actual en ms (inyectable para testing)
 * @returns true si el token expiró (más de 1 hora)
 */
export function isTokenExpired(
  requestedAtISO: string | null | undefined,
  nowMs: number = Date.now(),
): boolean {
  if (!requestedAtISO) return true
  const requestedAt = new Date(requestedAtISO).getTime()
  // NaN (fecha inválida) → tratarlo como expirado por seguridad
  if (Number.isNaN(requestedAt)) return true
  return requestedAt <= nowMs - DELETION_TOKEN_TTL_MS
}

// ---------------------------------------------------------------------------
// Orden de borrado en cascada (documentado para tests)
// ---------------------------------------------------------------------------

/**
 * Orden de operaciones de borrado en handleConfirmDeletion.
 *
 * Este orden garantiza:
 *   1. Los datos agregados se preservan (analytics se anonimiza, no se borra)
 *   2. El progreso se borra antes que el usuario (FK integrity)
 *   3. El usuario de BD se borra antes que el auth user (si auth falla,
 *      los datos personales ya no existen)
 */
export const CASCADE_DELETION_ORDER = [
  'analytics_events → user_id = null (anonimizar)',
  'user_progress → DELETE',
  'public.users → DELETE',
  'auth.users → DELETE',
] as const
