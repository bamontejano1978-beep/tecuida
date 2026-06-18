/**
 * API Admin — Planes de suscripción (colección)
 *
 * GET  /api/admin/plans     → Listar todos los planes
 * POST /api/admin/plans     → Crear un nuevo plan
 *
 * Seguridad: service_role_key (bypasea RLS).
 */

import { createAdminClient } from '@/lib/supabase/server'
import { verifyAdminAccess } from '@/lib/admin/auth'
import { checkRateLimitAsync } from '@/lib/admin/rate-limit'
import { CreatePlanSchema } from '@/lib/validations/plan'
import { NextResponse } from 'next/server'

// ---------------------------------------------------------------------------
// GET — Listar planes
// ---------------------------------------------------------------------------

export async function GET(request: Request) {
  const rateLimit = await checkRateLimitAsync(request)
  if (rateLimit) return rateLimit

  const adminUser = await verifyAdminAccess()
  if (adminUser instanceof NextResponse) return adminUser

  try {
    const supabase = createAdminClient()

    const { data: plans, error } = await supabase
      .from('subscription_plans')
      .select('*')
      .order('orden', { ascending: true })

    if (error) {
      console.error('[GET /api/admin/plans]', error.message)
      return NextResponse.json(
        { error: 'Error al consultar los planes' },
        { status: 500 },
      )
    }

    // Contar municipios por plan
    const { data: counts, error: countError } = await supabase
      .from('municipalities')
      .select('plan_id')
      .eq('oculto_admin', false)

    if (countError) {
      console.error('[GET /api/admin/plans] count:', countError.message)
    }

    const planIds = (plans || []).map((p) => p.id)
    const planIdSet = new Set(planIds)
    const countByPlan: Record<string, number> = {}
    ;(counts || []).forEach((row) => {
      if (row.plan_id && planIdSet.has(row.plan_id)) {
        countByPlan[row.plan_id] = (countByPlan[row.plan_id] || 0) + 1
      }
    })

    const plansWithCount = (plans || []).map((p) => ({
      ...p,
      municipios_count: countByPlan[p.id] || 0,
    }))

    return NextResponse.json({
      data: plansWithCount,
      meta: { total: plansWithCount.length },
    })
  } catch (err) {
    console.error('[GET /api/admin/plans] Unexpected:', err)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 },
    )
  }
}

// ---------------------------------------------------------------------------
// POST — Crear plan
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
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

  const parsed = CreatePlanSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Datos inválidos', details: parsed.error.flatten().fieldErrors },
      { status: 422 },
    )
  }

  const dto = parsed.data

  try {
    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from('subscription_plans')
      .insert({
        slug: dto.slug,
        nombre: dto.nombre,
        descripcion: dto.descripcion ?? null,
        precio_mensual: dto.precio_mensual ?? null,
        max_ciudadanos: dto.max_ciudadanos ?? null,
        activo: dto.activo ?? true,
        orden: dto.orden ?? 0,
      })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json(
          { error: `El slug "${dto.slug}" ya está en uso` },
          { status: 409 },
        )
      }
      console.error('[POST /api/admin/plans]', error.message)
      return NextResponse.json(
        { error: 'Error al crear el plan' },
        { status: 500 },
      )
    }

    return NextResponse.json({ data }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/admin/plans] Unexpected:', err)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 },
    )
  }
}
