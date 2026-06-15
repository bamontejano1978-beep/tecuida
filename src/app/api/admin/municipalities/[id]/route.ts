/**
 * API Admin — Municipio individual
 *
 * GET    /api/admin/municipalities/[id]   → Obtener un municipio
 * PUT    /api/admin/municipalities/[id]   → Actualizar un municipio
 * DELETE /api/admin/municipalities/[id]   → Eliminar un municipio
 *
 * Seguridad: Usa createAdminClient() con service_role_key.
 *
 * Requisitos: 10.1, 10.2, 10.5
 */

import { createAdminClient } from '@/lib/supabase/server'
import { tenantCache } from '@/lib/tenant/cache'
import { verifyAdminAccess } from '@/lib/admin/auth'
import { checkRateLimitAsync } from '@/lib/admin/rate-limit'
import {
  CreateMunicipalitySchema,
} from '@/lib/validations/municipality'
import { NextResponse } from 'next/server'

// Schema parcial para actualización (todos los campos opcionales)
const UpdateMunicipalitySchema = CreateMunicipalitySchema.partial()

// ---------------------------------------------------------------------------
// GET — Obtener municipio por ID
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
      .from('municipalities')
      .select('*')
      .eq('id', params.id)
      .single()

    if (error || !data) {
      return NextResponse.json(
        { error: 'Municipio no encontrado' },
        { status: 404 },
      )
    }

    return NextResponse.json({ data })
  } catch (err) {
    console.error('[GET /api/admin/municipalities/:id] Unexpected:', err)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 },
    )
  }
}

// ---------------------------------------------------------------------------
// PUT — Actualizar municipio
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

  // Validar con Zod (partial: todos los campos opcionales)
  const parsed = UpdateMunicipalitySchema.safeParse(body)
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

    // Verificar que el municipio existe
    const { data: existing, error: fetchError } = await supabase
      .from('municipalities')
      .select('id, slug')
      .eq('id', params.id)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json(
        { error: 'Municipio no encontrado' },
        { status: 404 },
      )
    }

    // Construir el objeto de actualización
    const updateData: Record<string, unknown> = {}

    if (updates.nombre_municipio !== undefined)
      updateData.nombre_municipio = updates.nombre_municipio
    if (updates.nombre_ayuntamiento !== undefined)
      updateData.nombre_ayuntamiento = updates.nombre_ayuntamiento
    if (updates.slug !== undefined) {
      updateData.slug = updates.slug
      updateData.dominio = `${updates.slug}.${process.env.NEXT_PUBLIC_BASE_DOMAIN || 'tecuida.es'}`
    }
    if (updates.colores_corporativos !== undefined)
      updateData.colores_corporativos = updates.colores_corporativos
    if (updates.tipo_suscripcion !== undefined)
      updateData.tipo_suscripcion = updates.tipo_suscripcion

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No se proporcionaron campos para actualizar' },
        { status: 400 },
      )
    }

    const { data, error } = await supabase
      .from('municipalities')
      .update(updateData)
      .eq('id', params.id)
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json(
          { error: `El slug "${updates.slug}" ya está en uso` },
          { status: 409 },
        )
      }
      console.error('[PUT /api/admin/municipalities/:id]', error.message)
      return NextResponse.json(
        { error: 'Error al actualizar el municipio' },
        { status: 500 },
      )
    }

    // Invalidar caché para el slug antiguo y el nuevo (si cambió)
    await tenantCache.delete(existing.slug)
    if (updates.slug && updates.slug !== existing.slug) {
      await tenantCache.delete(updates.slug)
    }

    return NextResponse.json({ data })
  } catch (err) {
    console.error('[PUT /api/admin/municipalities/:id] Unexpected:', err)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 },
    )
  }
}

// ---------------------------------------------------------------------------
// DELETE — Eliminar municipio
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

    // Obtener el slug antes de eliminar (para invalidar caché)
    const { data: existing } = await supabase
      .from('municipalities')
      .select('slug')
      .eq('id', params.id)
      .single()

    if (!existing) {
      return NextResponse.json(
        { error: 'Municipio no encontrado' },
        { status: 404 },
      )
    }

    const { error } = await supabase
      .from('municipalities')
      .delete()
      .eq('id', params.id)

    if (error) {
      console.error('[DELETE /api/admin/municipalities/:id]', error.message)
      return NextResponse.json(
        { error: 'Error al eliminar el municipio' },
        { status: 500 },
      )
    }

    // Invalidar caché para el slug eliminado
    await tenantCache.delete(existing.slug)

    return NextResponse.json({
      message: 'Municipio eliminado correctamente',
    })
  } catch (err) {
    console.error('[DELETE /api/admin/municipalities/:id] Unexpected:', err)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 },
    )
  }
}
