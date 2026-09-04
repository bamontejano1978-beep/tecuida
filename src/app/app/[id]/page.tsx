import { notFound, permanentRedirect } from 'next/navigation'
import { getApplicationEntryPath } from '@/lib/application-links'
import { createAdminClient } from '@/lib/supabase/server'

interface Props {
  params: { id: string }
  searchParams?: Record<string, string | string[] | undefined>
}

/**
 * Ruta legacy: /app/[id].
 *
 * El acceso oficial y uniforme a aplicaciones vive en /apps/<slug-o-id>.
 * Mantenemos esta ruta como compatibilidad para enlaces antiguos, pero sin
 * duplicar render ni logica de programas.
 */
export default async function LegacyApplicationPage({
  params,
  searchParams = {},
}: Props) {
  const adminClient = createAdminClient()
  const { data, error } = await adminClient
    .from('applications')
    .select('id, app_slug, activa')
    .eq('id', params.id)
    .eq('activa', true)
    .maybeSingle()

  if (error || !data) {
    notFound()
  }

  const target = getApplicationEntryPath({
    id: data.id as string,
    app_slug: (data.app_slug as string | null) ?? null,
  })
  const query = new URLSearchParams()

  Object.entries(searchParams).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((item) => query.append(key, item))
    } else if (typeof value === 'string') {
      query.set(key, value)
    }
  })

  permanentRedirect(`${target}${query.size ? `?${query.toString()}` : ''}`)
}
