/**
 * API Admin — Aplicaciones de un plan
 *
 * GET /api/admin/plans/[id]/applications   → Listar apps del plan
 * PUT /api/admin/plans/[id]/applications   → Sincronizar apps del plan
 *
 * Al sincronizar apps del plan, las apps añadidas al plan se
 * propagan automáticamente a TODOS los municipios suscritos
 * (vía trigger sync_municipality_apps_from_plan).
 *
 * Las apps que se quitan del plan:
 *   - NO se eliminan automáticamente de los municipios (preserva override)
 *   - El admin debe ir a cada municipio a quitarlas manualmente
 */

import { createAdminClient } from '@/lib/supabase/server'
import { verifyAdminAccess } from '@/lib/admin/auth'
import { checkRateLimitAsync } from '@/lib/admin/rate-limit'
import { SyncPlanApplicationsSchema } from '@/lib/validations/plan'
import { NextResponse } from 'next/server'

// ---------------------------------------------------------------------------
// GET
// ---------------------------------------------------------------------------

export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const rateLimit = await checkRateLimitAsync(_request)
  if (rateLimit) return rateLimit

  const adminUser = await verifyAdminAccess()
  if (adminUser instanceof NextResponse) return adminUser

  try {
    const supabase = createAdminClient()

    const { data: plan, error: planError } = await supabase
      .from('subscription_plans')
      .select('id, nombre, slug')
      .eq('id', params.id)
      .single()

    if (planError || !plan) {
      return NextResponse.json(
        { error: 'Plan no encontrado' },
        { status: 404 },
      )
    }

    const { data, error } = await supabase
      .from('plan_applications')
      .select(
        `
        plan_id,
        application_id,
        application:applications (
          id,
          category_id,
          nombre,
          descripcion,
          tipo,
          nivel_suscripcion,
          activa
        )
      `,
      )
      .eq('plan_id', params.id)

    if (error) {
      console.error('[GET /api/admin/plans/:id/applications]', error.message)
      return NextResponse.json(
        { error: 'Error al consultar las aplicaciones' },
        { status: 500 },
      )
    }

    return NextResponse.json({
      plan,
      data: (data || []).map((row) => ({
        application_id: row.application_id,
        application: row.application,
      })),
    })
  } catch (err) {
    console.error('[GET /api/admin/plans/:id/applications] Unexpected:', err)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 },
    )
  }
}

// ---------------------------------------------------------------------------
// PUT — Sincronizar apps del plan
// ---------------------------------------------------------------------------

export async function PUT(
  request: Request,
  { params }: { params: { id: string } },
) {
  const rateLimit = await checkRateLimitAsync(request)
  if (rateLimit) return rateLimit

  const adminUser = await verifyAdminAccess()
  if (adminUser instanceof NextResponse) return adminUser

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: 'Cuerpo JSON inválido' },
      { status: 400 },
    )
  }

  const parsed = SyncPlanApplicationsSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Datos inválidos', details: parsed.error.flatten().fieldErrors },
      { status: 422 },
    )
  }

  const { application_ids } = parsed.data

  try {
    const supabase = createAdminClient()

    // Verificar plan
    const { data: plan, error: planError } = await supabase
      .from('subscription_plans')
      .select('id')
      .eq('id', params.id)
      .single()

    if (planError || !plan) {
      return NextResponse.json(
        { error: 'Plan no encontrado' },
        { status: 404 },
      )
    }

    // Verificar apps válidas
    if (application_ids.length > 0) {
      const { data: validApps, error: appsError } = await supabase
        .from('applications')
        .select('id')
        .in('id', application_ids)

      if (appsError) {
        return NextResponse.json(
          { error: 'Error al validar las aplicaciones' },
          { status: 500 },
        )
      }

      const validIds = new Set((validApps || []).map((a) => a.id))
      const invalidIds = application_ids.filter((id) => !validIds.has(id))

      if (invalidIds.length > 0) {
        return NextResponse.json(
          {
            error: 'Algunas aplicaciones no existen',
            invalid_ids: invalidIds,
          },
          { status: 422 },
        )
      }
    }

    // Eliminar asignaciones existentes
    const { error: deleteError } = await supabase
      .from('plan_applications')
      .delete()
      .eq('plan_id', params.id)

    if (deleteError) {
      console.error(
        '[PUT /api/admin/plans/:id/applications] delete:',
        deleteError.message,
      )
      return NextResponse.json(
        { error: 'Error al sincronizar las aplicaciones' },
        { status: 500 },
      )
    }

    // Insertar las nuevas (esto NO propaga a municipios por sí solo;
    // el trigger de municipalities solo se dispara al cambiar plan_id.
    // El admin debe reasignar el plan a cada municipio o usar la UI de
    // "sincronizar ahora" — se hace en /api/admin/municipalities/[id]/plan)
    if (application_ids.length > 0) {
      const rows = application_ids.map((appId) => ({
        plan_id: params.id,
        application_id: appId,
      }))

      const { error: insertError } = await supabase
        .from('plan_applications')
        .insert(rows)

      if (insertError) {
        console.error(
          '[PUT /api/admin/plans/:id/applications] insert:',
          insertError.message,
        )
        return NextResponse.json(
          { error: 'Error al sincronizar las aplicaciones' },
          { status: 500 },
        )
      }
    }

    return NextResponse.json({
      message: `Plan actualizado con ${application_ids.length} aplicación(es).`,
      data: { application_ids },
      note:
        'Para propagar a los municipios suscritos, reasigna el plan desde /admin/municipios o usa la acción "sincronizar ahora".',
    })
  } catch (err) {
    console.error('[PUT /api/admin/plans/:id/applications] Unexpected:', err)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 },
    )
  }
}
