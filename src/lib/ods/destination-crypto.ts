import 'server-only'

import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'
import { hashInviteValue } from '@/lib/auth/municipal-invite-codes'

/**
 * Cifrado del correo destino de los códigos ODS (migración 068).
 *
 * En base de datos solo se guardan:
 *  - `destination_email_hash`: HMAC-SHA256 con INVITE_CODE_PEPPER → campo de
 *    negocio, usado para la vinculación estricta código↔correo.
 *  - `destination_email_encrypted`: AES-256-GCM con ODS_DESTINATION_KEY → solo
 *    para reenvíos y gestión desde el panel; la verificación usa el hash.
 *
 * Formato del payload cifrado: base64(iv[12] || tag[16] || ciphertext).
 */

const IV_BYTES = 12
const TAG_BYTES = 16

export function isDestinationEncryptionConfigured(): boolean {
  const key = process.env.ODS_DESTINATION_KEY
  return Boolean(key && /^[0-9a-fA-F]{64}$/.test(key))
}

function getKey(): Buffer {
  const key = process.env.ODS_DESTINATION_KEY
  if (!isDestinationEncryptionConfigured() || !key) {
    throw new Error('ODS_DESTINATION_KEY debe ser una clave hex de 64 caracteres (32 bytes)')
  }
  return Buffer.from(key, 'hex')
}

export function normalizeDestinationEmail(email: string): string {
  return email.trim().toLowerCase()
}

export function hashDestinationEmail(email: string): string {
  return hashInviteValue(normalizeDestinationEmail(email))
}

export function encryptDestinationEmail(email: string): string {
  const iv = randomBytes(IV_BYTES)
  const cipher = createCipheriv('aes-256-gcm', getKey(), iv)
  const ciphertext = Buffer.concat([
    cipher.update(normalizeDestinationEmail(email), 'utf8'),
    cipher.final(),
  ])
  const tag = cipher.getAuthTag()
  return Buffer.concat([iv, tag, ciphertext]).toString('base64')
}

export function decryptDestinationEmail(payload: string): string | null {
  try {
    const raw = Buffer.from(payload, 'base64')
    if (raw.length <= IV_BYTES + TAG_BYTES) return null
    const iv = raw.subarray(0, IV_BYTES)
    const tag = raw.subarray(IV_BYTES, IV_BYTES + TAG_BYTES)
    const ciphertext = raw.subarray(IV_BYTES + TAG_BYTES)
    const decipher = createDecipheriv('aes-256-gcm', getKey(), iv)
    decipher.setAuthTag(tag)
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8')
  } catch {
    return null
  }
}
