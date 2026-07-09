/**
 * Cache tageado de las apps activas de un municipio para la landing pública.
 *
 * Por qué un helper dedicado (en vez de una query inline en page.tsx):
 *   1. `@supabase/ssr` no expone `next.tags` ni `next.revalidate` en su
 *      `select()` (el `fetch` interno queda oculto). La única vía soportada
 *      para tags en App Router cuando NO usas `fetch()` directamente es
 *      envolver la query en `unstable_cache` y declarar `{ tags }` ahí.
 *   2. Centralizar el query garantiza que todas las páginas que muestren
 *      apps del municipio (hoy solo la landing) compartan el mismo tag y,
 *      por tanto, una sola invalidación admin purge las landings de TODOS
 *      los tenants en una operación (ya no hace falta Vercel cache-key
 *      por subdominio).
 *
 * Tagging contract (¡importante!):
 *   • CUALQUIER endpoint admin que mute `municipality_applications` o
 *     `applications` debe llamar `revalidateTag('municipality-apps')` tras
 *     la mutación exitosa. Endpoints cubiertos actualmente:
 *       - `/api/admin/municipalities/[id]/applications` PUT
 *       - `/api/admin/applications/[id]/bulk` PUT
 *       - `/api/admin/applications/[id]` PUT y DELETE
 *   • Si añades un nuevo endpoint que mute datos visibles en la landing,
 *     llama también `revalidateTag('municipality-apps')` o la landing
 *     servirá apps fantasma hasta que se expire el TTL.
 *
 * TTL: 1 hora. La invalidación por tag lo deja obsoleto al instante; el
 * TTL es solo una red de seguridad para que entradas huérfanas no vivan
 * eternamente si alguien añade un endpoint y olvida invalidar.
 */

import { unstable_cache } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/server'

/**
 * Fila cruda de `municipality_applications` con el join de `applications`.
 *
 * El join incluye TODAS las columnas que la landing pueda necesitar (unión
 * de los selects de `src/app/page.tsx` y `src/app/dashboard/page.tsx`).
 * Cada página post-proyecta a su forma final con TypeScript narrowing.
 */
export interface MunicipalityAppRow {
  application_id: string
  application: {
    id: string
    category_id: string
    nombre: string
    descripcion: string
    thumbnail_url: string | null
    tipo: string
    activa: boolean
    app_slug: string | null
    url_acceso: string | null
    created_at: string | null
  } | null
}

export const MUNICIPALITY_APPS_TAG = 'municipality-apps'

/**
 * Query raw contra Supabase (no cache). Marcada `internal` para que solo
 * el wrapper `unstable_cache` la consuma — evita uso accidental sin tag.
 */
async function _fetchMunicipalityApps(
  municipalityId: string,
): Promise<MunicipalityAppRow[]> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('municipality_applications')
    .select(
      `application_id,
      application:applications!inner (
        id,
        category_id,
        nombre,
        descripcion,
        thumbnail_url,
        tipo,
        activa,
        app_slug,
        url_acceso,
        created_at
      )`,
    )
    .eq('municipality_id', municipalityId)
    .eq('activa', true)

  return (data || []) as unknown as MunicipalityAppRow[]
}

/**
 * Versión cacheada con tag. Cache key por tenant (cada municipality_id tiene
 * su propia entrada en la cache); tag compartido para invalidación masiva.
 */
export const getMunicipalityAppsForLanding = unstable_cache(
  _fetchMunicipalityApps,
  ['municipality-apps'],
  {
    tags: [MUNICIPALITY_APPS_TAG],
    revalidate: 3600, // 1 hora (red de seguridad; el tag lo invalida antes)
  },
)
