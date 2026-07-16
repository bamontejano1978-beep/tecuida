/**
 * /api/activities/[id]/inscription
 *
 * - POST   → Inscribir al usuario actual en la actividad (vía RPC atómico 044)
 * - DELETE → Cancelar la inscripción activa del usuario actual (vía RPC atómico 044)
 *
 * 🔒 Defensas (en profundidad):
 *   1. Auth + rate-limit a nivel de API.
 *   2. Zod valida el body (email + nombre? + notas?).
 *   3. La API comprueba auth + tenant match en application layer
 *      (rápida, evita RPC si obviamente no aplica).
 *   4. El RPC re-valida TODO en DB (auth.uid() + users.municipality_id +
 *      email match + estado + aforo) en una transacción: RAISE => ROLLBACK.
 *
 *   Defense in depth significa: el cliente puede confiar en el éxito del
 *   201/200; cualquier 4xx tiene un mensaje user-friendly mapeado desde el
 *   código INSC_* del RPC.
 */

import { createClient } from '@/lib/supabase/server'
import {
  getActivityAdmin,
  inscribeUserAtomic,
  cancelInscriptionAtomic,
  badRequest,
  notFound,
  serverError,
  unauthorized,
} from '@/lib/admin/activities'
import { checkRateLimitAsync } from '@/lib/admin/rate-limit'
import { InscriptionSchema } from '@/lib/validations/activity'

interface Ctx {
  params: { id: string }
}

/** Mapa código INSC_* → status HTTP (defense in depth a nivel API) */
function statusFromRpcError(code: string | undefined): number {
  switch (code) {
    case 'INSC_NO_AUTH':
      return 401
    case 'INSC_NO_PROFILE':
    case 'INSC_CROSS_TENANT':
      return 403
    case 'INSC_NOT_FOUND':
    case 'INSC_NOT_INSCRIBED':
      return 404
    case 'INSC_DUPLICATE':
      return 409
    case 'INSC_EMAIL_MISMATCH':
    case 'INSC_NOT_PUBLISHED':
    case 'INSC_FULL':
    case 'INSC_ALREADY_CANCELLED':
      return 400
    default:
      return 500
  }
}

export async function POST(request: Request, { params }: Ctx) {
  const rate = await checkRateLimitAsync(request)
  if (rate) return rate

  // 1. Autenticación + tenant match en application layer (rápidos)
  const srv = createClient()
  const { data: authData } = await srv.auth.getUser()
  const u = authData?.user
  if (!u) return unauthorized('Debes iniciar sesión para inscribirte.')

  const activity = await getActivityAdmin(params.id)
  if (!activity) return notFound('Actividad no encontrada.')

  // 2. Zod body + email match (defense in depth — el RPC también lo valida)
  let body: unknown = {}
  try {
    body = await request.json()
  } catch {
    body = {}
  }
  const parsed = InscriptionSchema.safeParse(body)
  if (!parsed.success) {
    return badRequest(
      'Datos inválidos.',
      parsed.error.issues
        .map((i) => `${i.path.join('.')}: ${i.message}`)
        .join('; '),
    )
  }
  const { email, nombre, notas } = parsed.data
  if (email.toLowerCase() !== (u.email ?? '').toLowerCase()) {
    return badRequest('El email no coincide con tu sesión.')
  }

  // 3. Inscripción atómica vía RPC. El RPC es la fuente de verdad:
  //    valida tenant, estado, aforo, e INSERT/UPDATE en una sola transacción.
  try {
    const result = await inscribeUserAtomic(
      params.id,
      email,
      nombre ?? null,
      notas ?? null,
    )
    return new Response(
      JSON.stringify({
        ok: true,
        inscription_id: result.inscription_id,
        plazas: result.plazas_inscritas_actualizadas,
        was_duplicate: result.was_duplicate,
        was_reactivation: result.was_reactivation,
      }),
      { status: 201, headers: { 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    const code = (err as { code?: string }).code
    const message = err instanceof Error ? err.message : 'Error inesperado'
    if (code && code.startsWith('INSC_')) {
      const status = statusFromRpcError(code)
      return new Response(JSON.stringify({ error: message, code }), {
        status,
        headers: { 'Content-Type': 'application/json' },
      })
    }
    console.error('[api/activities/[id]/inscription POST]', err)
    return serverError('No se pudo inscribir.')
  }
}

export async function DELETE(request: Request, { params }: Ctx) {
  const rate = await checkRateLimitAsync(request)
  if (rate) return rate

  const srv = createClient()
  const { data: authData } = await srv.auth.getUser()
  const u = authData?.user
  if (!u) return unauthorized('Debes iniciar sesión.')

  // Carga muy ligera: la verificación real de tenant la hace el RPC.
  const activity = await getActivityAdmin(params.id)
  if (!activity) return notFound('Actividad no encontrada.')

  try {
    const result = await cancelInscriptionAtomic(params.id)
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    const code = (err as { code?: string }).code
    const message = err instanceof Error ? err.message : 'Error inesperado'
    if (code && code.startsWith('INSC_')) {
      const status = statusFromRpcError(code)
      return new Response(JSON.stringify({ error: message, code }), {
        status,
        headers: { 'Content-Type': 'application/json' },
      })
    }
    console.error('[api/activities/[id]/inscription DELETE]', err)
    return serverError('No se pudo cancelar.')
  }
}
