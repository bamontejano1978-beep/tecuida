/**
 * Helper para leer la configuración del tenant desde los headers
 * inyectados por el middleware raíz (src/middleware.ts).
 *
 * Uso en Server Components, Server Actions y API Routes:
 * ```ts
 * import { getTenantFromHeaders } from '@/lib/tenant/headers'
 * const tenant = getTenantFromHeaders()
 * ```
 *
 * Requisitos: 2.1, 2.4
 */

import { headers } from 'next/headers'
import type { MunicipalityConfig, CorporateColors, InstitutionalTexts } from '@/types'
import { tenantCache } from './cache'
import { getDemoTenant } from '@/lib/demo-data'

/**
 * Parsea los headers x-tenant-* inyectados por el middleware
 * y devuelve un objeto MunicipalityConfig tipado.
 *
 * Si algún header requerido falta o es inválido, devuelve null.
 */
export function getTenantFromHeaders(): MunicipalityConfig | null {
  const headersList = headers()

  const id = headersList.get('x-tenant-id')
  const slug = headersList.get('x-tenant-slug')
  const nombre = headersList.get('x-tenant-name')
  const dominio = headersList.get('x-tenant-domain')
  const estado = headersList.get('x-tenant-subscription-status')

  // Todos los campos son requeridos
  if (!id || !slug || !nombre || !dominio || !estado) {
    return null
  }

  return {
    id,
    slug,
    nombre_municipio: nombre,
    nombre_ayuntamiento: `Ayuntamiento de ${nombre}`,
    dominio,
    escudo_url: '',
    logo_url: '',
    hero_image_url: '',
    colores_corporativos: DEFAULT_COLORS,
    imagenes_municipio: [],
    textos_institucionales: DEFAULT_TEXTS,
    modulos_activos: [],
    estado_suscripcion: estado as MunicipalityConfig['estado_suscripcion'],
  }
}

/**
 * Obtiene la configuración completa del tenant desde la base de datos.
 *
 * A diferencia de getTenantFromHeaders() que solo lee los headers básicos,
 * esta función consulta PostgreSQL para obtener colores, textos, imágenes, etc.
 *
 * Usa el admin client con service_role_key (server-only, seguro).
 */
export async function getTenantConfigFromDB(
  slug: string,
): Promise<MunicipalityConfig | null> {
  // 1. Verificar caché primero (el middleware ya pudo haber cacheado)
  const cached = await tenantCache.get(slug)
  if (cached) return cached

  // 2. Modo demo: devolver tenant simulado sin consultar Supabase
  if (process.env.DEMO_MODE === 'true') {
    const demoConfig = getDemoTenant(slug)
    await tenantCache.set(slug, demoConfig)
    return demoConfig
  }

  // 3. Consultar base de datos
  const { createAdminClient } = await import('@/lib/supabase/server')
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('municipalities')
    .select('*')
    .eq('slug', slug)
    .single()

  if (error || !data) return null

  const config: MunicipalityConfig = {
    id: data.id as string,
    slug: data.slug as string,
    nombre_municipio: data.nombre_municipio as string,
    nombre_ayuntamiento: data.nombre_ayuntamiento as string,
    dominio: data.dominio as string,
    escudo_url: (data.escudo_url as string) || '',
    logo_url: (data.logo_url as string) || '',
    hero_image_url: (data.hero_image_url as string) || '',
    colores_corporativos: (data.colores_corporativos as CorporateColors),
    imagenes_municipio: (data.imagenes_municipio as string[]) || [],
    textos_institucionales: (data.textos_institucionales as InstitutionalTexts),
    modulos_activos: (data.modulos_activos as string[]) || [],
    estado_suscripcion: data.estado_suscripcion as MunicipalityConfig['estado_suscripcion'],
  }

  // 3. Guardar en caché
  await tenantCache.set(slug, config)

  return config
}

// ---------------------------------------------------------------------------
// Valores por defecto para cuando solo tenemos los headers básicos
// ---------------------------------------------------------------------------

const DEFAULT_COLORS: CorporateColors = {
  primary: '#1e40af',
  secondary: '#3b82f6',
  accent: '#f59e0b',
  background: '#ffffff',
  text: '#111827',
}

const DEFAULT_TEXTS: InstitutionalTexts = {
  bienvenida: 'Bienvenido/a al portal de bienestar de tu municipio',
  descripcion:
    'Explora los programas y herramientas disponibles para tu salud y bienestar.',
  pie_pagina: 'TE CUIDA — Plataforma de bienestar ciudadano · Tu privacidad, protegida',
}
