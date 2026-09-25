/** @jest-environment node */
/* eslint-disable @typescript-eslint/no-explicit-any */

jest.mock('@/lib/admin/rate-limit', () => ({ checkRateLimitAsync: jest.fn() }))
jest.mock('@/lib/supabase/server', () => ({
  createAdminClient: jest.fn(),
  createClient: jest.fn(),
}))

import { GET } from '../route'

const { checkRateLimitAsync } = jest.requireMock('@/lib/admin/rate-limit') as {
  checkRateLimitAsync: jest.Mock
}
const { createAdminClient, createClient } = jest.requireMock('@/lib/supabase/server') as {
  createAdminClient: jest.Mock
  createClient: jest.Mock
}

const USER_ID = '44444444-0069-0000-0000-000000000004'
const MUNICIPALITY_ID = '11111111-0069-0000-0000-000000000001'
const APP_ID = '22222222-0069-0000-0000-000000000002'

const ASSIGNED_APP = {
  id: APP_ID,
  nombre: 'Reto 30',
  descripcion: 'Programa de 30 días',
  thumbnail_url: 'https://cdn.test/reto30.png',
  tipo: 'pwa',
  app_slug: 'reto30',
}

/**
 * Builder que emula el encadenamiento de PostgREST con resultados
 * por tabla. Registra las llamadas .eq() para poder asertar el hash
 * del código consultado.
 */
function mockAdminDb(opts: {
  municipalityId?: string | null
  codeRow?: unknown
  codeRowError?: { message: string }
  publishedRow?: unknown
}) {
  const eqCalls: Array<[string, unknown]> = []

  function chain(result: { data: unknown; error: unknown }) {
    const builder: any = {
      select: () => builder,
      eq: (column: string, value: unknown) => {
        eqCalls.push([column, value])
        return builder
      },
      limit: () => builder,
      maybeSingle: async () => result,
      single: async () => result,
    }
    return builder
  }

  const supabase = {
    from: jest.fn((table: string) => {
      if (table === 'users') {
        return chain({ data: { municipality_id: opts.municipalityId }, error: null })
      }
      if (table === 'municipal_invite_codes') {
        return chain({ data: opts.codeRow ?? null, error: opts.codeRowError ?? null })
      }
      if (table === 'municipality_applications') {
        return chain({ data: opts.publishedRow ?? null, error: null })
      }
      return chain({ data: null, error: null })
    }),
  }
  createAdminClient.mockReturnValue(supabase)
  return { supabase, eqCalls }
}

beforeEach(() => {
  jest.clearAllMocks()
  process.env.INVITE_CODE_PEPPER = 'test-pepper-with-at-least-thirty-two-characters'
  checkRateLimitAsync.mockResolvedValue(null)
  createClient.mockReturnValue({
    auth: { getUser: async () => ({ data: { user: { id: USER_ID, email: 'ana@test.com' } } }) },
  })
})

function makeRequest(search: string) {
  return new Request(`https://tecuida.group/api/ods/resolve${search}`)
}

it('exige sesión autenticada', async () => {
  createClient.mockReturnValue({
    auth: { getUser: async () => ({ data: { user: null } }) },
  })

  const response = await GET(makeRequest('?code=VI-ABCD-1234-EFGH-JKLM'))

  expect(response.status).toBe(401)
  expect(createAdminClient).not.toHaveBeenCalled()
})

it('rechaza un código demasiado corto', async () => {
  const response = await GET(makeRequest('?code=corto'))

  expect(response.status).toBe(422)
  expect(createAdminClient).not.toHaveBeenCalled()
})

it('rechaza al usuario sin municipio asignado', async () => {
  mockAdminDb({ municipalityId: null })

  const response = await GET(makeRequest('?code=VI-ABCD-1234-EFGH-JKLM'))

  expect(response.status).toBe(403)
})

it('resuelve la aplicación pre-asignada cuando el lote la tiene y está publicada', async () => {
  const { eqCalls } = mockAdminDb({
    municipalityId: MUNICIPALITY_ID,
    codeRow: {
      batch: {
        application_id: APP_ID,
        application: ASSIGNED_APP,
      },
    },
    publishedRow: { application_id: APP_ID },
  })

  const response = await GET(makeRequest('?code=vi-abcd-1234-efgh-jklm'))
  const data = await response.json()

  expect(response.status).toBe(200)
  expect(data).toEqual({ assigned: true, application: ASSIGNED_APP })

  // El hash consultado corresponde al código normalizado (64 hex)
  const hashPair = eqCalls.find(([column]) => column === 'code_hash')
  expect(hashPair?.[1]).toMatch(/^[0-9a-f]{64}$/)
})

it('devuelve assigned:false cuando el lote no tiene aplicación pre-asignada', async () => {
  mockAdminDb({
    municipalityId: MUNICIPALITY_ID,
    codeRow: {
      batch: {
        application_id: null,
        application: null,
      },
    },
  })

  const response = await GET(makeRequest('?code=VI-ABCD-1234-EFGH-JKLM'))
  const data = await response.json()

  expect(response.status).toBe(200)
  expect(data).toEqual({ assigned: false })
})

it('devuelve assigned:false cuando la app pre-asignada ya no está publicada en el municipio', async () => {
  mockAdminDb({
    municipalityId: MUNICIPALITY_ID,
    codeRow: {
      batch: {
        application_id: APP_ID,
        application: ASSIGNED_APP,
      },
    },
    publishedRow: null,
  })

  const response = await GET(makeRequest('?code=VI-ABCD-1234-EFGH-JKLM'))
  const data = await response.json()

  expect(response.status).toBe(200)
  expect(data).toEqual({ assigned: false })
})

it('devuelve assigned:false cuando el código no existe en el municipio del usuario', async () => {
  mockAdminDb({
    municipalityId: MUNICIPALITY_ID,
    codeRow: null,
  })

  const response = await GET(makeRequest('?code=VI-ABCD-1234-EFGH-JKLM'))
  const data = await response.json()

  expect(response.status).toBe(200)
  expect(data).toEqual({ assigned: false })
})

it('no filtra detalles de otros municipios: el código se busca con el municipio del usuario', async () => {
  const { eqCalls } = mockAdminDb({
    municipalityId: MUNICIPALITY_ID,
    codeRow: null,
  })

  await GET(makeRequest('?code=VI-ABCD-1234-EFGH-JKLM'))

  const municipalityPair = eqCalls.find(([column]) => column === 'municipality_id')
  expect(municipalityPair?.[1]).toBe(MUNICIPALITY_ID)
})
