/**
 * API Admin — Asignar plan a municipio
 *
 * GET /api/admin/municipalities/[id]/plan   → Plan actual + diff si cambia
 * PUT /api/admin/municipalities/[id]/plan   → Asignar plan con sync mode (vía RPC atómica)
 *
 * El modo de sincronización controla qué pasa con las apps manuales:
 *   - 'preserve_extras' (default): añade apps del plan, preserva manuales
 *   - 'strict': añade apps del plan Y elimina manuales activas que no estén en el plan
 *   - 'reset': igual que strict, pensado para "empezar de cero"
 *
 * La operación PUT se delega a la RPC `public.assign_municipality_plan`
 * (migración 010) que ejecuta DELETE+UPDATE en una sola transacción SQL.
 */

import { createAdminClient } from '@/lib/supabase/server'
import { tenantCache } from '@/lib/tenant/cache'
import { verifyAdminAccess } from '@/lib/admin/auth'
import { checkRateLimitAsync } from '@/lib/admin/rate-limit'
import { AssignPlanSchema } from '@/lib/validations/plan'
import { NextResponse } from 'next/server'
import type { PlanChangeDiff } from '@/types'

// ---------------------------------------------------------------------------
// GET — Plan actual + diff contra plan propuesto (opcional ?plan_id=)
// ---------------------------------------------------------------------------

export async function GET(
  request: Request,
  { params }: { params: { id: string } },
) {
  const rateLimit = await checkRateLimitAsync(request)
  if (rateLimit) return rateLimit

  const adminUser = await verifyAdminAccess()
  if (adminUser instanceof NextResponse) return adminUser

  const { searchParams } = new URL(request.url)
  const targetPlanId = searchParams.get('plan_id')

  try {
    const supabase = createAdminClient()

    // 1. Municipio
    const { data: mun, error: munError } = await supabase
      .from('municipalities')
      .select('id, nombre_municipio, slug, plan_id')
      .eq('id', params.id)
      .eq('oculto_admin', false)
      .single()

    if (munError || !mun) {
      return NextResponse.json(
        { error: 'Municipio no encontrado' },
        { status: 404 },
      )
    }

    // 2. Plan actual
    let currentPlan: { id: string; nombre: string; slug: string } | null = null
    if (mun.plan_id) {
      const { data: p } = await supabase
        .from('subscription_plans')
        .select('id, nombre, slug')
        .eq('id', mun.plan_id)
        .single()
      currentPlan = p
    }

    // 3. Apps actuales del municipio (solo activas)
    const { data: currentApps } = await supabase
      .from('municipality_applications')
      .select('application_id')
      .eq('municipality_id', params.id)
      .eq('activa', true)

    const currentAppIds = (currentApps || []).map(
      (a) => a.application_id as string,
    )

    // 4. Si hay plan_id en query, calcular diff
    let diff: PlanChangeDiff | null = null
    if (targetPlanId) {
      const { data: targetPlanApps } = await supabase
        .from('plan_applications')
        .select('application_id')
        .eq('plan_id', targetPlanId)

      const targetAppIds = (targetPlanApps || []).map(
        (a) => a.application_id as string,
      )
      const currentSet = new Set(currentAppIds)
      const targetSet = new Set(targetAppIds)

      const to_add = targetAppIds.filter((id) => !currentSet.has(id))
      const to_remove = currentAppIds.filter((id) => !targetSet.has(id))
      const to_keep = targetAppIds.filter((id) => currentSet.has(id))

      diff = { to_add, to_remove, to_keep }
    }

    return NextResponse.json({
      municipality: {
        id: mun.id,
        nombre: mun.nombre_municipio,
        slug: mun.slug,
      },
      current_plan: currentPlan,
      current_apps_count: currentAppIds.length,
      current_app_ids: currentAppIds,
      diff,
    })
  } catch (err) {
    console.error('[GET /api/admin/municipalities/:id/plan] Unexpected:', err)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 },
    )
  }
}

// ---------------------------------------------------------------------------
// PUT — Asignar plan con sync mode (vía RPC atómica)
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

  const parsed = AssignPlanSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Datos inválidos', details: parsed.error.flatten().fieldErrors },
      { status: 422 },
    )
  }

  const { plan_id, sync_mode } = parsed.data

  try {
    const supabase = createAdminClient()

    // 1. Obtener slug del municipio para invalidar caché
    const { data: mun, error: munError } = await supabase
      .from('municipalities')
      .select('slug')
      .eq('id', params.id)
      .eq('oculto_admin', false)
      .single()

    if (munError || !mun) {
      return NextResponse.json(
        { error: 'Municipio no encontrado' },
        { status: 404 },
      )
    }

    // 2. Llamar a la RPC atómica
    //    La RPC ejecuta DELETE+UPDATE en una sola transacción.
    //    Errcodes emitidos: P0002 (no encontrado), 22023 (sync_mode inválido)
    const { data: rpcResult, error: rpcError } = await supabase.rpc(
      'assign_municipality_plan',
      {
        p_municipality_id: params.id,
        p_plan_id: plan_id,
        p_sync_mode: sync_mode,
      },
    )

    if (rpcError) {
      console.error(
        '[PUT /api/admin/municipalities/:id/plan] rpc:',
        rpcError.message,
        rpcError.code,
      )

      // Mapear errcodes de PostgreSQL a HTTP status
      // P0002 = no_data_found (municipio/plan no existe)
      if (rpcError.code === 'P0002') {
        return NextResponse.json(
          { error: rpcError.message },
          { status: 404 },
        )
      }
      // 22023 = invalid_parameter_value (sync_mode inválido)
      if (rpcError.code === '22023') {
        return NextResponse.json(
          { error: rpcError.message },
          { status: 422 },
        )
      }

      return NextResponse.json(
        { error: 'Error al asignar el plan' },
        { status: 500 },
      )
    }

    // 3. Invalidar caché del tenant
    await tenantCache.delete(mun.slug)

    // 4. Responder
    const appsCount = (rpcResult as { apps_count?: number } | null)?.apps_count ?? 0
    const deletedCount = (rpcResult as { deleted_count?: number } | null)?.deleted_count ?? 0
    return NextResponse.json({
      message: plan_id
        ? `Plan asignado correctamente. ${appsCount} aplicación(es) activa(s).`
        : 'Plan eliminado. Apps manuales se mantienen.',
      data: {
        municipality_id: params.id,
        plan_id,
        sync_mode,
        apps_count: appsCount,
        deleted_count: deletedCount,
      },
    })
  } catch (err) {
    console.error('[PUT /api/admin/municipalities/:id/plan] Unexpected:', err)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 },
    )
  }
}
