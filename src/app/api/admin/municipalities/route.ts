/**
 * API Admin — Municipios (colección)
 *
 * GET  /api/admin/municipalities          → Listar todos los municipios
 * POST /api/admin/municipalities          → Crear un nuevo municipio
 *
 * Seguridad: Usa createAdminClient() con service_role_key.
 * Estas rutas SON server-only; la SUPA_SERVICE_ROLE_KEY nunca se
 * expone al cliente. El panel admin UI añadirá su propia capa de auth.
 *
 * Requisitos: 10.1, 10.2, 10.5, 11.5, 11.6
 */

import { createAdminClient } from '@/lib/supabase/server'
import { tenantCache } from '@/lib/tenant/cache'
import { verifyAdminAccess } from '@/lib/admin/auth'
import { checkRateLimitAsync } from '@/lib/admin/rate-limit'
import {
  CreateMunicipalitySchema,
} from '@/lib/validations/municipality'
import { NextResponse } from 'next/server'

// ---------------------------------------------------------------------------
// GET — Listar municipios
// ---------------------------------------------------------------------------

export async function GET(request: Request) {
  const rateLimit = await checkRateLimitAsync(request)
  if (rateLimit) return rateLimit

  const adminUser = await verifyAdminAccess()
  if (adminUser instanceof NextResponse) return adminUser

  const { searchParams } = new URL(request.url)
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)))
  const offset = (page - 1) * limit

  try {
    const supabase = createAdminClient()

    const { data, error, count } = await supabase
      .from('municipalities')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('[GET /api/admin/municipalities]', error.message)
      return NextResponse.json(
        { error: 'Error al consultar municipios' },
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
    console.error('[GET /api/admin/municipalities] Unexpected:', err)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 },
    )
  }
}

// ---------------------------------------------------------------------------
// POST — Crear municipio
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

  // Validar con Zod
  const parsed = CreateMunicipalitySchema.safeParse(body)
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

    // Construir el dominio a partir del slug
    const dominio = `${dto.slug}.${process.env.NEXT_PUBLIC_BASE_DOMAIN || 'tecuida.group'}`

    // Construir el objeto de inserción
    const insertRow: Record<string, unknown> = {
      slug: dto.slug,
      nombre_municipio: dto.nombre_municipio,
      nombre_ayuntamiento: dto.nombre_ayuntamiento,
      dominio,
      colores_corporativos: dto.colores_corporativos,
      textos_institucionales: {
        bienvenida: `Bienvenido/a al portal de bienestar de ${dto.nombre_ayuntamiento}`,
        descripcion: `Portal de salud y bienestar del municipio de ${dto.nombre_municipio}`,
        pie_pagina: `© ${dto.nombre_ayuntamiento} — TE CUIDA · Tu privacidad, protegida`,
        // RGPD: el enlace a /privacidad se renderiza automáticamente
        // en el footer de la landing page del tenant (columna Enlaces).
      },
    }

    // Imágenes opcionales subidas por el admin (evita dependencia de búsquedas externas)
    if (dto.hero_image_url) {
      insertRow.hero_image_url = dto.hero_image_url
    }
    if (dto.escudo_url) {
      insertRow.escudo_url = dto.escudo_url
    }
    if (dto.logo_url) {
      insertRow.logo_url = dto.logo_url
    }

    // Campos de contacto (P3)
    if (dto.email_contacto) {
      insertRow.email_contacto = dto.email_contacto
    }
    if (dto.telefono_contacto) {
      insertRow.telefono_contacto = dto.telefono_contacto
    }

    // Textos institucionales personalizados (P2): si el admin los envía, se usan;
    // si no, se mantienen los defaults generados arriba.
    if (dto.textos_institucionales) {
      insertRow.textos_institucionales = {
        ...insertRow.textos_institucionales as Record<string, unknown>,
        ...Object.fromEntries(
          Object.entries(dto.textos_institucionales).filter(([_, v]) => v !== undefined),
        ),
      }
    }

    // Insertar en la base de datos
    const { data, error } = await supabase
      .from('municipalities')
      .insert(insertRow)
      .select()
      .single()

    if (error) {
      // Manejar colisiones de slug (unique constraint)
      if (error.code === '23505') {
        return NextResponse.json(
          { error: `El slug "${dto.slug}" ya está en uso` },
          { status: 409 },
        )
      }
      console.error('[POST /api/admin/municipalities]', error.message)
      return NextResponse.json(
        { error: 'Error al crear el municipio' },
        { status: 500 },
      )
    }

    // Invalidar cualquier entrada previa en caché para este slug
    await tenantCache.delete(dto.slug)

    return NextResponse.json({ data }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/admin/municipalities] Unexpected:', err)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 },
    )
  }
}
