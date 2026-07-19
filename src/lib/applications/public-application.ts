import { cache } from 'react'
import { createAdminClient } from '@/lib/supabase/server'
import { isApplicationId } from '@/lib/application-links'
import { normalizeExternalUrl } from '@/lib/urls'

export interface PublicApplication {
  id: string
  app_slug: string | null
  nombre: string
  tipo: string
  descripcion: string | null
  thumbnail_url: string | null
  brand_color: string | null
  instrucciones: string | null
  url_acceso: string | null
  categoria_nombre: string | null
}

/**
 * Fuente única para página, layout y manifest públicos de una aplicación.
 * `cache()` deduplica la consulta cuando layout y página se renderizan juntos.
 */
export const getPublicApplication = cache(
  async (identifier: string): Promise<PublicApplication | null> => {
    const adminClient = createAdminClient()
    const query = adminClient
      .from('applications')
      .select(
        'id, app_slug, nombre, tipo, descripcion, thumbnail_url, brand_color, instrucciones, url_acceso, categoria:categories(nombre)',
      )
      .eq('activa', true)

    const { data, error } = isApplicationId(identifier)
      ? await query.eq('id', identifier).maybeSingle()
      : await query.eq('app_slug', identifier).maybeSingle()

    if (error || !data) return null

    return {
      id: data.id as string,
      app_slug: (data.app_slug as string | null) ?? null,
      nombre: data.nombre as string,
      tipo: (data.tipo as string) || 'herramienta',
      descripcion: (data.descripcion as string | null) ?? null,
      thumbnail_url: (data.thumbnail_url as string | null) ?? null,
      brand_color: (data.brand_color as string | null) ?? null,
      instrucciones: (data.instrucciones as string | null) ?? null,
      url_acceso: normalizeExternalUrl((data.url_acceso as string | null) ?? null),
      categoria_nombre:
        (data.categoria as unknown as { nombre: string } | null)?.nombre ?? null,
    }
  },
)
