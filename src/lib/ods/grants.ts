import 'server-only'

import { createAdminClient, createClient } from '@/lib/supabase/server'
import { hashInviteValue } from '@/lib/auth/municipal-invite-codes'

/**
 * Concesiones de acceso del programa ODS (migración 068).
 *
 * En modo `grant` (municipalities.grant_mode), un ciudadano solo ve y puede
 * abrir las aplicaciones con concesión activa en `user_app_grants`.
 * En modo `open` (resto de municipios) todo sigue como siempre.
 */

export type GrantMode = 'open' | 'grant'

export interface GrantRow {
  id: string
  application_id: string
  granted_at: string
  expires_at: string | null
  revoked_at: string | null
}

/** Grant_mode del municipio; 'open' si no se puede determinar. */
export async function getMunicipalityGrantMode(
  municipalityId: string,
): Promise<GrantMode> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('municipalities')
    .select('grant_mode')
    .eq('id', municipalityId)
    .maybeSingle()
  return (data?.grant_mode as GrantMode | undefined) || 'open'
}

export function grantIsActive(grant: Pick<GrantRow, 'revoked_at' | 'expires_at'>): boolean {
  return !grant.revoked_at && (!grant.expires_at || new Date(grant.expires_at) > new Date())
}

/** Concesiones activas de un usuario, opcionalmente filtradas por app. */
export async function listActiveGrants(
  userId: string,
  applicationId?: string,
): Promise<GrantRow[]> {
  const admin = createAdminClient()
  let query = admin
    .from('user_app_grants')
    .select('id, application_id, granted_at, expires_at, revoked_at')
    .eq('user_id', userId)
    .is('revoked_at', null)
    .or('expires_at.is.null,expires_at.gt.now()')
  if (applicationId) query = query.eq('application_id', applicationId)
  const { data } = await query
  return (data || []) as GrantRow[]
}

/** ¿Tiene el usuario una concesión activa para esta app? */
export async function hasActiveGrant(
  userId: string,
  applicationId: string,
): Promise<boolean> {
  const grants = await listActiveGrants(userId, applicationId)
  return grants.length > 0
}

/**
 * Comprueba el gating de una app para el usuario autenticado.
 * `applicationId` es el ID de la app ya resuelta por el llamante
 * (p. ej. vía `getPublicApplication`).
 * Devuelve null si el acceso está permitido (modo open, sin sesión o con
 * concesión activa) o la razón del bloqueo.
 */
export async function checkAppGrantAccess(
  applicationId: string,
): Promise<{ allowed: true } | { allowed: false; reason: 'no_session' | 'grant_required' }> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { allowed: true } // la sesión la exigen las páginas previas

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('users')
    .select('municipality_id')
    .eq('id', user.id)
    .maybeSingle()
  if (!profile?.municipality_id) return { allowed: true }

  const mode = await getMunicipalityGrantMode(profile.municipality_id)
  if (mode !== 'grant') return { allowed: true }

  const granted = await hasActiveGrant(user.id, applicationId)
  return granted ? { allowed: true } : { allowed: false, reason: 'grant_required' }
}

/**
 * Semana ISO en curso (Europe/Madrid), como fecha del lunes en formato `YYYY-MM-DD`.
 *
 * Usa `Intl.DateTimeFormat.formatToParts` para leer la fecha de calendario de
 * Madrid sin round-trips por `new Date(string)` (dependientes de la TZ local
 * del servidor). Coincide con `ods_week_monday()` de la migración 068.
 */
export function currentWeekMonday(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Madrid',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now)
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value)
  const calendarUtc = Date.UTC(get('year'), get('month') - 1, get('day'))
  const dayOfWeek = new Date(calendarUtc).getUTCDay() // 0 domingo … 6 sábado
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  return new Date(calendarUtc + diffToMonday * 86_400_000).toISOString().slice(0, 10)
}

export function hashParticipationEmail(email: string): string {
  return hashInviteValue(email.trim().toLowerCase())
}
