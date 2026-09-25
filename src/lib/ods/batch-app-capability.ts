import { createAdminClient } from '@/lib/supabase/server'

/**
 * Capacidades de lotes de códigos (migraciones 069 y 070).
 *
 * La 069 añade `municipal_invite_batches.application_id` (app pre-asignada
 * al lote). Mientras no esté aplicada en producción, el código degrada con
 * elegancia: el ciudadano elige la app al activar (comportamiento 068).
 *
 * La 070 añade `municipal_invite_batches.proposito` ('acceso' | 'ods'):
 * categoría del lote. Sin la columna, los lotes se tratan como 'acceso'
 * (comportamiento clásico) y el panel no muestra el selector de categoría.
 *
 * - getBatchCapability(): ambas columnas en una consulta (cache 5 min)
 * - hasBatchAppColumn(): ¿existe application_id?
 * - isPgMissingColumnError(err): ¿el error es "columna no existe"?
 */

const CACHE_KEY = '__tc_batchAppCapability__'
const CACHE_TTL_MS = 5 * 60_000

interface BatchCapability {
  /** Migración 069 aplicada: existe municipal_invite_batches.application_id. */
  hasAppColumn: boolean
  /** Migración 070 aplicada: existe municipal_invite_batches.proposito. */
  hasPurposeColumn: boolean
}

function readCache(): BatchCapability | undefined {
  const g = globalThis as Record<string, unknown>
  const cached = g[CACHE_KEY] as { value: BatchCapability; at: number } | undefined
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.value
  return undefined
}

function writeCache(value: BatchCapability): void {
  const g = globalThis as Record<string, unknown>
  g[CACHE_KEY] = { value, at: Date.now() }
}

export async function getBatchCapability(): Promise<BatchCapability> {
  const cached = readCache()
  if (cached) return cached

  const capability: BatchCapability = { hasAppColumn: false, hasPurposeColumn: false }
  try {
    const supabase = createAdminClient()
    const { error } = await supabase
      .from('municipal_invite_batches')
      .select('application_id, proposito')
      .limit(1)
    // Sin error => ambas columnas existen y son seleccionables.
    if (!error) {
      capability.hasAppColumn = true
      capability.hasPurposeColumn = true
    } else if (isPgMissingColumnError(error)) {
      // Una de las dos falta: distinguimos cuál consultando por separado.
      const [{ error: appError }, { error: purposeError }] = await Promise.all([
        supabase.from('municipal_invite_batches').select('application_id').limit(1),
        supabase.from('municipal_invite_batches').select('proposito').limit(1),
      ])
      capability.hasAppColumn = !appError
      capability.hasPurposeColumn = !purposeError
    }
  } catch {
    // Cliente no disponible (p. ej. entornos sin credenciales): sin capacidades.
  }

  writeCache(capability)
  return capability
}

export async function hasBatchAppColumn(): Promise<boolean> {
  return (await getBatchCapability()).hasAppColumn
}

/** Migración 070 aplicada: los lotes tienen categoría ('acceso' | 'ods'). */
export async function hasBatchPurposeColumn(): Promise<boolean> {
  return (await getBatchCapability()).hasPurposeColumn
}

/** Detecta el error PostgREST PGRST204 ("columna no existe en el schema cache"). */
export function isPgMissingColumnError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const code = (error as { code?: unknown }).code
  return code === 'PGRST204'
}
