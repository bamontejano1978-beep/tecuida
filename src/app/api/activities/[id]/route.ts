/**
 * /api/activities/[id]
 *
 * GET público que devuelve el detalle de una actividad publicada
 * según el tenant. Si el usuario está autenticado, también indica
 * si está inscrito.
 */

import type { NextRequest } from 'next/server'
import { getTenantFromHeaders } from '@/lib/tenant/headers'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { badRequest, notFound, serverError } from '@/lib/admin/activities'
import type { ActivityWithRelations } from '@/types'

interface Ctx { params: { id: string } }

export async function GET(_request: NextRequest, { params }: Ctx) {
  try {
    const tenant = getTenantFromHeaders()
    if (!tenant?.slug) {
      return badRequest('Subdominio de municipio requerido.')
    }

    const admin = createAdminClient()
    const { data: municipality } = await admin
      .from('municipalities')
      .select('id')
      .eq('slug', tenant.slug)
      .maybeSingle()
    if (!municipality) {
      return notFound('Municipio no encontrado.')
    }

    const { data: activity } = await admin
      .from('activities')
      .select(
        `*,
         professional:professionals(*),
         categoria:categories(id, nombre, icono_url)`,
      )
      .eq('id', params.id)
      .eq('municipality_id', (municipality as { id: string }).id)
      .eq('estado', 'publicada')
      .maybeSingle()

    if (!activity) return notFound('Actividad no disponible.')

    const act = activity as unknown as ActivityWithRelations

    // Si está autenticado, comprobar si está inscrito
    let inscripcion_estado: string | null = null
    const srv = createClient()
    const { data: authData } = await srv.auth.getUser()
    if (authData?.user) {
      const { data: ins } = await admin
        .from('activity_inscriptions')
        .select('estado')
        .eq('activity_id', params.id)
        .eq('user_id', authData.user.id)
        .maybeSingle()
      inscripcion_estado = (ins as { estado: string } | null)?.estado ?? null
    }

    return new Response(JSON.stringify({ ...act, inscripcion_estado }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('[api/activities/[id] GET]', err)
    return serverError('No se pudo obtener la actividad.')
  }
}
