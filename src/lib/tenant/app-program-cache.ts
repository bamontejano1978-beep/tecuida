/**
 * Cache tageado del bundle program/modules/lessons por aplicación.
 *
 * Por qué un helper dedicado (en vez de queries inline en apps/[appSlug]/page.tsx):
 *   1. Mismo motivo que `municipality-apps-cache.ts`: `@supabase/ssr` no
 *      expone `next.tags` ni `next.revalidate` en su `select()`. La única
 *      vía soportada para tags en App Router cuando NO usas `fetch()`
 *      directamente es envolver la query en `unstable_cache`.
 *   2. Centralizar el bundle garantiza que cualquier mutación admin sobre
 *      `programs` / `program_modules` / `lessons` (futuras endpoints o
 *      scripts de seed) pueda invalidar UNA sola entrada de caché
 *      correspondiente a la app afectada, sin tocar al resto.
 *
 * Tagging contract (importante):
 *   • Tag = `app-program-<appId>` (uno por aplicación).
 *   • CUALQUIER endpoint admin que mute `programs`/`program_modules`/`lessons`
 *     para una app debe llamar:
 *       revalidateTag(getAppProgramTag(appId))
 *     Endpoints cubiertos actualmente:
 *       - `/api/admin/applications/[id]` PUT (cambia metadata que dispara
 *         la rama `tipo === 'programa'` y por tanto reconstruye el bundle)
 *       - `/api/admin/applications/[id]` DELETE (soft-delete desactiva la
 *         app → ya no se leen programs, pero invalidamos por seguridad
 *         para que un eventual undo no sirva contenido fantasma)
 *   • Si añades un nuevo endpoint que muta el contenido del programa,
 *     llama también `revalidateTag(getAppProgramTag(appId))` o la página
 *     PWA servirá módulos/lecciones fantasma hasta que se expire el TTL.
 *
 * TTL: 1 hora. El tag purga al instante; el TTL es solo una red de
 * seguridad para entradas huérfanas si alguien añade un endpoint y olvida
 * invalidar.
 *
 * Implementación del cache por keyParts con tag dinámico:
 *   Como `unstable_cache(fn, keyParts, { tags })` solo acepta tags
 *   ESTÁTICOS comunes a todas las llamadas, para conseguir invalidación
 *   granular por appId usamos un Map módulo-scope: la primera vez que
 *   se pide el bundle para una app, se construye y memoiza un wrapper
 *   `unstable_cache` cuyo tag lleva el appId embebido. Llamadas
 *   posteriores reutilizan ese wrapper sin coste adicional.
 *
 * Caveat de runtime: el Map módulo-scope solo memoiza dentro de un
 * proceso **Node** cálido (Vercel serverless warm instance). Si la
 * página PWA se mueve a `runtime = 'edge'`, cada request reconstruye
 * un wrapper nuevo por appId — `unstable_cache` sigue cacheando vía
 * Data Cache compartida, pero el Map deja de actuar como memo y pierde
 * cualquier posibilidad de short-circuit en frío. Hoy `apps/[appSlug]`
 * corre en Node, así que no es problema, pero conviene saberlo antes
 * de cambiar el segmento.
 */

import { unstable_cache } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/server'

// ---------------------------------------------------------------------------
// Tag
// ---------------------------------------------------------------------------

export const APP_PROGRAM_TAG_PREFIX = 'app-program-'

/**
 * Construye el tag de invalidación específico para una app.
 * El admin endpoint debe llamar `revalidateTag(getAppProgramTag(appId))`
 * tras cualquier mutación que afecte al contenido del programa.
 */
export function getAppProgramTag(appId: string): string {
  return `${APP_PROGRAM_TAG_PREFIX}${appId}`
}

// ---------------------------------------------------------------------------
// Tipos crudos (filas Supabase)
// ---------------------------------------------------------------------------

export interface ProgramRow {
  id: string
  application_id: string
  nombre: string
  descripcion: string | null
  total_sesiones: number | null
}

export interface ModuleRow {
  id: string
  program_id: string
  numero: number
  nombre: string
  descripcion: string | null
}

export interface LessonRow {
  id: string
  module_id: string
  titulo: string
  tipo: string
  contenido_texto: string | null
  audio_url: string | null
  video_url: string | null
  ejercicio: unknown
  duracion_minutos: number | null
  orden: number
}

export interface AppProgramBundle {
  program: ProgramRow | null
  modules: ModuleRow[]
  moduleIds: string[]
  lessons: LessonRow[]
}

// ---------------------------------------------------------------------------
// Query cruda (sin cache)
// ---------------------------------------------------------------------------

async function _fetchAppProgramBundle(appId: string): Promise<AppProgramBundle> {
  const supabase = createAdminClient()

  // Usamos `maybeSingle()` para no romper apps que están activas pero aún
  // no tienen registro en `programs` (caso típico: la app es 'programa'
  // pero todavía no se le subió el ZIP). El page cae a landing genérica.
  const { data: programData } = await supabase
    .from('programs')
    .select('*')
    .eq('application_id', appId)
    .maybeSingle()

  if (!programData) {
    return { program: null, modules: [], moduleIds: [], lessons: [] }
  }

  const { data: modulesData } = await supabase
    .from('program_modules')
    .select('*')
    .eq('program_id', programData.id)
    .order('numero', { ascending: true })

  const moduleIds = (modulesData || []).map((m) => m.id)

  const { data: lessonsData } =
    moduleIds.length > 0
      ? await supabase
          .from('lessons')
          .select('*')
          .in('module_id', moduleIds)
          .order('orden', { ascending: true })
      : { data: [] }

  return {
    program: programData as unknown as ProgramRow,
    modules: (modulesData || []) as unknown as ModuleRow[],
    moduleIds,
    lessons: (lessonsData || []) as unknown as LessonRow[],
  }
}

// ---------------------------------------------------------------------------
// Wrapper memoizado por appId con tag dinámico
// ---------------------------------------------------------------------------

/**
 * Mapa módulo-scope que memoiza el `unstable_cache` por appId. El valor
 * es siempre una función (`unstable_cache` devuelve un callable, nunca
 * una Promise), por eso el tipo es directo.
 *
 * Una llamada a `revalidateTag(getAppProgramTag(appId))` purga SOLO la
 * entrada de esa app sin afectar al resto.
 *
 * Tamaño del Map: una entrada por appId. En la práctica son ~10-50 apps
 * simultáneas; cabe en memoria sin problema.
 */
const _bundleCacheByApp = new Map<string, () => Promise<AppProgramBundle>>()

export function getAppProgramBundle(appId: string): Promise<AppProgramBundle> {
  let cached = _bundleCacheByApp.get(appId)
  if (!cached) {
    cached = unstable_cache(
      () => _fetchAppProgramBundle(appId),
      ['app-program-bundle', appId],
      {
        tags: [getAppProgramTag(appId)],
        revalidate: 3600,
      },
    )
    _bundleCacheByApp.set(appId, cached)
  }
  // El wrapper sigue siendo un callable: lo invocamos para devolver la
  // Promise (HIT o MISS) gestionada por `unstable_cache`.
  return cached()
}
