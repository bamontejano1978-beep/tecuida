/**
 * Helpers para gestión de actividades + profesionales desde el panel admin.
 *
 * Diseño:
 *   - Centraliza verificación de tenant (no llamar a assertTenantAllowed throws Response).
 *   - Centraliza la transacción atómica de plazas (UPDATE con WHERE-check atómico,
 *     no lectura+update, evita race condition entre usuarios concurrentes).
 *   - Devuelve helpers tipados para que las API routes y Server Components
 *     reutilicen sin repetir SQL/JS.
 *
 * ⚠️  Atomicidad (corregida tras code review):
 *   La regla "plazas_inscritas <= aforo" se aplica en UN SOLO UPDATE atómico:
 *     UPDATE activities
 *       SET plazas_inscritas = plazas_inscritas + 1
 *     WHERE id = ? AND estado = 'publicada'
 *       AND (aforo IS NULL OR plazas_inscritas < aforo)
 *     RETURNING plazas_inscritas;
 *   Si el WHERE no se cumple (no hay plazas o no está publicada), RETURNING
 *   devuelve 0 filas y rechazamos la inscripción con un error claro.
 *
 * Patrón: como las inserciones/updates con service_role bypasean RLS, la
 * barrera de seguridad recae en `verifyTenantAccess()` y `getAdminAccess()`,
 * análogo al patrón existente en /api/admin/*.
 */

import { createAdminClient, createClient } from '@/lib/supabase/server'
import type { ActivityWithRelations, Professional } from '@/types'

// ─────────────────────────────────────────────────────────────────────────
// Verificación de acceso
// ─────────────────────────────────────────────────────────────────────────

export interface AdminAccess {
  is_superadmin: boolean
  user_id: string
  email: string
  municipality_id: string | null
}

export type TenantCheckResult =
  | { ok: true }
  | { ok: false; reason: string }

/**
 * Lee auth + rol + tenant del usuario actual. Null si no autorizado.
 */
export async function getAdminAccess(
  options: { superadminOnly?: boolean } = {},
): Promise<AdminAccess | null> {
  const serverClient = createClient()
  const { data: userResp } = await serverClient.auth.getUser()
  const user = userResp?.user
  if (!user) return null

  const admin = createAdminClient()
  const { data: row } = await admin
    .from('users')
    .select('email, rol, municipality_id')
    .eq('id', user.id)
    .maybeSingle()

  if (!row) return null
  if (row.rol !== 'superadmin' && row.rol !== 'admin_municipio') return null
  if (options.superadminOnly && row.rol !== 'superadmin') return null

  return {
    is_superadmin: row.rol === 'superadmin',
    user_id: user.id,
    email: (row.email as string) ?? user.email ?? '',
    municipality_id: (row.municipality_id as string | null) ?? null,
  }
}

/**
 * Verifica que el admin pueda actuar sobre el tenant de la fila.
 * Devuelve discriminated union: { ok: true } o { ok: false, reason }.
 * Sustituye al anterior throws-Response.
 */
export function checkTenantAccess(
  access: AdminAccess,
  targetMunicipalityId: string,
): TenantCheckResult {
  if (access.is_superadmin) return { ok: true }
  if (access.municipality_id === targetMunicipalityId) return { ok: true }
  return { ok: false, reason: 'Acceso denegado a este municipio.' }
}

// ─────────────────────────────────────────────────────────────────────────
// Helpers de respuesta (no usan throws Response)
// ─────────────────────────────────────────────────────────────────────────

export function errorResponse(
  status: number,
  message: string,
  suggestion?: string,
): Response {
  return new Response(JSON.stringify({ error: message, suggestion }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

export const badRequest = (msg: string, suggestion?: string) => errorResponse(400, msg, suggestion)
export const notFound = (msg = 'Recurso no encontrado') => errorResponse(404, msg)
export const serverError = (msg = 'Error interno') => errorResponse(500, msg)
export const unauthorized = (msg = 'No autorizado') => errorResponse(401, msg)
export const forbidden = (msg = 'Acceso denegado') => errorResponse(403, msg)

// ─────────────────────────────────────────────────────────────────────────
// Listados (admin)
// ─────────────────────────────────────────────────────────────────────────

export interface ActivityListFilter {
  estado?: string
  categoria_id?: string
  q?: string
  destacada?: boolean
  professional_id?: string
  limit?: number
  offset?: number
}

export async function listActivitiesAdmin(
  access: AdminAccess,
  filter: ActivityListFilter = {},
): Promise<{ rows: ActivityWithRelations[]; total: number }> {
  const admin = createAdminClient()
  let query = admin
    .from('activities')
    .select(
      `*,
       professional:professionals(*),
       categoria:categories(id, nombre, icono_url)`,
      { count: 'exact' },
    )
    .order('fecha_inicio', { ascending: true })

  if (!access.is_superadmin && access.municipality_id) {
    query = query.eq('municipality_id', access.municipality_id)
  }

  if (filter.estado) query = query.eq('estado', filter.estado)
  if (filter.categoria_id) query = query.eq('category_id', filter.categoria_id)
  if (filter.destacada) query = query.eq('destacada', true)
  if (filter.professional_id) query = query.eq('professional_id', filter.professional_id)
  if (filter.q) query = query.ilike('nombre', `%${filter.q}%`)

  const limit = Math.min(Math.max(filter.limit ?? 50, 1), 100)
  const offset = Math.max(filter.offset ?? 0, 0)
  query = query.range(offset, offset + limit - 1)

  const { data, error, count } = await query
  if (error) throw error
  return {
    rows: (data || []) as unknown as ActivityWithRelations[],
    total: count ?? (data?.length ?? 0),
  }
}

export async function getActivityAdmin(
  id: string,
): Promise<ActivityWithRelations | null> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('activities')
    .select(
      `*,
       professional:professionals(*),
       categoria:categories(id, nombre, icono_url)`,
    )
    .eq('id', id)
    .maybeSingle()
  return (data || null) as unknown as ActivityWithRelations | null
}

export async function listProfessionalsAdmin(
  access: AdminAccess,
): Promise<Professional[]> {
  const admin = createAdminClient()
  let query = admin
    .from('professionals')
    .select('*')
    .order('nombre', { ascending: true })
  if (!access.is_superadmin && access.municipality_id) {
    query = query.eq('municipality_id', access.municipality_id)
  }
  const { data, error } = await query
  if (error) throw error
  return (data || []) as unknown as Professional[]
}

// ─────────────────────────────────────────────────────────────────────────
// Inscripción pública: thin-wrappers sobre los RPCs atómicos (migration 044)
// ─────────────────────────────────────────────────────────────────────────
//
// ⚠️  Atomicidad (corregida tras code review):
//   Las funciones reales viven en `public.inscribir_actividad()` y
//   `public.cancelar_inscripcion_atomic()` (migration 044, plpgsql
//   SECURITY DEFINER). El UPDATE del contador + INSERT/UPDATE de la
//   inscripción ocurren en una sola transacción: RAISE EXCEPTION => ROLLBACK.
//   Esto cierra las dos race windows que existían en la implementación
//   TS previa:
//     (a) plazas_inscritas consumida sin inscripción (ghost plaza)
//     (b) plazas_inscritas sobre-contada por UNIQUE INDEX tras INSERT
//
//   Defense in depth:
//     - API route valida auth + Zod + tenant_match antes de llamar al RPC.
//     - El RPC re-valida auth.uid() + users.municipality_id + email match.
//     - SECURITY DEFINER evita RLS sobre activities.plazas_inscritas
//       (no hay policy de UPDATE para ciudadanos sobre esa tabla).
//
//   Errores del RPC llegan como `error.message` con prefijo INSC_*;
//   traduciéndolos aquí a mensajes user-friendly en español.
// ─────────────────────────────────────────────────────────────────────────

/** Códigos de error que `public.inscribir_actividad` puede levantar */
export type InscriptionRpcError =
  | 'INSC_NO_AUTH'
  | 'INSC_NO_PROFILE'
  | 'INSC_EMAIL_MISMATCH'
  | 'INSC_NOT_FOUND'
  | 'INSC_CROSS_TENANT'
  | 'INSC_NOT_PUBLISHED'
  | 'INSC_FULL'
  | 'INSC_DUPLICATE'

/** Códigos de error que `public.cancelar_inscripcion_atomic` puede levantar */
export type CancelInscriptionRpcError =
  | 'INSC_NO_AUTH'
  | 'INSC_ALREADY_CANCELLED'
  | 'INSC_NOT_INSCRIBED'

export interface InscriptionResult {
  inscription_id: string
  plazas_inscritas_actualizadas: number
  estado: 'confirmada'
  /** True si la inscripción ya estaba activa (idempotente, no contó plaza) */
  was_duplicate: boolean
  /** True si reactivó una inscripción cancelada previa y reservó plaza de nuevo */
  was_reactivation: boolean
}

/** Traduce el mensaje de error del RPC a uno entendible por el ciudadano */
function translateInscriptionError(
  rpcMessage: string,
): { code: string; userMessage: string } {
  switch (rpcMessage) {
    case 'INSC_NO_AUTH':
      return {
        code: 'INSC_NO_AUTH',
        userMessage: 'Debes iniciar sesión para inscribirte.',
      }
    case 'INSC_NO_PROFILE':
      return {
        code: 'INSC_NO_PROFILE',
        userMessage: 'Tu usuario no está dado de alta en este municipio.',
      }
    case 'INSC_EMAIL_MISMATCH':
      return {
        code: 'INSC_EMAIL_MISMATCH',
        userMessage: 'El email no coincide con tu sesión.',
      }
    case 'INSC_NOT_FOUND':
      return {
        code: 'INSC_NOT_FOUND',
        userMessage: 'La actividad ya no está disponible.',
      }
    case 'INSC_CROSS_TENANT':
      return {
        code: 'INSC_CROSS_TENANT',
        userMessage: 'Esta actividad pertenece a otro municipio.',
      }
    case 'INSC_NOT_PUBLISHED':
      return {
        code: 'INSC_NOT_PUBLISHED',
        userMessage: 'Esta actividad no acepta nuevas inscripciones.',
      }
    case 'INSC_FULL':
      return {
        code: 'INSC_FULL',
        userMessage: 'No quedan plazas en esta actividad.',
      }
    case 'INSC_DUPLICATE':
      return {
        code: 'INSC_DUPLICATE',
        userMessage: 'Ya estás inscrito en esta actividad.',
      }
    case 'INSC_ALREADY_CANCELLED':
      return {
        code: 'INSC_ALREADY_CANCELLED',
        userMessage: 'La inscripción ya estaba cancelada.',
      }
    case 'INSC_NOT_INSCRIBED':
      return {
        code: 'INSC_NOT_INSCRIBED',
        userMessage: 'No estás inscrito en esta actividad.',
      }
    default:
      // Cualquier otro error inesperado: lo loggeamos y devolvemos mensaje genérico.
      return {
        code: 'INSC_UNKNOWN',
        userMessage: 'No se pudo inscribir. Inténtalo de nuevo.',
      }
  }
}

/**
 * Inscribe al usuario actual llamando al RPC `public.inscribir_actividad()`.
 *
 * El RPC es la fuente de verdad: usa `auth.uid()` internamente, valida
 * tenant match + email match + estado + aforo y ejecuta UPDATE + INSERT
 * en una sola transacción. Si falla, RAISE EXCEPTION => ROLLBACK automático.
 *
 * @throws Error con `.code = 'INSC_*'` y mensaje user-friendly.
 */
export async function inscribeUserAtomic(
  activityId: string,
  email: string,
  nombre: string | null,
  notas?: string | null,
): Promise<InscriptionResult> {
  const admin = createAdminClient()
  const { data, error } = await admin.rpc('inscribir_actividad', {
    p_activity_id: activityId,
    p_email: email,
    p_nombre: nombre ?? null,
    p_notas: notas ?? null,
  })

  if (error) {
    // Supabase envuelve la excepción plpgsql en `error.message` con el texto
    // literal (p.ej. "INSC_FULL"). A veces lo antepone "function ...: INSC_FULL".
    const translated = translateInscriptionError(extractRpcCode(error.message))
    const err = Object.assign(new Error(translated.userMessage), {
      code: translated.code,
      rpcMessage: error.message,
    })
    throw err
  }

  const row = (data ?? {}) as {
    inscription_id?: string
    plazas_inscritas?: number
    was_duplicate?: boolean
    was_reactivation?: boolean
  }
  if (!row.inscription_id || typeof row.plazas_inscritas !== 'number') {
    const err = Object.assign(
      new Error('Respuesta inesperada del servidor al inscribir.'),
      { code: 'INSC_UNKNOWN' },
    )
    throw err
  }

  return {
    inscription_id: row.inscription_id,
    plazas_inscritas_actualizadas: row.plazas_inscritas,
    estado: 'confirmada',
    was_duplicate: Boolean(row.was_duplicate),
    was_reactivation: Boolean(row.was_reactivation),
  }
}

/** Extrae el código INSC_* de un mensaje que viene del RPC */
function extractRpcCode(message: string): string {
  const match = /INSC_[A-Z_]+/.exec(message)
  return match ? match[0] : message
}

/**
 * Cancela la inscripción activa del usuario actual llamando al RPC
 * `public.cancelar_inscripcion_atomic()`. Marca cancelada + decrementa
 * plazas_inscritas con GREATEST(0, n-1) en una sola transacción.
 *
 * @throws Error con `.code = 'INSC_*'` y mensaje user-friendly.
 */
export async function cancelInscriptionAtomic(
  activityId: string,
): Promise<{ inscripcion_cancelada: true; plazas: number }> {
  const admin = createAdminClient()
  const { data, error } = await admin.rpc('cancelar_inscripcion_atomic', {
    p_activity_id: activityId,
  })

  if (error) {
    const translated = translateInscriptionError(extractRpcCode(error.message))
    const err = Object.assign(new Error(translated.userMessage), {
      code: translated.code,
    })
    throw err
  }

  const row = (data ?? {}) as { plazas_inscritas?: number }
  return {
    inscripcion_cancelada: true,
    plazas: typeof row.plazas_inscritas === 'number' ? row.plazas_inscritas : 0,
  }
}
