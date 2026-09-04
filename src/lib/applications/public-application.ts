import { cache } from 'react'
import { createAdminClient } from '@/lib/supabase/server'
import { isApplicationId } from '@/lib/application-links'
import type {
  ApplicationLaunchMode,
  ApplicationProvider,
} from '@/lib/application-runtime'
import { normalizeExternalUrl } from '@/lib/urls'

const PUBLIC_APPLICATION_SELECT =
  'id, app_slug, nombre, tipo, descripcion, thumbnail_url, brand_color, instrucciones, url_acceso, app_provider, launch_mode, categoria:categories(nombre)'

const LEGACY_APPLICATION_SLUG_ALIASES: Record<string, string> = {
  mindful30: 'reto30',
  'mindful30-adultos': 'reto30',
}

const LEGACY_APPLICATION_ID_ALIASES: Record<string, string> = {
  '79015b0e-f830-4098-b50d-d5cbca460b3e': 'mindful30-cuidadores',
}

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
  app_provider: ApplicationProvider
  launch_mode: ApplicationLaunchMode
  categoria_nombre: string | null
}

/**
 * Fuente única para página, layout y manifest públicos de una aplicación.
 * `cache()` deduplica la consulta cuando layout y página se renderizan juntos.
 */
export const getPublicApplication = cache(
  async (identifier: string): Promise<PublicApplication | null> => {
    const adminClient = createAdminClient()
    const normalizedIdentifier = identifier.trim().toLowerCase()
    const aliasedIdentifier =
      LEGACY_APPLICATION_ID_ALIASES[normalizedIdentifier] || identifier

    const fetchApplication = (lookupIdentifier: string) => {
      const query = adminClient
        .from('applications')
        .select(PUBLIC_APPLICATION_SELECT)
        .eq('activa', true)

      return isApplicationId(lookupIdentifier)
        ? query.eq('id', lookupIdentifier).maybeSingle()
        : query.eq('app_slug', lookupIdentifier).maybeSingle()
    }

    let { data, error } = await fetchApplication(aliasedIdentifier)

    if (!data && !isApplicationId(aliasedIdentifier)) {
      const canonicalSlug =
        LEGACY_APPLICATION_SLUG_ALIASES[aliasedIdentifier.trim().toLowerCase()]

      if (canonicalSlug) {
        ;({ data, error } = await fetchApplication(canonicalSlug))
      }
    }

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
      app_provider: ((data.app_provider as string | null) || 'tecuida') as ApplicationProvider,
      launch_mode: ((data.launch_mode as string | null) || 'landing') as ApplicationLaunchMode,
      categoria_nombre:
        (data.categoria as unknown as { nombre: string } | null)?.nombre ?? null,
    }
  },
)
