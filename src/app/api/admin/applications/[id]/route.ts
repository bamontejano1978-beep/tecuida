/**
 * API Admin — Aplicación individual
 *
 * GET    /api/admin/applications/[id]  → Obtener una aplicación por id
 * PUT    /api/admin/applications/[id]  → Actualizar una aplicación (PUT parcial)
 * DELETE /api/admin/applications/[id]  → Soft-delete (activa=false)
 *
 * Seguridad: Usa createAdminClient() con service_role_key (bypasa RLS).
 * El panel admin añade verifyAdminAccess().
 *
 * Decisión Req 14.1: el borrado es lógico (activa=false) para preservar
 * la integridad referencial con `municipality_applications`,
 * `municipality_application_history` y `user_progress`. Borrar filas
 * físicas rompería FKs si la app está activada en algún municipio o
 * un usuario tiene progreso asociado.
 */

import { createAdminClient } from '@/lib/supabase/server'
import { verifyAdminAccess } from '@/lib/admin/auth'
import { checkRateLimitAsync } from '@/lib/admin/rate-limit'
import { UpdateApplicationSchema } from '@/lib/validations/application'
import { NextResponse } from 'next/server'

// ---------------------------------------------------------------------------
// GET — Obtener aplicación por ID
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

    const { data, error } = await supabase
      .from('applications')
      .select('*')
      .eq('id', params.id)
      .single()

    if (error || !data) {
      return NextResponse.json(
        { error: 'Aplicación no encontrada' },
        { status: 404 },
      )
    }

    return NextResponse.json({ data })
  } catch (err) {
    console.error(
      '[GET /api/admin/applications/:id] Unexpected:',
      err,
    )
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 },
    )
  }
}

// ---------------------------------------------------------------------------
// PUT — Actualizar aplicación (PUT parcial)
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

  const parsed = UpdateApplicationSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: 'Datos inválidos',
        details: parsed.error.flatten().fieldErrors,
      },
      { status: 422 },
    )
  }

  const updates = parsed.data

  try {
    const supabase = createAdminClient()

    // Verificar que la fila existe
    const { data: existing, error: fetchError } = await supabase
      .from('applications')
      .select('id')
      .eq('id', params.id)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json(
        { error: 'Aplicación no encontrada' },
        { status: 404 },
      )
    }

    // Si cambia category_id, verificar que la nueva categoría existe
    if (updates.category_id) {
      const { data: cat, error: catError } = await supabase
        .from('categories')
        .select('id')
        .eq('id', updates.category_id)
        .single()

      if (catError || !cat) {
        return NextResponse.json(
          { error: 'La categoría seleccionada no existe' },
          { status: 422 },
        )
      }
    }

    const updateData: Record<string, unknown> = {}
    if (updates.nombre !== undefined) updateData.nombre = updates.nombre
    if (updates.descripcion !== undefined)
      updateData.descripcion = updates.descripcion
    if (updates.category_id !== undefined)
      updateData.category_id = updates.category_id
    if (updates.thumbnail_url !== undefined)
      updateData.thumbnail_url = updates.thumbnail_url
    if (updates.tipo !== undefined) updateData.tipo = updates.tipo
    if (updates.instrucciones !== undefined)
      updateData.instrucciones = updates.instrucciones
    if (updates.url_acceso !== undefined)
      updateData.url_acceso = updates.url_acceso
    if (updates.activa !== undefined) updateData.activa = updates.activa

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No se proporcionaron campos para actualizar' },
        { status: 400 },
      )
    }

    const { data, error } = await supabase
      .from('applications')
      .update(updateData)
      .eq('id', params.id)
      .select()
      .single()

    if (error) {
      console.error(
        '[PUT /api/admin/applications/:id]',
        error.message,
      )
      return NextResponse.json(
        { error: 'Error al actualizar la aplicación' },
        { status: 500 },
      )
    }

    return NextResponse.json({ data })
  } catch (err) {
    console.error(
      '[PUT /api/admin/applications/:id] Unexpected:',
      err,
    )
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 },
    )
  }
}

// ---------------------------------------------------------------------------
// DELETE — Soft-delete (activa=false). Idempotente.
// ---------------------------------------------------------------------------

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const rateLimit = await checkRateLimitAsync(_request)
  if (rateLimit) return rateLimit

  const adminUser = await verifyAdminAccess()
  if (adminUser instanceof NextResponse) return adminUser

  try {
    const supabase = createAdminClient()

    const { data: existing } = await supabase
      .from('applications')
      .select('id, activa')
      .eq('id', params.id)
      .single()

    if (!existing) {
      return NextResponse.json(
        { error: 'Aplicación no encontrada' },
        { status: 404 },
      )
    }

    // Idempotente: si ya está desactivada, retornamos 200 sin re-update.
    if (!existing.activa) {
      return NextResponse.json({
        message: 'Aplicación ya estaba desactivada',
      })
    }

    const { error } = await supabase
      .from('applications')
      .update({ activa: false })
      .eq('id', params.id)

    if (error) {
      console.error(
        '[DELETE /api/admin/applications/:id]',
        error.message,
      )
      return NextResponse.json(
        { error: 'Error al desactivar la aplicación' },
        { status: 500 },
      )
    }

    return NextResponse.json({
      message: 'Aplicación desactivada correctamente',
    })
  } catch (err) {
    console.error(
      '[DELETE /api/admin/applications/:id] Unexpected:',
      err,
    )
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 },
    )
  }
}
