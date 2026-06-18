/**
 * API Admin — Sincronización forzada de un plan a sus municipios suscritos
 *
 * POST /api/admin/plans/[id]/sync
 *
 * Reasigna el plan a TODOS los municipios que lo tienen activo,
 * forzando la propagación de las apps actuales del plan vía el
 * trigger sync_municipality_apps_from_plan.
 *
 * Caso de uso: el superadmin edita las apps de un plan (añade o
 * quita aplicaciones) y quiere que el cambio se refleje
 * inmediatamente en todos los municipios suscritos, sin tener
 * que ir uno por uno reasignando el plan.
 *
 * Modo: solo 'preserve_extras'. Para limpiar apps manuales no
 * incluidas en el plan, el superadmin debe ir municipio a
 * municipio con sync_mode='strict'.
 *
 * Retorna: json con
 *   plan_id, plan_name, synced_count, failed_count,
 *   total_apps_added, total_apps_removed, results[]
 */

import { createAdminClient } from '@/lib/supabase/server'
import { verifyAdminAccess } from '@/lib/admin/auth'
import { checkRateLimitAsync } from '@/lib/admin/rate-limit'
import { NextResponse } from 'next/server'

// ---------------------------------------------------------------------------
// POST — Sincronizar plan a todos los municipios suscritos
// ---------------------------------------------------------------------------

export async function POST(
  request: Request,
  { params }: { params: { id: string } },
) {
  const rateLimit = await checkRateLimitAsync(request)
  if (rateLimit) return rateLimit

  const adminUser = await verifyAdminAccess()
  if (adminUser instanceof NextResponse) return adminUser

  try {
    const supabase = createAdminClient()

    // 1. Verificar que el plan existe
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

    // 2. Obtener todos los municipios suscritos a este plan
    const { data: municipalities, error: munError } = await supabase
      .from('municipalities')
      .select('id, slug, nombre_municipio')
      .eq('plan_id', params.id)
      .eq('oculto_admin', false)

    if (munError) {
      console.error(
        '[POST /api/admin/plans/:id/sync] list mun:',
        munError.message,
      )
      return NextResponse.json(
        { error: 'Error al listar municipios del plan' },
        { status: 500 },
      )
    }

    const munList = municipalities || []

    if (munList.length === 0) {
      return NextResponse.json({
        message: `El plan "${plan.nombre}" no tiene municipios suscritos.`,
        data: {
          plan_id: plan.id,
          plan_name: plan.nombre,
          synced_count: 0,
          failed_count: 0,
          results: [],
        },
      })
    }

    // 3. Para cada municipio, llamar a la RPC atómica que re-asigna
    //    el plan (preserve_extras). El trigger sync_municipality_apps_from_plan
    //    se dispara y actualiza las apps en municipality_applications.
    //
    //    Paralelizamos con Promise.all (con control de concurrencia para
    //    no saturar la DB con planes de muchos municipios) y usamos
    //    allSettled para no abortar el batch si una RPC falla.
    const CONCURRENCY = 5

    type SyncResult = {
      municipality_id: string
      slug: string
      nombre: string
      success: boolean
      apps_count?: number
      error?: string
    }

    const results: SyncResult[] = []

    // Procesar en lotes de CONCURRENCY para no saturar la DB
    for (let i = 0; i < munList.length; i += CONCURRENCY) {
      const batch = munList.slice(i, i + CONCURRENCY)

      const settled = await Promise.allSettled(
        batch.map(async (mun) => {
          const { data: rpcResult, error: rpcError } = await supabase.rpc(
            'assign_municipality_plan',
            {
              p_municipality_id: mun.id,
              p_plan_id: plan.id,
              p_sync_mode: 'preserve_extras',
            },
          )

          if (rpcError) {
            throw rpcError
          }

          return {
            municipality_id: mun.id,
            slug: mun.slug,
            nombre: mun.nombre_municipio,
            success: true as const,
            apps_count:
              (rpcResult as { apps_count?: number } | null)?.apps_count ?? 0,
          }
        }),
      )

      settled.forEach((outcome, idx) => {
        const mun = batch[idx]
        if (outcome.status === 'fulfilled') {
          results.push(outcome.value)
        } else {
          const err = outcome.reason as { message?: string } | undefined
          console.error(
            `[POST /api/admin/plans/:id/sync] mun ${mun.slug}:`,
            err?.message ?? 'unknown error',
          )
          results.push({
            municipality_id: mun.id,
            slug: mun.slug,
            nombre: mun.nombre_municipio,
            success: false,
            error: err?.message ?? 'Error desconocido',
          })
        }
      })
    }

    const syncedCount = results.filter((r) => r.success).length
    const failedCount = results.filter((r) => !r.success).length

    return NextResponse.json({
      message: `Sincronización completada: ${syncedCount} municipio(s) actualizado(s)${
        failedCount > 0 ? `, ${failedCount} fallido(s)` : ''
      }.`,
      data: {
        plan_id: plan.id,
        plan_name: plan.nombre,
        synced_count: syncedCount,
        failed_count: failedCount,
        results,
      },
    })
  } catch (err) {
    console.error('[POST /api/admin/plans/:id/sync] Unexpected:', err)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 },
    )
  }
}
