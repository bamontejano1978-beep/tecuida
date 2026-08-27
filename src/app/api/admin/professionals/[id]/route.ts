/**
 * /api/admin/professionals/[id]
 * GET, PUT, DELETE con verificación de tenant.
 */

import type { NextRequest } from 'next/server'
import {
  getAdminAccess,
  checkTenantAccess,
  badRequest,
  notFound,
  serverError,
  unauthorized,
  forbidden,
} from '@/lib/admin/activities'
import { UpdateProfessionalSchema } from '@/lib/validations/activity'
import { checkRateLimitAsync } from '@/lib/admin/rate-limit'
import { createAdminClient } from '@/lib/supabase/server'

interface Ctx { params: { id: string } }

export async function GET(_request: NextRequest, { params }: Ctx) {
  const access = await getAdminAccess({ superadminOnly: true })
  if (!access) return unauthorized()

  const admin = createAdminClient()
  const { data } = await admin
    .from('professionals')
    .select('*')
    .eq('id', params.id)
    .maybeSingle()
  if (!data) return notFound('Profesional no encontrado.')
  const te = checkTenantAccess(access, (data as { municipality_id: string }).municipality_id)
  if (!te.ok) return new Response(JSON.stringify({ error: te.reason }), { status: 403 })
  return new Response(JSON.stringify(data), {
    status: 200, headers: { 'Content-Type': 'application/json' },
  })
}

export async function PUT(request: NextRequest, { params }: Ctx) {
  const rate = await checkRateLimitAsync(request)
  if (rate) return rate

  const access = await getAdminAccess({ superadminOnly: true })
  if (!access) return unauthorized()

  const admin = createAdminClient()
  const { data: existing } = await admin
    .from('professionals')
    .select('municipality_id')
    .eq('id', params.id)
    .maybeSingle()
  if (!existing) return notFound('Profesional no encontrado.')
  const te = checkTenantAccess(access, (existing as { municipality_id: string }).municipality_id)
  if (!te.ok) return new Response(JSON.stringify({ error: te.reason }), { status: 403 })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return badRequest('JSON inválido.')
  }
  const parsed = UpdateProfessionalSchema.safeParse(body)
  if (!parsed.success) {
    return badRequest(
      'Datos inválidos.',
      parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '),
    )
  }

  const { data, error } = await admin
    .from('professionals')
    .update(parsed.data)
    .eq('id', params.id)
    .select('id')
    .single()

  if (error) {
    console.error('[api/admin/professionals/[id] PUT]', error)
    return serverError('No se pudo actualizar.')
  }
  return new Response(JSON.stringify({ id: (data as { id: string }).id }), {
    status: 200, headers: { 'Content-Type': 'application/json' },
  })
}

export async function DELETE(_request: NextRequest, { params }: Ctx) {
  const rate = await checkRateLimitAsync(_request)
  if (rate) return rate

  const access = await getAdminAccess({ superadminOnly: true })
  if (!access) return unauthorized()

  const admin = createAdminClient()
  const { data: existing } = await admin
    .from('professionals')
    .select('municipality_id')
    .eq('id', params.id)
    .maybeSingle()
  if (!existing) return notFound('Profesional no encontrado.')
  const te = checkTenantAccess(access, (existing as { municipality_id: string }).municipality_id)
  if (!te.ok) return forbidden(te.reason)

  // Comprobar catedrático: si tiene actividades, marcar inactivo (soft delete)
  const { data: activities } = await admin
    .from('activities')
    .select('id')
    .eq('professional_id', params.id)
    .limit(1)

  if (activities && activities.length > 0) {
    await admin
      .from('professionals')
      .update({ estado: 'inactivo' })
      .eq('id', params.id)
    return new Response(JSON.stringify({ ok: true, soft_deleted: true }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    })
  }

  await admin.from('professionals').delete().eq('id', params.id)
  return new Response(JSON.stringify({ ok: true, soft_deleted: false }), {
    status: 200, headers: { 'Content-Type': 'application/json' },
  })
}
