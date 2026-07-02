/**
 * API Admin — Categorías (colección)
 *
 * GET  /api/admin/categories          → Listar todas las categorías
 * POST /api/admin/categories          → Crear una nueva categoría
 *
 * Seguridad: Usa createAdminClient() con service_role_key.
 * Requisitos: 10.1, 10.2
 */

import { createAdminClient } from '@/lib/supabase/server'
import { verifyAdminAccess } from '@/lib/admin/auth'
import { checkRateLimitAsync } from '@/lib/admin/rate-limit'
import { NextResponse } from 'next/server'
import { z } from 'zod'

// ---------------------------------------------------------------------------
// Schema de validación para categorías
// ---------------------------------------------------------------------------

const CategorySchema = z.object({
  nombre: z.string().min(1, 'El nombre no puede estar vacío').max(80),
  descripcion: z.string().max(300).optional().or(z.literal('').transform(() => undefined)),
  icono_url: z.string().max(500).optional().or(z.literal('').transform(() => undefined)),
  orden: z.number().int().min(0).optional(),
})

// ---------------------------------------------------------------------------
// GET — Listar categorías (ordenadas por orden)
// ---------------------------------------------------------------------------

export async function GET(request: Request) {
  const rateLimit = await checkRateLimitAsync(request)
  if (rateLimit) return rateLimit

  const adminUser = await verifyAdminAccess()
  if (adminUser instanceof NextResponse) return adminUser

  try {
    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from('categories')
      .select('id, nombre, descripcion, icono_url, orden')
      .order('orden', { ascending: true })

    if (error) {
      console.error('[GET /api/admin/categories]', error.message)
      return NextResponse.json({ error: 'Error al consultar categorías' }, { status: 500 })
    }

    return NextResponse.json({ data: data || [] })
  } catch (err) {
    console.error('[GET /api/admin/categories] Unexpected:', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

// ---------------------------------------------------------------------------
// POST — Crear categoría
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
    return NextResponse.json({ error: 'Cuerpo JSON inválido' }, { status: 400 })
  }

  const parsed = CategorySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Datos inválidos', details: parsed.error.flatten().fieldErrors },
      { status: 422 },
    )
  }

  const dto = parsed.data

  try {
    const supabase = createAdminClient()

    // Auto-asignar orden al final si no se especifica
    let orden = dto.orden
    if (orden === undefined) {
      const { data: maxRow, error: maxError } = await supabase
        .from('categories')
        .select('orden')
        .order('orden', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (maxError) {
        console.error('[POST /api/admin/categories] Error obteniendo max orden:', maxError.message)
      }
      orden = (maxRow?.orden ?? -1) + 1
    }

    const { data, error } = await supabase
      .from('categories')
      .insert({
        nombre: dto.nombre,
        descripcion: dto.descripcion || null,
        icono_url: dto.icono_url || null,
        orden,
      })
      .select()
      .single()

    if (error) {
      console.error('[POST /api/admin/categories]', error.message)
      return NextResponse.json({ error: 'Error al crear la categoría' }, { status: 500 })
    }

    return NextResponse.json({ data }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/admin/categories] Unexpected:', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
