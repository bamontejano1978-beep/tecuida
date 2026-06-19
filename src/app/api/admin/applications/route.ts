/**
 * API Admin — Aplicaciones (colección)
 *
 * GET  /api/admin/applications          → Listar aplicaciones del catálogo
 * POST /api/admin/applications          → Crear una nueva aplicación
 *
 * Seguridad: Usa createAdminClient() con service_role_key (bypasa RLS).
 * El panel admin (/admin/aplicaciones) añade su propia capa de auth
 * mediante verifyAdminAccess().
 */

import { createAdminClient } from '@/lib/supabase/server'
import { verifyAdminAccess } from '@/lib/admin/auth'
import { checkRateLimitAsync } from '@/lib/admin/rate-limit'
import { CreateApplicationSchema } from '@/lib/validations/application'
import { NextResponse } from 'next/server'

// ---------------------------------------------------------------------------
// GET — Listar aplicaciones del catálogo
// ---------------------------------------------------------------------------

export async function GET(request: Request) {
  const rateLimit = await checkRateLimitAsync(request)
  if (rateLimit) return rateLimit

  const adminUser = await verifyAdminAccess()
  if (adminUser instanceof NextResponse) return adminUser

  const { searchParams } = new URL(request.url)
  const page = Math.max(
    1,
    parseInt(searchParams.get('page') || '1', 10),
  )
  const limit = Math.min(
    100,
    Math.max(1, parseInt(searchParams.get('limit') || '20', 10)),
  )
  const offset = (page - 1) * limit
  const onlyActive = searchParams.get('activa') === 'true'
  const onlyInactive = searchParams.get('activa') === 'false'

  try {
    const supabase = createAdminClient()

    let query = supabase
      .from('applications')
      .select('*', { count: 'exact' })
      .order('nombre', { ascending: true })
      .range(offset, offset + limit - 1)

    if (onlyActive) query = query.eq('activa', true)
    else if (onlyInactive) query = query.eq('activa', false)

    const { data, error, count } = await query

    if (error) {
      console.error('[GET /api/admin/applications]', error.message)
      return NextResponse.json(
        { error: 'Error al consultar aplicaciones' },
        { status: 500 },
      )
    }

    return NextResponse.json({
      data: data || [],
      meta: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    })
  } catch (err) {
    console.error(
      '[GET /api/admin/applications] Unexpected:',
      err,
    )
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 },
    )
  }
}

// ---------------------------------------------------------------------------
// POST — Crear aplicación del catálogo
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

  const parsed = CreateApplicationSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: 'Datos inválidos',
        details: parsed.error.flatten().fieldErrors,
      },
      { status: 422 },
    )
  }

  const dto = parsed.data

  try {
    const supabase = createAdminClient()

    // Verificar que la categoría existe antes de insertar (FK se valida
    // en BD, pero un check previo da 422 con mensaje claro en lugar
    // de 23503 con mensaje genérico).
    const { data: category, error: catError } = await supabase
      .from('categories')
      .select('id')
      .eq('id', dto.category_id)
      .single()

    if (catError || !category) {
      return NextResponse.json(
        { error: 'La categoría seleccionada no existe' },
        { status: 422 },
      )
    }

    const { data, error } = await supabase
      .from('applications')
      .insert({
        nombre: dto.nombre,
        descripcion: dto.descripcion,
        category_id: dto.category_id,
        // '' o undefined → null en BD (campo documentado como opcional)
        thumbnail_url: dto.thumbnail_url ?? null,
        tipo: dto.tipo,
        activa: dto.activa ?? true,
      })
      .select()
      .single()

    if (error) {
      // Belt-and-suspenders: si la FK falla aquí (categoria borrada entre
      // el SELECT pre-check y este INSERT), devolvemos 422 en lugar del
      // 500 genérico para mensaje claro al admin.
      if (error.code === '23503') {
        return NextResponse.json(
          { error: 'La categoría seleccionada ya no existe' },
          { status: 422 },
        )
      }
      console.error('[POST /api/admin/applications]', error.message)
      return NextResponse.json(
        { error: 'Error al crear la aplicación' },
        { status: 500 },
      )
    }

    return NextResponse.json({ data }, { status: 201 })
  } catch (err) {
    console.error(
      '[POST /api/admin/applications] Unexpected:',
      err,
    )
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 },
    )
  }
}
