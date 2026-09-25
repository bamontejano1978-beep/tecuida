/** @jest-environment node */
/* eslint-disable @typescript-eslint/no-explicit-any */

jest.mock('@/lib/supabase/server', () => ({ createAdminClient: jest.fn() }))

import { getGrantedApplicationIds } from '../gating'
import { currentWeekMonday, grantIsActive } from '../grants'

const { createAdminClient } = jest.requireMock('@/lib/supabase/server') as {
  createAdminClient: jest.Mock
}

const USER_ID = '44444444-0068-0000-0000-000000000004'
const MUNI_ID = '11111111-0068-0000-0000-000000000001'
const APP_A = '22222222-0068-0000-0000-000000000002'
const APP_B = '22222222-0068-0000-0000-000000000003'

function mockProfile(grantMode: string | null, withMunicipality = true) {
  createAdminClient.mockReturnValue({
    from: (table: string) => {
      if (table === 'users') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: withMunicipality
                  ? {
                      municipality_id: MUNI_ID,
                      municipality: grantMode === null ? null : { grant_mode: grantMode },
                    }
                  : null,
              }),
            }),
          }),
        }
      }
      if (table === 'user_app_grants') {
        return {
          select: () => ({
            eq: () => ({
              is: () => ({
                or: async () => ({
                  data: [
                    {
                      id: 'g1',
                      application_id: APP_A,
                      granted_at: new Date().toISOString(),
                      expires_at: null,
                      revoked_at: null,
                    },
                  ],
                }),
              }),
            }),
          }),
        }
      }
      throw new Error(`tabla inesperada: ${table}`)
    },
  })
}

describe('getGrantedApplicationIds', () => {
  beforeEach(() => jest.clearAllMocks())

  it('devuelve null en modo open (comportamiento histórico, sin filtrar)', async () => {
    mockProfile('open')
    expect(await getGrantedApplicationIds(USER_ID)).toBeNull()
  })

  it('devuelve null si el municipio usa el valor por defecto (columna antigua)', async () => {
    mockProfile(null)
    expect(await getGrantedApplicationIds(USER_ID)).toBeNull()
  })

  it('devuelve null si el usuario no tiene municipio', async () => {
    mockProfile('grant', false)
    expect(await getGrantedApplicationIds(USER_ID)).toBeNull()
  })

  it('devuelve el conjunto de apps concedidas en modo grant', async () => {
    mockProfile('grant')
    const ids = await getGrantedApplicationIds(USER_ID)
    expect(ids).toBeInstanceOf(Set)
    expect(ids!.has(APP_A)).toBe(true)
    expect(ids!.has(APP_B)).toBe(false)
  })
})

describe('grantIsActive', () => {
  it('true para concesión vigente sin caducidad', () => {
    expect(grantIsActive({ revoked_at: null, expires_at: null })).toBe(true)
  })

  it('false si está revocada', () => {
    expect(grantIsActive({ revoked_at: new Date().toISOString(), expires_at: null })).toBe(false)
  })

  it('false si está caducada y true si caduca en el futuro', () => {
    const past = new Date(Date.now() - 86_400_000).toISOString()
    const future = new Date(Date.now() + 86_400_000).toISOString()
    expect(grantIsActive({ revoked_at: null, expires_at: past })).toBe(false)
    expect(grantIsActive({ revoked_at: null, expires_at: future })).toBe(true)
  })
})

describe('currentWeekMonday', () => {
  it('devuelve el lunes de la semana ISO en Europe/Madrid', () => {
    // Miércoles 16-09-2026 → lunes 14-09-2026
    expect(currentWeekMonday(new Date('2026-09-16T12:00:00Z'))).toBe('2026-09-14')
    // Domingo 20-09-2026 21:59 UTC (23:59 en Madrid) → lunes 14-09-2026
    expect(currentWeekMonday(new Date('2026-09-20T21:59:00Z'))).toBe('2026-09-14')
    // Domingo 20-09-2026 22:01 UTC (00:01 del lunes en Madrid) → lunes 21-09-2026
    expect(currentWeekMonday(new Date('2026-09-20T22:01:00Z'))).toBe('2026-09-21')
    // Lunes 21-09-2026 → lunes 21-09-2026
    expect(currentWeekMonday(new Date('2026-09-21T10:00:00Z'))).toBe('2026-09-21')
  })
})
