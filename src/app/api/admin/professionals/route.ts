/**
 * /api/admin/professionals
 *
 * - GET  → Listado
 * - POST → Crear y asignar a un municipio (solo superadministrador)
 */

import type { NextRequest } from 'next/server'
import {
  getAdminAccess,
  checkTenantAccess,
  badRequest,
  serverError,
  listProfessionalsAdmin,
  unauthorized,
} from '@/lib/admin/activities'
import { CreateProfessionalSchema } from '@/lib/validations/activity'
import { checkRateLimitAsync } from '@/lib/admin/rate-limit'
import { createAdminClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const rate = await checkRateLimitAsync(request)
  if (rate) return rate

  const access = await getAdminAccess({ superadminOnly: true })
  if (!access) return unauthorized()

  try {
    const rows = await listProfessionalsAdmin(access)
    return new Response(
      JSON.stringify({ data: rows }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    console.error('[api/admin/professionals GET]', err)
    return serverError('No se pudo listar los profesionales.')
  }
}

export async function POST(request: NextRequest) {
  const rate = await checkRateLimitAsync(request)
  if (rate) return rate

  const access = await getAdminAccess({ superadminOnly: true })
  if (!access) return unauthorized()

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return badRequest('JSON inválido.')
  }

  const parsed = CreateProfessionalSchema.safeParse(body)
  if (!parsed.success) {
    return badRequest(
      'Datos inválidos.',
      parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '),
    )
  }
  const data = parsed.data

  try {
    const admin = createAdminClient()

    let municipality_id: string | null = access.municipality_id
    if (access.is_superadmin) {
      const bodyObj = body as { municipality_id?: string }
      municipality_id = bodyObj.municipality_id ?? null
      if (!municipality_id) {
        return badRequest('Superadmin debe indicar municipality_id.')
      }
    }
    if (!municipality_id) {
      return badRequest('Admin municipal sin municipio asignado.')
    }

    const te = checkTenantAccess(access, municipality_id)
    if (!te.ok) return new Response(JSON.stringify({ error: te.reason }), { status: 403 })

    const { data: inserted, error } = await admin
      .from('professionals')
      .insert({ ...data, municipality_id })
      .select('id')
      .single()

    if (error) {
      // PGRST duplicate: índice único no debería triggear aquí, pero
      // si pasa un email duplicado (no hay constraint por ahora), aceptamos.
      console.error('[api/admin/professionals POST]', error)
      return serverError('No se pudo crear el profesional.')
    }
    return new Response(
      JSON.stringify({ id: (inserted as { id: string }).id }),
      { status: 201, headers: { 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    console.error('[api/admin/professionals POST]', err)
    if (err instanceof Response) return err
    return serverError('No se pudo crear el profesional.')
  }
}
