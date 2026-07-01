/**
 * API Admin — Categoría individual
 *
 * PUT    /api/admin/categories/[id]   → Actualizar una categoría
 * DELETE /api/admin/categories/[id]   → Eliminar una categoría
 *
 * Seguridad: Usa createAdminClient() con service_role_key.
 */

import { createAdminClient } from '@/lib/supabase/server'
import { verifyAdminAccess } from '@/lib/admin/auth'
import { checkRateLimitAsync } from '@/lib/admin/rate-limit'
import { NextResponse } from 'next/server'
import { z } from 'zod'

// ---------------------------------------------------------------------------
// Schema parcial para update
// ---------------------------------------------------------------------------

const UpdateCategorySchema = z.object({
  nombre: z.string().min(1).max(80).optional(),
  descripcion: z.string().max(300).nullable().optional(),
  icono_url: z.string().url().max(500).nullable().optional(),
  orden: z.number().int().min(0).optional(),
})

// ---------------------------------------------------------------------------
// PUT — Actualizar categoría
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
    return NextResponse.json({ error: 'Cuerpo JSON inválido' }, { status: 400 })
  }

  const parsed = UpdateCategorySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Datos inválidos', details: parsed.error.flatten().fieldErrors },
      { status: 422 },
    )
  }

  const updates = parsed.data

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { error: 'No se proporcionaron campos para actualizar' },
      { status: 400 },
    )
  }

  try {
    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from('categories')
      .update(updates)
      .eq('id', params.id)
      .select()
      .single()

    if (error) {
      console.error('[PUT /api/admin/categories/:id]', error.message)
      return NextResponse.json({ error: 'Error al actualizar la categoría' }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: 'Categoría no encontrada' }, { status: 404 })
    }

    return NextResponse.json({ data })
  } catch (err) {
    console.error('[PUT /api/admin/categories/:id] Unexpected:', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

// ---------------------------------------------------------------------------
// DELETE — Eliminar categoría
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

    // Verificar que la categoría existe
    const { data: existing } = await supabase
      .from('categories')
      .select('id')
      .eq('id', params.id)
      .single()

    if (!existing) {
      return NextResponse.json({ error: 'Categoría no encontrada' }, { status: 404 })
    }

    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', params.id)

    if (error) {
      // Si tiene apps asociadas (FK ON DELETE SET NULL en applications.category_id),
      // el borrado es seguro — las apps se quedan sin categoría pero no se borran.
      console.error('[DELETE /api/admin/categories/:id]', error.message)
      return NextResponse.json({ error: 'Error al eliminar la categoría' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Categoría eliminada correctamente' })
  } catch (err) {
    console.error('[DELETE /api/admin/categories/:id] Unexpected:', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
