import { createAdminClient } from '@/lib/supabase/server'
import { getTenantConfigFromDB } from '@/lib/tenant/headers'
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
 * La pertenencia del perfil prevalece sobre enlaces y preferencias de navegación.
 */
export async function getCitizenTenantForUser(
  userId: string,
): Promise<MunicipalityConfig | null> {
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

  const tenant = await getTenantConfigFromDB(slug)
  return tenant && !['suspendida', 'cancelada'].includes(tenant.estado_suscripcion) ? tenant : null
}
