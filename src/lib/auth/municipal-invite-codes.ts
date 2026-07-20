import 'server-only'

import { createHmac, randomBytes } from 'crypto'
import type { createAdminClient } from '@/lib/supabase/server'

type AdminClient = ReturnType<typeof createAdminClient>

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export function isInviteCodesConfigured(): boolean {
  return Boolean(process.env.INVITE_CODE_PEPPER && process.env.INVITE_CODE_PEPPER.length >= 32)
}

function getPepper(): string {
  const pepper = process.env.INVITE_CODE_PEPPER
  if (!isInviteCodesConfigured() || !pepper) {
    throw new Error('INVITE_CODE_PEPPER debe tener al menos 32 caracteres')
  }
  return pepper
}

export function normalizeInviteCode(code: string): string {
  return code.toUpperCase().replace(/[^A-Z0-9]/g, '')
}

export function hashInviteValue(value: string): string {
  return createHmac('sha256', getPepper())
    .update(value.trim().toLowerCase())
    .digest('hex')
}

export function hashInviteCode(code: string): string {
  return hashInviteValue(normalizeInviteCode(code))
}

export function generateMunicipalInviteCode(slug: string): string {
  const prefix = slug
    .replace(/[^a-z0-9]/gi, '')
    .slice(0, 2)
    .toUpperCase()
    .padEnd(2, 'X')
  const bytes = randomBytes(16)
  const body = Array.from(bytes, (byte) => CODE_ALPHABET[byte & 31]).join('')
  return `${prefix}-${body.slice(0, 4)}-${body.slice(4, 8)}-${body.slice(8, 12)}-${body.slice(12, 16)}`
}

export async function reserveMunicipalInviteCode(
  admin: AdminClient,
  municipalityId: string,
  code: string,
  email: string,
): Promise<{ token: string; emailHash: string } | null> {
  const emailHash = hashInviteValue(email)
  const { data, error } = await admin.rpc('reserve_municipal_invite_code', {
    p_municipality_id: municipalityId,
    p_code_hash: hashInviteCode(code),
    p_email_hash: emailHash,
  })
  if (error) throw new Error(error.message)
  const row = Array.isArray(data) ? data[0] : data
  const token = row && typeof row === 'object' && 'reservation_token' in row
    ? String(row.reservation_token)
    : null
  return token ? { token, emailHash } : null
}

export async function releaseMunicipalInviteCode(
  admin: AdminClient,
  token: string,
  email: string,
): Promise<void> {
  await admin.rpc('release_municipal_invite_code', {
    p_reservation_token: token,
    p_email_hash: hashInviteValue(email),
  })
}

export async function finalizeMunicipalInviteRegistration(
  admin: AdminClient,
  input: {
    token: string
    userId: string
    email: string
    alias?: string | null
    genero?: string | null
    anioNacimiento?: number | null
  },
): Promise<string> {
  const { data, error } = await admin.rpc('finalize_municipal_invite_registration', {
    p_reservation_token: input.token,
    p_user_id: input.userId,
    p_email: input.email,
    p_email_hash: hashInviteValue(input.email),
    p_alias: input.alias || null,
    p_genero: input.genero || null,
    p_anio_nacimiento: input.anioNacimiento || null,
  })
  if (error || !data) {
    throw new Error(error?.message || 'No se pudo consumir el código municipal')
  }
  return String(data)
}
