/**
 * API de registro de apps desde la biblioteca
 *
 * POST /api/register-app
 *
 * Permite que las apps independientes (creadas desde library/template)
 * se registren automáticamente en el catálogo de Te Cuida.
 *
 * Autenticación: x-api-key header (compartido, configurado en .env).
 * Sin sesión de admin — diseñado para scripts de CI/CD.
 *
 * Body: CreateApplicationDTO (igual que POST /api/admin/applications)
 *
 * Idempotente: si ya existe una app con el mismo app_slug, devuelve 409.
 */

import { createAdminClient } from '@/lib/supabase/server'
import { CreateApplicationSchema } from '@/lib/validations/application'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  // 1. Verificar API key
  const apiKey = request.headers.get('x-api-key')
  const expectedKey = process.env.REGISTER_APP_API_KEY

  if (!expectedKey) {
    console.error('[register-app] REGISTER_APP_API_KEY no configurada en .env')
    return NextResponse.json(
      { error: 'API de registro no configurada en el servidor' },
      { status: 500 },
    )
  }

  if (!apiKey || apiKey !== expectedKey) {
    return NextResponse.json(
      { error: 'API key inválida o ausente' },
      { status: 401 },
    )
  }

  // 2. Parsear body
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

  // 3. Verificar idempotencia: ¿ya existe una app con este slug?
  try {
    const supabase = createAdminClient()

    if (dto.app_slug) {
      const { data: existing } = await supabase
        .from('applications')
        .select('id, nombre')
        .eq('app_slug', dto.app_slug)
        .maybeSingle()

      if (existing) {
        return NextResponse.json(
          {
            error: 'Ya existe una aplicación con ese slug',
            existing: { id: existing.id, nombre: existing.nombre },
          },
          { status: 409 },
        )
      }
    }

    // 4. Verificar categoría
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

    // 5. Insertar
    const { data, error } = await supabase
      .from('applications')
      .insert({
        nombre: dto.nombre,
        descripcion: dto.descripcion,
        category_id: dto.category_id,
        thumbnail_url: dto.thumbnail_url ?? null,
        tipo: dto.tipo,
        instrucciones: dto.instrucciones ?? null,
        url_acceso: dto.url_acceso ?? null,
        activa: dto.activa ?? true,
        app_slug: dto.app_slug || null,
        brand_color: dto.brand_color || null,
      })
      .select()
      .single()

    if (error) {
      if (error.code === '23503') {
        return NextResponse.json(
          { error: 'La categoría seleccionada ya no existe' },
          { status: 422 },
        )
      }
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'Ya existe una aplicación con ese slug' },
          { status: 409 },
        )
      }
      console.error('[register-app]', error.message)
      return NextResponse.json(
        { error: 'Error al crear la aplicación' },
        { status: 500 },
      )
    }

    return NextResponse.json({ data }, { status: 201 })
  } catch (err) {
    console.error('[register-app] Unexpected:', err)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 },
    )
  }
}
