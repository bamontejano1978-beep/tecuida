/**
 * API Admin — Plan individual
 *
 * GET    /api/admin/plans/[id]   → Detalle del plan (con apps)
 * PUT    /api/admin/plans/[id]   → Actualizar plan
 * DELETE /api/admin/plans/[id]   → Eliminar plan (solo si no hay municipios)
 */

import { createAdminClient } from '@/lib/supabase/server'
import { verifyAdminAccess } from '@/lib/admin/auth'
import { checkRateLimitAsync } from '@/lib/admin/rate-limit'
import { UpdatePlanSchema } from '@/lib/validations/plan'
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

    const { data: plan, error } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('id', params.id)
      .single()

    if (error || !plan) {
      return NextResponse.json(
        { error: 'Plan no encontrado' },
        { status: 404 },
      )
    }

    const { data: planApps, error: appsError } = await supabase
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
          nivel_suscripcion
        )
      `,
      )
      .eq('plan_id', params.id)

    if (appsError) {
      console.error('[GET /api/admin/plans/:id] apps:', appsError.message)
    }

    // Contar municipios asignados
    const { count: municipiosCount } = await supabase
      .from('municipalities')
      .select('*', { count: 'exact', head: true })
      .eq('plan_id', params.id)
      .eq('oculto_admin', false)

    return NextResponse.json({
      data: {
        ...plan,
        applications: (planApps || [])
          .map((pa) => pa.application)
          .filter((a) => a !== null),
        municipios_count: municipiosCount || 0,
      },
    })
  } catch (err) {
    console.error('[GET /api/admin/plans/:id] Unexpected:', err)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 },
    )
  }
}

// ---------------------------------------------------------------------------
// PUT
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

  const parsed = UpdatePlanSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Datos inválidos', details: parsed.error.flatten().fieldErrors },
      { status: 422 },
    )
  }

  try {
    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from('subscription_plans')
      .update(parsed.data)
      .eq('id', params.id)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Plan no encontrado' },
          { status: 404 },
        )
      }
      console.error('[PUT /api/admin/plans/:id]', error.message)
      return NextResponse.json(
        { error: 'Error al actualizar el plan' },
        { status: 500 },
      )
    }

    return NextResponse.json({ data })
  } catch (err) {
    console.error('[PUT /api/admin/plans/:id] Unexpected:', err)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 },
    )
  }
}

// ---------------------------------------------------------------------------
// DELETE
// ---------------------------------------------------------------------------

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } },
) {
  const rateLimit = await checkRateLimitAsync(request)
  if (rateLimit) return rateLimit

  const adminUser = await verifyAdminAccess()
  if (adminUser instanceof NextResponse) return adminUser

  try {
    const supabase = createAdminClient()

    // Verificar que no hay municipios con este plan
    const { count: municipiosCount } = await supabase
      .from('municipalities')
      .select('*', { count: 'exact', head: true })
      .eq('plan_id', params.id)
      .eq('oculto_admin', false)

    if (municipiosCount && municipiosCount > 0) {
      return NextResponse.json(
        {
          error: `No se puede eliminar: hay ${municipiosCount} municipio(s) suscrito(s) a este plan. Cámbialos de plan primero.`,
        },
        { status: 409 },
      )
    }

    const { error } = await supabase
      .from('subscription_plans')
      .delete()
      .eq('id', params.id)

    if (error) {
      console.error('[DELETE /api/admin/plans/:id]', error.message)
      return NextResponse.json(
        { error: 'Error al eliminar el plan' },
        { status: 500 },
      )
    }

    return NextResponse.json({ message: 'Plan eliminado correctamente' })
  } catch (err) {
    console.error('[DELETE /api/admin/plans/:id] Unexpected:', err)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 },
    )
  }
}
