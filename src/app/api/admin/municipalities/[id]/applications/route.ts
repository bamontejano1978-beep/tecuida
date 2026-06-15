/**
 * API Admin — Aplicaciones de un municipio
 *
 * GET /api/admin/municipalities/[id]/applications   → Listar apps activas
 * PUT /api/admin/municipalities/[id]/applications   → Sincronizar apps
 *
 * El PUT recibe { application_ids: UUID[] } y reemplaza
 * completamente las aplicaciones del municipio por las de la lista.
 *
 * Seguridad: Usa createAdminClient() con service_role_key.
 *
 * Requisitos: 10.1, 10.2, 13.1
 */

import { createAdminClient } from '@/lib/supabase/server'
import { verifyAdminAccess } from '@/lib/admin/auth'
import { checkRateLimitAsync } from '@/lib/admin/rate-limit'
import { UpdateMunicipalityAppsSchema } from '@/lib/validations/municipality'
import { NextResponse } from 'next/server'

// ---------------------------------------------------------------------------
// GET — Listar aplicaciones del municipio
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

    // Verificar que el municipio existe
    const { data: municipality, error: munError } = await supabase
      .from('municipalities')
      .select('id, nombre_municipio')
      .eq('id', params.id)
      .single()

    if (munError || !municipality) {
      return NextResponse.json(
        { error: 'Municipio no encontrado' },
        { status: 404 },
      )
    }

    // Obtener aplicaciones activas con datos de la aplicación
    const { data, error } = await supabase
      .from('municipality_applications')
      .select(
        `
        municipality_id,
        application_id,
        activa,
        fecha_activacion,
        application:applications (
          id,
          category_id,
          nombre,
          descripcion,
          thumbnail_url,
          tipo,
          nivel_suscripcion,
          activa
        )
      `,
      )
      .eq('municipality_id', params.id)

    if (error) {
      console.error(
        '[GET /api/admin/municipalities/:id/applications]',
        error.message,
      )
      return NextResponse.json(
        { error: 'Error al consultar las aplicaciones' },
        { status: 500 },
      )
    }

    return NextResponse.json({
      municipality: {
        id: municipality.id,
        nombre: municipality.nombre_municipio,
      },
      data: data || [],
    })
  } catch (err) {
    console.error(
      '[GET /api/admin/municipalities/:id/applications] Unexpected:',
      err,
    )
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 },
    )
  }
}

// ---------------------------------------------------------------------------
// PUT — Sincronizar aplicaciones del municipio
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
  const parsed = UpdateMunicipalityAppsSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: 'Datos inválidos',
        details: parsed.error.flatten().fieldErrors,
      },
      { status: 422 },
    )
  }

  const { application_ids } = parsed.data

  try {
    const supabase = createAdminClient()

    // Verificar que el municipio existe
    const { data: municipality, error: munError } = await supabase
      .from('municipalities')
      .select('id')
      .eq('id', params.id)
      .single()

    if (munError || !municipality) {
      return NextResponse.json(
        { error: 'Municipio no encontrado' },
        { status: 404 },
      )
    }

    // Verificar que los IDs de aplicaciones existen
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

    // Sincronizar: eliminar todas las asociaciones existentes e insertar las nuevas
    const { error: deleteError } = await supabase
      .from('municipality_applications')
      .delete()
      .eq('municipality_id', params.id)

    if (deleteError) {
      console.error(
        '[PUT /api/admin/municipalities/:id/applications] delete:',
        deleteError.message,
      )
      return NextResponse.json(
        { error: 'Error al sincronizar las aplicaciones' },
        { status: 500 },
      )
    }

    // Insertar las nuevas asociaciones
    if (application_ids.length > 0) {
      const rows = application_ids.map((appId) => ({
        municipality_id: params.id,
        application_id: appId,
        activa: true,
      }))

      const { error: insertError } = await supabase
        .from('municipality_applications')
        .insert(rows)

      if (insertError) {
        console.error(
          '[PUT /api/admin/municipalities/:id/applications] insert:',
          insertError.message,
        )
        return NextResponse.json(
          { error: 'Error al sincronizar las aplicaciones' },
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
        application:applications (
          id,
          nombre,
          tipo,
          nivel_suscripcion
        )
      `,
      )
      .eq('municipality_id', params.id)

    return NextResponse.json({
      message: 'Aplicaciones sincronizadas correctamente',
      data: updated || [],
    })
  } catch (err) {
    console.error(
      '[PUT /api/admin/municipalities/:id/applications] Unexpected:',
      err,
    )
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 },
    )
  }
}
