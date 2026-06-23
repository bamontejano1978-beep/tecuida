/**
 * Tests unitarios para buildAuthCookies() en src/lib/supabase/auth-cookies.ts
 *
 * Verifica:
 *  - Sesión pequeña (JSON ≤ 3180 chars) → 1 cookie con JSON crudo, sin sufijo de chunk
 *  - Sesión grande (JSON > 3180 chars) → chunking correcto con sufijos .0, .1, ...
 *  - combineChunks (join de valores) reconstruye el JSON original → JSON.parse exitoso
 */

import type { Session, User } from '@supabase/supabase-js'
import type { AuthCookie } from '@/lib/supabase/auth-cookies'
import { buildAuthCookies } from '@/lib/supabase/auth-cookies'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Usuario mínimo para una sesión pequeña */
function mockUser(overrides?: Partial<User>): User {
  return {
    id: '00000000-0000-0000-0000-000000000001',
    aud: 'authenticated',
    role: 'authenticated',
    email: 'ciudadano@test.com',
    phone: '',
    app_metadata: {},
    user_metadata: {},
    identities: [],
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
    ...overrides,
  } as User
}

/** Sesión pequeña (JSON < 3180 chars) — caso común */
function mockSmallSession(): Session {
  return {
    access_token: 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIwMDAwMDAwMCJ9.signature',
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: 1735689600,
    refresh_token: 'refresh-token-abc123',
    user: mockUser(),
  } as Session
}

/**
 * Sesión grande (JSON > 3180 chars) — obliga al chunking.
 * Rellenamos user_metadata con una cadena larga.
 */
function mockLargeSession(): Session {
  const longString = 'x'.repeat(3500)
  return {
    access_token: `eyJhbGciOiJIUzI1NiJ9.${longString}.signature`,
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: 1735689600,
    refresh_token: 'refresh-token-xyz789',
    user: mockUser({ user_metadata: { bio: longString } }),
  } as Session
}

/**
 * Simula combineChunks de @supabase/ssr: une los valores de cookie
 * tal cual (sin decodificar) y devuelve la cadena combinada.
 *
 * @supabase/ssr v0.3+ hace exactamente esto: getItem llama a
 * combineChunks que junta todos los chunks con join('').
 * Luego getItemAsync (auth-js) hace JSON.parse sobre el resultado.
 */
function combineChunks(cookies: AuthCookie[]): string {
  // buildAuthCookies emite los chunks en orden (.0, .1, .2…),
  // así que basta un join directo (mismo comportamiento que @supabase/ssr).
  return cookies.map((c) => c.value).join('')
}

// ---------------------------------------------------------------------------
// Configuración del entorno
// ---------------------------------------------------------------------------

beforeAll(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://testprojectref.supabase.co'
})

beforeEach(() => {
  jest.clearAllMocks()
})

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('buildAuthCookies — sesión pequeña (JSON ≤ 3180 chars)', () => {
  it('devuelve 1 sola cookie con el nombre base (sin sufijo de chunk)', () => {
    const session = mockSmallSession()
    const cookies = buildAuthCookies(session)

    expect(cookies).toHaveLength(1)
    expect(cookies[0].name).toBe('sb-testprojectref-auth-token')
  })

  it('el valor de la cookie es el JSON crudo de la sesión (sin prefijo base64-)', () => {
    const session = mockSmallSession()
    const cookies = buildAuthCookies(session)

    const parsed = JSON.parse(cookies[0].value)
    expect(parsed.access_token).toBe(session.access_token)
    expect(parsed.refresh_token).toBe(session.refresh_token)
    expect(parsed.user.email).toBe(session.user.email)

    // No debe contener el prefijo base64- antiguo
    expect(cookies[0].value).not.toContain('base64-')
  })

  it('las opciones de cookie son las estándar (path, sameSite, maxAge, secure)', () => {
    const session = mockSmallSession()
    const cookies = buildAuthCookies(session)

    expect(cookies[0].options.path).toBe('/')
    expect(cookies[0].options.sameSite).toBe('lax')
    expect(cookies[0].options.maxAge).toBe(60 * 60 * 24 * 365)
    expect(cookies[0].options.secure).toBe(false) // NODE_ENV no es production en tests
  })
})

describe('buildAuthCookies — sesión grande (JSON > 3180 chars)', () => {
  it('divide la sesión en múltiples cookies con sufijos .0, .1, ...', () => {
    const session = mockLargeSession()
    const cookies = buildAuthCookies(session)

    expect(cookies.length).toBeGreaterThan(1)
    expect(cookies[0].name).toBe('sb-testprojectref-auth-token.0')
    expect(cookies[1].name).toBe('sb-testprojectref-auth-token.1')
  })

  it('ningún chunk individual excede CHUNK_SIZE (3180 chars)', () => {
    const session = mockLargeSession()
    const cookies = buildAuthCookies(session)

    for (const cookie of cookies) {
      expect(cookie.value.length).toBeLessThanOrEqual(3180)
    }
  })

  it('cada chunk no contiene prefijo base64-', () => {
    const session = mockLargeSession()
    const cookies = buildAuthCookies(session)

    for (const cookie of cookies) {
      expect(cookie.value).not.toContain('base64-')
    }
  })
})

describe('buildAuthCookies — combineChunks reconstruye el JSON original', () => {
  it('combineChunks (join) + JSON.parse devuelve la sesión original (caso pequeño)', () => {
    const session = mockSmallSession()
    const cookies = buildAuthCookies(session)

    const combined = combineChunks(cookies)
    const recovered = JSON.parse(combined) as Session

    expect(recovered.access_token).toBe(session.access_token)
    expect(recovered.refresh_token).toBe(session.refresh_token)
    expect(recovered.user.email).toBe(session.user.email)
    expect(recovered.user.id).toBe(session.user.id)
  })

  it('combineChunks (join) + JSON.parse devuelve la sesión original (caso grande)', () => {
    const session = mockLargeSession()
    const cookies = buildAuthCookies(session)

    const combined = combineChunks(cookies)
    const recovered = JSON.parse(combined) as Session

    expect(recovered.access_token).toBe(session.access_token)
    expect(recovered.refresh_token).toBe(session.refresh_token)
    expect(recovered.user.id).toBe(session.user.id)
    expect(recovered.user.user_metadata.bio).toBe(
      session.user.user_metadata.bio,
    )
  })

  it('la sesión recuperada del caso grande es idéntica al original (deep equal)', () => {
    const session = mockLargeSession()
    const cookies = buildAuthCookies(session)

    const combined = combineChunks(cookies)
    const recovered = JSON.parse(combined)

    // Comparación profunda: la sesión recuperada debe ser idéntica
    expect(recovered).toEqual(session)
  })
})
