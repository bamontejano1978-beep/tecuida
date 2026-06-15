/**
 * API Admin — Asignación masiva de una aplicación a municipios
 *
 * GET  /api/admin/applications/[id]/bulk   → Listar municipios con esta app
 * PUT  /api/admin/applications/[id]/bulk   → Sincronizar municipios para esta app
 *
 * El PUT recibe { municipality_ids: UUID[] } y reemplaza
 * completamente los municipios que tienen esta aplicación.
 *
 * Seguridad: Usa createAdminClient() con service_role_key.
 */

import { createAdminClient } from '@/lib/supabase/server'
import { verifyAdminAccess } from '@/lib/admin/auth'
import { checkRateLimitAsync } from '@/lib/admin/rate-limit'
import { BulkAssignAppSchema } from '@/lib/validations/municipality'
import { NextResponse } from 'next/server'

// ---------------------------------------------------------------------------
// GET — Listar municipios que tienen esta aplicación
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

    // Verificar que la aplicación existe
    const { data: application, error: appError } = await supabase
      .from('applications')
      .select('id, nombre')
      .eq('id', params.id)
      .single()

    if (appError || !application) {
      return NextResponse.json(
        { error: 'Aplicación no encontrada' },
        { status: 404 },
      )
    }

    // Obtener municipios con esta app activa
    const { data, error } = await supabase
      .from('municipality_applications')
      .select(
        `
        municipality_id,
        application_id,
        activa,
        fecha_activacion,
        municipality:municipalities (
          id,
          nombre_municipio,
          slug,
          dominio
        )
      `,
      )
      .eq('application_id', params.id)
      .eq('activa', true)

    if (error) {
      console.error(
        '[GET /api/admin/applications/:id/bulk]',
        error.message,
      )
      return NextResponse.json(
        { error: 'Error al consultar los municipios' },
        { status: 500 },
      )
    }

    return NextResponse.json({
      application: {
        id: application.id,
        nombre: application.nombre,
      },
      data: data || [],
    })
  } catch (err) {
    console.error(
      '[GET /api/admin/applications/:id/bulk] Unexpected:',
      err,
    )
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 },
    )
  }
}

// ---------------------------------------------------------------------------
// PUT — Sincronizar municipios para esta aplicación
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

  // Validar con Zod
  const parsed = BulkAssignAppSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: 'Datos inválidos',
        details: parsed.error.flatten().fieldErrors,
      },
      { status: 422 },
    )
  }

  const { municipality_ids } = parsed.data

  try {
    const supabase = createAdminClient()

    // Verificar que la aplicación existe
    const { data: application, error: appError } = await supabase
      .from('applications')
      .select('id')
      .eq('id', params.id)
      .single()

    if (appError || !application) {
      return NextResponse.json(
        { error: 'Aplicación no encontrada' },
        { status: 404 },
      )
    }

    // Verificar que los IDs de municipios existen
    if (municipality_ids.length > 0) {
      const { data: validMunicipalities, error: munError } = await supabase
        .from('municipalities')
        .select('id')
        .in('id', municipality_ids)

      if (munError) {
        return NextResponse.json(
          { error: 'Error al validar los municipios' },
          { status: 500 },
        )
      }

      const validIds = new Set((validMunicipalities || []).map((m) => m.id))
      const invalidIds = municipality_ids.filter((id) => !validIds.has(id))

      if (invalidIds.length > 0) {
        return NextResponse.json(
          {
            error: 'Algunos municipios no existen',
            invalid_ids: invalidIds,
          },
          { status: 422 },
        )
      }
    }

    // Sincronizar: eliminar todas las asociaciones existentes para esta app
    const { error: deleteError } = await supabase
      .from('municipality_applications')
      .delete()
      .eq('application_id', params.id)

    if (deleteError) {
      console.error(
        '[PUT /api/admin/applications/:id/bulk] delete:',
        deleteError.message,
      )
      return NextResponse.json(
        { error: 'Error al sincronizar los municipios' },
        { status: 500 },
      )
    }

    // Insertar las nuevas asociaciones
    if (municipality_ids.length > 0) {
      const rows = municipality_ids.map((munId) => ({
        municipality_id: munId,
        application_id: params.id,
        activa: true,
      }))

      const { error: insertError } = await supabase
        .from('municipality_applications')
        .insert(rows)

      if (insertError) {
        console.error(
          '[PUT /api/admin/applications/:id/bulk] insert:',
          insertError.message,
        )
        return NextResponse.json(
          { error: 'Error al sincronizar los municipios' },
          { status: 500 },
        )
      }
    }

    // Devolver el estado actualizado
    const { data: updated } = await supabase
      .from('municipality_applications')
      .select(
        `
        municipality_id,
        application_id,
        activa,
        fecha_activacion,
        municipality:municipalities (
          id,
          nombre_municipio,
          slug
        )
      `,
      )
      .eq('application_id', params.id)

    return NextResponse.json({
      message: `Aplicación asignada a ${municipality_ids.length} municipio${municipality_ids.length !== 1 ? 's' : ''}`,
      data: updated || [],
    })
  } catch (err) {
    console.error(
      '[PUT /api/admin/applications/:id/bulk] Unexpected:',
      err,
    )
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 },
    )
  }
}
