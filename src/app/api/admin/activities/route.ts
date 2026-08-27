/**
 * /api/admin/activities
 *
 * - GET  → Listado de actividades para el superadministrador
 * - POST → Crear actividad (estado inicial: 'pendiente_validacion' si lo crea
 *          un profesional externo, 'publicada' si lo crea el superadministrador).
 */

import type { NextRequest } from 'next/server'
import {
  getAdminAccess,
  checkTenantAccess,
  listActivitiesAdmin,
  badRequest,
  serverError,
  unauthorized,
} from '@/lib/admin/activities'
import { CreateActivitySchema } from '@/lib/validations/activity'
import { checkRateLimitAsync } from '@/lib/admin/rate-limit'
import { createAdminClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const rate = await checkRateLimitAsync(request)
  if (rate) return rate

  const access = await getAdminAccess({ superadminOnly: true })
  if (!access) return unauthorized()

  const { searchParams } = new URL(request.url)
  const filter = {
    estado: searchParams.get('estado') ?? undefined,
    categoria_id: searchParams.get('categoria_id') ?? undefined,
    q: searchParams.get('q') ?? undefined,
    destacada: searchParams.get('destacada') === 'true',
    professional_id: searchParams.get('professional_id') ?? undefined,
    limit: searchParams.get('limit') ? Number(searchParams.get('limit')) : 50,
    offset: searchParams.get('offset') ? Number(searchParams.get('offset')) : 0,
  }

  try {
    const result = await listActivitiesAdmin(access, filter)
    return new Response(
      JSON.stringify({ data: result.rows, total: result.total }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    console.error('[api/admin/activities GET]', err)
    return serverError('No se pudo listar las actividades.')
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

  const parsed = CreateActivitySchema.safeParse(body)
  if (!parsed.success) {
    return badRequest(
      'Datos inválidos.',
      parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '),
    )
  }

  const data = parsed.data

  try {
    const admin = createAdminClient()

    // Resolver tenant objetivo
    let municipality_id: string | null = access.municipality_id
    if (access.is_superadmin) {
      // Acepta municipality_id del body (es de superadmin)
      const bodyObj = body as { municipality_id?: string }
      municipality_id = bodyObj.municipality_id ?? null
      if (!municipality_id) {
        return badRequest('Superadmin debe indicar municipality_id.')
      }
    }
    if (!municipality_id) {
      return badRequest('Admin municipal sin municipio asignado.')
    }

    // Verificar el profesional pertenece al mismo municipio
    const { data: prof } = await admin
      .from('professionals')
      .select('id, municipality_id, estado')
      .eq('id', data.professional_id)
      .maybeSingle()
    if (!prof) return badRequest('Profesional no encontrado.')
    if ((prof as { municipality_id: string }).municipality_id !== municipality_id) {
      return badRequest('El profesional no pertenece a este municipio.')
    }
    if ((prof as { estado: string }).estado !== 'activo') {
      return badRequest('El profesional no está activo.')
    }

    const te = checkTenantAccess(access, municipality_id)
    if (!te.ok) return new Response(JSON.stringify({ error: te.reason }), { status: 403 })

    const { data: inserted, error } = await admin
      .from('activities')
      .insert({
        ...data,
        municipality_id,
        estado: 'publicada', // el admin valida al crear
        plazas_inscritas: 0,
      })
      .select('id')
      .single()

    if (error) {
      console.error('[api/admin/activities POST]', error)
      return serverError('No se pudo crear la actividad.')
    }

    return new Response(
      JSON.stringify({ id: (inserted as { id: string }).id }),
      { status: 201, headers: { 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    console.error('[api/admin/activities POST]', err)
    if (err instanceof Response) return err
    return serverError('No se pudo crear la actividad.')
  }
}
