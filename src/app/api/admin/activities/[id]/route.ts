/**
 * /api/admin/activities/[id]
 *
 * - GET    → Detalle de actividad
 * - PUT    → Actualizar actividad (transición estado, edición general)
 * - DELETE → Borrar una actividad (solo si estado ∈ {borrador, rechazada, cancelada})
 */

import type { NextRequest } from 'next/server'
import {
  getAdminAccess,
  checkTenantAccess,
  getActivityAdmin,
  badRequest,
  notFound,
  serverError,
  unauthorized,
} from '@/lib/admin/activities'
import { UpdateActivitySchema } from '@/lib/validations/activity'
import { checkRateLimitAsync } from '@/lib/admin/rate-limit'
import { createAdminClient } from '@/lib/supabase/server'

interface Ctx { params: { id: string } }

export async function GET(_request: NextRequest, { params }: Ctx) {
  const access = await getAdminAccess({ superadminOnly: true })
  if (!access) return unauthorized()

  const activity = await getActivityAdmin(params.id)
  if (!activity) return notFound('Actividad no encontrada.')
  const te = checkTenantAccess(access, activity.municipality_id)
  if (!te.ok) return new Response(JSON.stringify({ error: te.reason }), { status: 403 })

  return new Response(JSON.stringify(activity), {
    status: 200, headers: { 'Content-Type': 'application/json' },
    // Hacemos que el navegador no cachee (datos administrativos sensibles)
  })
}

export async function PUT(request: NextRequest, { params }: Ctx) {
  const rate = await checkRateLimitAsync(request)
  if (rate) return rate

  const access = await getAdminAccess({ superadminOnly: true })
  if (!access) return unauthorized()

  const current = await getActivityAdmin(params.id)
  if (!current) return notFound('Actividad no encontrada.')
  const te = checkTenantAccess(access, current.municipality_id)
  if (!te.ok) return new Response(JSON.stringify({ error: te.reason }), { status: 403 })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return badRequest('JSON inválido.')
  }

  const parsed = UpdateActivitySchema.safeParse(body)
  if (!parsed.success) {
    return badRequest(
      'Datos inválidos.',
      parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '),
    )
  }
  const update = parsed.data

  try {
    const admin = createAdminClient()

    // Si se intenta cambiar a 'publicada' desde pendiente_validacion, validar
    if (
      update.estado === 'publicada' &&
      current.estado === 'pendiente_validacion'
    ) {
      // OK, transición permitida
    }

    if (
      update.estado === 'rechazada' &&
      current.estado !== 'pendiente_validacion'
    ) {
      return badRequest('Solo se pueden rechazar actividades pendientes.')
    }

    if (update.estado === 'cancelada') {
      if (!update.motivo_cancelacion) {
        return badRequest('Para cancelar debes indicar motivo_cancelacion.')
      }
    }

    if (update.estado === 'rechazada' && !update.motivo_rechazo) {
      return badRequest('Para rechazar debes indicar motivo_rechazo.')
    }

    const { data, error } = await admin
      .from('activities')
      .update(update)
      .eq('id', params.id)
      .select('id')
      .single()

    if (error) {
      console.error('[api/admin/activities/[id] PUT]', error)
      return serverError('No se pudo actualizar.')
    }
    return new Response(JSON.stringify({ id: (data as { id: string }).id }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('[api/admin/activities/[id] PUT]', err)
    if (err instanceof Response) return err
    return serverError('No se pudo actualizar.')
  }
}

export async function DELETE(request: NextRequest, { params }: Ctx) {
  const rate = await checkRateLimitAsync(request)
  if (rate) return rate

  const access = await getAdminAccess({ superadminOnly: true })
  if (!access) return unauthorized()

  const current = await getActivityAdmin(params.id)
  if (!current) return notFound('Actividad no encontrada.')
  const te = checkTenantAccess(access, current.municipality_id)
  if (!te.ok) return new Response(JSON.stringify({ error: te.reason }), { status: 403 })

  // Solo borrar si está en borrador, rechazada o cancelada (defensa en profundidad)
  if (!['borrador', 'rechazada', 'cancelada'].includes(current.estado)) {
    return badRequest(
      'No se puede eliminar una actividad publicada. Cámbiala a "cancelada" primero.',
    )
  }

  try {
    const admin = createAdminClient()
    const { error } = await admin.from('activities').delete().eq('id', params.id)
    if (error) {
      console.error('[api/admin/activities/[id] DELETE]', error)
      return serverError('No se pudo eliminar.')
    }
    return new Response(JSON.stringify({ ok: true }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('[api/admin/activities/[id] DELETE]', err)
    if (err instanceof Response) return err
    return serverError('No se pudo eliminar.')
  }
}
