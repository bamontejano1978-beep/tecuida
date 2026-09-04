import { createAdminClient } from '@/lib/supabase/server'
import { getTenantConfigFromDB, getTenantFromHeaders } from '@/lib/tenant/headers'
import type { MunicipalityConfig } from '@/types'

type UserMunicipalityRow = {
  municipality_id: string | null
  municipality:
    | { slug: string | null }
    | { slug: string | null }[]
    | null
}

function getJoinedMunicipalitySlug(
  municipality: UserMunicipalityRow['municipality'],
): string | null {
  if (!municipality) return null
  if (Array.isArray(municipality)) return municipality[0]?.slug || null
  return municipality.slug || null
}

/**
 * Resuelve el municipio del ciudadano para la app instalada.
 *
 * Prioridad:
 * 1. Tenant de la URL actual, si viene de un subdominio municipal o ?tenant=.
 * 2. Perfil public.users del usuario autenticado, útil cuando la PWA se abre
 *    desde el dominio raíz o desde un acceso directo instalado.
 */
export async function getCitizenTenantForUser(
  userId: string,
): Promise<MunicipalityConfig | null> {
  const tenantFromRequest = getTenantFromHeaders()
  if (tenantFromRequest?.slug) {
    return (await getTenantConfigFromDB(tenantFromRequest.slug)) || tenantFromRequest
  }

  const adminClient = createAdminClient()
  const { data, error } = await adminClient
    .from('users')
    .select('municipality_id, municipality:municipalities(slug)')
    .eq('id', userId)
    .maybeSingle()

  if (error || !data) return null

  const row = data as unknown as UserMunicipalityRow
  const slug = getJoinedMunicipalitySlug(row.municipality)
  if (!slug) return null

  return getTenantConfigFromDB(slug)
}
