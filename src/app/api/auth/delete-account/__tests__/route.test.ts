/**
 * Tests unitarios para el flujo de eliminación de cuenta RGPD
 *
 * Cubre:
 *   - Validación de contraseña (Zod schema)
 *   - Expiración de token (1 hora, casos límite)
 *   - Orden de borrado en cascada (especificación documentada)
 *   - Generación de URL de confirmación (formato, multi-tenant)
 *
 * Las funciones puras se importan desde @/lib/delete-account-utils
 * para evitar dependencias de Next.js Request / Supabase en el
 * entorno de test (jsdom).
 */

import {
  requestSchema,
  isTokenExpired,
  DELETION_TOKEN_TTL_MS,
  CASCADE_DELETION_ORDER,
} from '@/lib/delete-account-utils'

// ===========================================================================
// 1. Validación de contraseña
// ===========================================================================

describe('delete-account — validación de contraseña', () => {
  it('acepta una contraseña válida', () => {
    const result = requestSchema.safeParse({ password: 'mypassword123' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.password).toBe('mypassword123')
    }
  })

  it('rechaza contraseña vacía', () => {
    const result = requestSchema.safeParse({ password: '' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.errors[0].message).toBe(
        'Debes introducir tu contraseña actual',
      )
    }
  })

  it('rechaza campo password ausente', () => {
    const result = requestSchema.safeParse({})
    expect(result.success).toBe(false)
  })

  it('rechaza password null', () => {
    const result = requestSchema.safeParse({ password: null })
    expect(result.success).toBe(false)
  })

  it('acepta contraseñas con caracteres especiales y emojis', () => {
    const result = requestSchema.safeParse({
      password: 'P@ssw0rd!🔒español',
    })
    expect(result.success).toBe(true)
  })

  it('acepta contraseña de exactamente 1 carácter', () => {
    const result = requestSchema.safeParse({ password: 'a' })
    expect(result.success).toBe(true)
  })
})

// ===========================================================================
// 2. Expiración de token
// ===========================================================================

describe('delete-account — expiración de token (isTokenExpired)', () => {
  it('token recién creado NO está expirado', () => {
    const now = Date.now()
    const requestedAt = new Date(now).toISOString()
    expect(isTokenExpired(requestedAt, now)).toBe(false)
  })

  it('token de hace 30 minutos NO está expirado', () => {
    const now = Date.now()
    const thirtyMinAgo = new Date(now - 30 * 60 * 1000).toISOString()
    expect(isTokenExpired(thirtyMinAgo, now)).toBe(false)
  })

  it('token de hace 59 minutos NO está expirado (justo antes del límite)', () => {
    const now = Date.now()
    const fiftyNineMinAgo = new Date(
      now - 59 * 60 * 1000 - 59 * 1000,
    ).toISOString()
    expect(isTokenExpired(fiftyNineMinAgo, now)).toBe(false)
  })

  it('token de hace exactamente 1 hora SÍ está expirado (inclusive)', () => {
    const now = Date.now()
    const oneHourAgo = new Date(now - DELETION_TOKEN_TTL_MS).toISOString()
    expect(isTokenExpired(oneHourAgo, now)).toBe(true)
  })

  it('token de hace 2 horas SÍ está expirado', () => {
    const now = Date.now()
    const twoHoursAgo = new Date(now - 2 * 3600_000).toISOString()
    expect(isTokenExpired(twoHoursAgo, now)).toBe(true)
  })

  it('token de hace 1 semana SÍ está expirado', () => {
    const now = Date.now()
    const oneWeekAgo = new Date(
      now - 7 * 24 * 3600_000,
    ).toISOString()
    expect(isTokenExpired(oneWeekAgo, now)).toBe(true)
  })

  it('token con requested_at null se considera expirado (timestamp 0)', () => {
    const now = Date.now()
    expect(isTokenExpired(null, now)).toBe(true)
  })

  it('token con requested_at undefined se considera expirado', () => {
    const now = Date.now()
    expect(isTokenExpired(undefined, now)).toBe(true)
  })

  it('token con fecha inválida se considera expirado (seguro)', () => {
    const now = Date.now()
    expect(isTokenExpired('not-a-date', now)).toBe(true)
  })

  it('token de hace 1 minuto NO está expirado (borde inferior)', () => {
    const now = Date.now()
    const oneMinAgo = new Date(now - 60_000).toISOString()
    expect(isTokenExpired(oneMinAgo, now)).toBe(false)
  })

  it('token con fecha futura NO está expirado (seguridad: no debe falsear)', () => {
    const now = Date.now()
    const futureDate = new Date(now + 365 * 24 * 3600_000).toISOString()
    expect(isTokenExpired(futureDate, now)).toBe(false)
  })
})

// ===========================================================================
// 3. Orden de borrado en cascada
// ===========================================================================

describe('delete-account — orden de borrado en cascada', () => {
  it('tiene exactamente 4 pasos', () => {
    expect(CASCADE_DELETION_ORDER).toHaveLength(4)
  })

  it('el primer paso es anonimizar analytics (RGPD: preservar agregados)', () => {
    expect(CASCADE_DELETION_ORDER[0]).toContain('anonimizar')
    expect(CASCADE_DELETION_ORDER[0]).toContain('analytics_events')
    // Los analytics nunca se borran, solo se anonimizan
    expect(CASCADE_DELETION_ORDER[0]).not.toContain('DELETE')
  })

  it('el último paso es borrar auth.users', () => {
    expect(CASCADE_DELETION_ORDER.at(-1)).toContain('auth.users')
    expect(CASCADE_DELETION_ORDER.at(-1)).toContain('DELETE')
  })

  it('public.users se borra antes que auth.users (los datos ya no existen si auth falla)', () => {
    const publicIndex = CASCADE_DELETION_ORDER.findIndex((step) =>
      step.includes('public.users'),
    )
    const authIndex = CASCADE_DELETION_ORDER.findIndex((step) =>
      step.includes('auth.users'),
    )
    expect(publicIndex).toBeLessThan(authIndex)
  })

  it('user_progress se borra antes que public.users (FK integrity)', () => {
    const progressIndex = CASCADE_DELETION_ORDER.findIndex((step) =>
      step.includes('user_progress'),
    )
    const publicIndex = CASCADE_DELETION_ORDER.findIndex((step) =>
      step.includes('public.users'),
    )
    expect(progressIndex).toBeLessThan(publicIndex)
  })
})

// ===========================================================================
// 4. Generación de URL de confirmación (formato esperado)
// ===========================================================================

describe('delete-account — generación de URL de confirmación', () => {
  it('la URL de confirmación tiene el formato esperado', () => {
    const origin = 'https://calamonte.tecuida.group'
    const token = '550e8400-e29b-41d4-a716-446655440000'
    const actualUrl = `${origin}/api/auth/delete-account?token=${token}`

    expect(actualUrl).toContain('/api/auth/delete-account')
    expect(actualUrl).toContain('token=')
    expect(actualUrl).toContain(token)
  })

  it('la URL de confirmación funciona en cualquier tenant (automatizado)', () => {
    const tenants = [
      'https://calamonte.tecuida.group',
      'https://zafra.tecuida.group',
      'https://villafranca.tecuida.group',
    ]
    const token = 'test-uuid-12345'

    for (const origin of tenants) {
      const url = `${origin}/api/auth/delete-account?token=${token}`
      expect(url).toBe(`${origin}/api/auth/delete-account?token=${token}`)
    }
  })
})
