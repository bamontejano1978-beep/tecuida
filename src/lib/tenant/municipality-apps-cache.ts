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
 * El join incluye SOLO columnas que existen en el schema actual de la DB
 * remota. `created_at` ahora SÍ está disponible gracias a migration 039 —
 * ver `notas_schema_drift` en `_fetchMunicipalityApps` para el contexto
 * histórico del bug original que la motivó. Cada página post-proyecta
 * a su forma final con TypeScript narrowing.
 *
 * Si en el futuro se añade otra columna a `applications`, añadirla aquí Y
 * en el SELECT del `_fetchMunicipalityApps` en el mismo commit. Y
 * actualizar el smoke-test de error-logging con el nuevo shape (ver
 * followup en `41d2e29` → `supabase/migrations/039_add_applications_created_at.sql`).
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
    /**
     * Disponible desde migration 039. Backfilleada con MIN(fecha_activacion)
     * para apps con assignments históricos; DEFAULT NOW() para apps sin
     * assignments. Consumido por `recentCategoryIds` en
     * `src/app/page.tsx` (badge "app NUEVO > últimos 7 días").
     */
    created_at: string
  } | null
}

export const MUNICIPALITY_APPS_TAG = 'municipality-apps'

/**
 * Query raw contra Supabase (no cache). Marcada `internal` para que solo
 * el wrapper `unstable_cache` la consuma — evita uso accidental sin tag.
 *
 * ╭─ notas_schema_drift ─────────────────────────────────────────────────╮
 * │ Esta función es el centro del bug histórico "apps no aparecen en    │
 * │ landings" que consumió múltiples turnos de debugging. La causa       │
 * │ raíz: el SELECT referenciaba `applications.created_at` que NO       │
 * │ existe en el schema real de la DB (añadido jamás a migration 001    │
 * │ ni a 023/025). PostgREST respondía con `error.code=42703`           │
 * │ ("column does not exist") que Supabase devolvía como `data: null`    │
 * │ y `error: {...}`. El helper silenciaba con `data || []` → la        │
 * │ landing mostraba "0 aplicaciones" para TODOS los municipios.        │
 * │                                                                      │
 * │ Reglas para evitar que vuelva a ocurrir:                            │
 * │   1. Capturar `error` SIEMPRE y loguearlo con nombre del tenant y    │
 * │      texto del error → Vercel logs diagnostic al instante.          │
 * │   2. El interface `MunicipalityAppRow` documenta SOLO columnas       │
 * │      existentes; cada nueva migration que añada fields debe         │
 * │      actualizar ambos (interface + SELECT) en el mismo commit.      │
 * │   3. Smoke test recomendado: si una nueva columna aparece en el      │
 * │      SELECT pero no en el schema de `applications`, este helper      │
 * │      seguirá ocultando el error — extender el test de               │
 * │      `src/app/__tests__/page.test.tsx` con un caso que verifique    │
 * │      tabla vacía + error capturado.                                 │
 * ╰──────────────────────────────────────────────────────────────────────╯
 */
async function _fetchMunicipalityApps(
  municipalityId: string,
): Promise<MunicipalityAppRow[]> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
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

  if (error) {
    // Defensivo: bugs anteriores engulleron el error como [] y el síntoma
    // era "0 apps" sin pista alguna en logs. Ahora cualquier schema drift
    // será visible en Vercel logs y así el superadmin podrá abrir un issue
    // con el `code` exacto (e.g. 42703 column does not exist).
    console.error(
      `[getMunicipalityAppsForLanding] tenant=${municipalityId} ` +
        `error.code=${error.code ?? 'unknown'} ` +
        `error.message="${error.message ?? 'unknown'}". ` +
        `Devolviendo [] como degradación controlada. ` +
        `Si persiste, ver schema de public.applications.`,
    )
    return []
  }

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
