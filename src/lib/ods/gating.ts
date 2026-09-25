import 'server-only'

import { createAdminClient } from '@/lib/supabase/server'
import { listActiveGrants } from '@/lib/ods/grants'

/**
 * IDs de aplicaciones con concesión activa para el usuario, o null si el
 * municipio no está en modo `grant` (acceso abierto, comportamiento histórico).
 *
 * Uso en páginas server: `const grantedIds = await getGrantedApplicationIds(userId)`;
 * si no es null, filtra las apps visibles por esos IDs.
 */
export async function getGrantedApplicationIds(
  userId: string,
): Promise<Set<string> | null> {
  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('users')
    .select('municipality_id, municipality:municipalities(grant_mode)')
    .eq('id', userId)
    .maybeSingle()

  const row = profile as
    | {
        municipality_id: string | null
        municipality: { grant_mode: string } | { grant_mode: string }[] | null
      }
    | null

  if (!row?.municipality_id) return null

  const municipality = Array.isArray(row.municipality)
    ? row.municipality[0]
    : row.municipality
  const grantMode = municipality?.grant_mode || 'open'
  if (grantMode !== 'grant') return null

  const grants = await listActiveGrants(userId)
  return new Set(grants.map((g) => g.application_id))
}
