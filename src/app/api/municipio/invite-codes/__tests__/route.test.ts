/** @jest-environment node */
/* eslint-disable @typescript-eslint/no-explicit-any */

jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }))
jest.mock('@/lib/admin/rate-limit', () => ({ checkRateLimitAsync: jest.fn() }))
jest.mock('@/lib/admin/activities', () => ({ getAdminAccess: jest.fn() }))
jest.mock('@/lib/supabase/server', () => ({ createAdminClient: jest.fn() }))
jest.mock('@/lib/ods/batch-app-capability', () => ({ getBatchCapability: jest.fn() }))

import { POST } from '../route'

const { checkRateLimitAsync } = jest.requireMock('@/lib/admin/rate-limit') as {
  checkRateLimitAsync: jest.Mock
}
const { getAdminAccess } = jest.requireMock('@/lib/admin/activities') as {
  getAdminAccess: jest.Mock
}
const { createAdminClient } = jest.requireMock('@/lib/supabase/server') as {
  createAdminClient: jest.Mock
}
const { getBatchCapability } = jest.requireMock('@/lib/ods/batch-app-capability') as {
  getBatchCapability: jest.Mock
}

const OWN_MUNICIPALITY = '11111111-1111-1111-1111-111111111111'
const OTHER_MUNICIPALITY = '22222222-2222-2222-2222-222222222222'
const USER_ID = '33333333-3333-3333-3333-333333333333'
const BATCH_ID = '44444444-4444-4444-4444-444444444444'
const APP_ID = '55555555-0700-5555-5555-555555555555'

function request(body: unknown) {
  return new Request('https://tecuida.group/api/municipio/invite-codes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  jest.clearAllMocks()
  process.env.INVITE_CODE_PEPPER = 'test-pepper-with-at-least-thirty-two-characters'
  checkRateLimitAsync.mockResolvedValue(null)
  // Por defecto, BD con migraciones 069/070 aplicadas.
  getBatchCapability.mockResolvedValue({ hasAppColumn: true, hasPurposeColumn: true })
})

function flexibleChain(result: { data: unknown; error: unknown }) {
  const builder: any = {
    select: () => builder,
    eq: () => builder,
    limit: () => builder,
    single: async () => result,
    maybeSingle: async () => result,
    then: (resolve: (value: unknown) => unknown) => Promise.resolve(result).then(resolve),
  }
  return builder
}

/**
 * Mock de Supabase para action=generate. Devuelve un ref con el payload del
 * lote insertado (o null si no llegó a insertarse) para que el test afirme.
 */
function mockGenerateSupabase(opts: { appPublished?: boolean } = {}) {
  const captured: { batch: Record<string, unknown> | null } = { batch: null }
  getAdminAccess.mockResolvedValue({
    is_superadmin: false,
    user_id: USER_ID,
    email: 'gestor@test.com',
    municipality_id: OWN_MUNICIPALITY,
  })
  const supabase = {
    from: jest.fn((table: string) => {
      if (table === 'municipalities') {
        return flexibleChain({ data: { id: OWN_MUNICIPALITY, slug: 'municipio-test' }, error: null })
      }
      if (table === 'municipality_applications') {
        return flexibleChain(
          opts.appPublished === false
            ? { data: null, error: null }
            : { data: { application_id: APP_ID }, error: null },
        )
      }
      if (table === 'municipal_invite_batches') {
        const builder = flexibleChain({ data: { id: BATCH_ID }, error: null })
        builder.insert = (value: Record<string, unknown>) => {
          captured.batch = value
          return builder
        }
        builder.delete = () => builder
        return builder
      }
      const builder = flexibleChain({ data: null, error: null })
      builder.insert = () => builder
      return builder
    }),
  }
  createAdminClient.mockReturnValue(supabase)
  return captured
}

it('rechaza usuarios sin rol administrativo municipal', async () => {
  getAdminAccess.mockResolvedValue(null)

  const response = await POST(request({
    action: 'generate',
    nombre: 'Lote',
    cantidad: 1,
    expires_in_days: 30,
  }))

  expect(response.status).toBe(401)
  expect(createAdminClient).not.toHaveBeenCalled()
})

it('reserva esta ruta para gestores municipales, no para superadministradores', async () => {
  getAdminAccess.mockResolvedValue({
    is_superadmin: true,
    user_id: USER_ID,
    email: 'admin@test.com',
    municipality_id: OTHER_MUNICIPALITY,
  })

  const response = await POST(request({
    action: 'generate',
    nombre: 'Lote',
    cantidad: 1,
    expires_in_days: 30,
  }))

  expect(response.status).toBe(403)
  expect(createAdminClient).not.toHaveBeenCalled()
})

it('genera siempre para el municipio de la sesión e ignora otro municipio enviado', async () => {
  getAdminAccess.mockResolvedValue({
    is_superadmin: false,
    user_id: USER_ID,
    email: 'gestor@test.com',
    municipality_id: OWN_MUNICIPALITY,
  })

  let insertedBatch: Record<string, unknown> | null = null
  let insertedCodes: Array<Record<string, unknown>> = []

  function chain(result: { data: unknown; error: unknown }) {
    const builder: any = {
      select: () => builder,
      eq: () => builder,
      single: async () => result,
      then: (resolve: (value: unknown) => unknown) => Promise.resolve(result).then(resolve),
    }
    return builder
  }

  const supabase = {
    from: jest.fn((table: string) => {
      if (table === 'municipalities') {
        return chain({ data: { id: OWN_MUNICIPALITY, slug: 'municipio-test' }, error: null })
      }
      if (table === 'municipal_invite_batches') {
        const builder = chain({ data: { id: BATCH_ID }, error: null })
        builder.insert = (value: Record<string, unknown>) => {
          insertedBatch = value
          return builder
        }
        builder.delete = () => builder
        return builder
      }
      const builder = chain({ data: null, error: null })
      builder.insert = (value: Array<Record<string, unknown>>) => {
        insertedCodes = value
        return builder
      }
      return builder
    }),
  }
  createAdminClient.mockReturnValue(supabase)

  const response = await POST(request({
    action: 'generate',
    nombre: 'Campaña verano',
    cantidad: 2,
    expires_in_days: 30,
    municipality_id: OTHER_MUNICIPALITY,
  }))
  const body = await response.json()

  expect(response.status).toBe(201)
  expect(insertedBatch).toEqual(expect.objectContaining({
    municipality_id: OWN_MUNICIPALITY,
    created_by: USER_ID,
  }))
  expect(insertedCodes).toHaveLength(2)
  expect(insertedCodes.every((row) => row.municipality_id === OWN_MUNICIPALITY)).toBe(true)
  expect(insertedCodes.every((row) => typeof row.code_value === 'string')).toBe(true)
  expect(insertedCodes.every((row) => !body.codes.includes(row.code_hash))).toBe(true)
})

// ── Categorías de códigos (migración 070) ─────────────────────────────────

describe('categorías de lotes (migración 070)', () => {
  it('genera un lote ODS con proposito y app pre-asignada', async () => {
    const captured = mockGenerateSupabase({ appPublished: true })

    const response = await POST(request({
      action: 'generate',
      nombre: 'Invitaciones ODS',
      cantidad: 2,
      expires_in_days: 30,
      proposito: 'ods',
      application_id: APP_ID,
    }))

    expect(response.status).toBe(201)
    expect(captured.batch).toEqual(expect.objectContaining({
      municipality_id: OWN_MUNICIPALITY,
      proposito: 'ods',
      application_id: APP_ID,
    }))
  })

  it('genera un lote ODS genérico (sin app) con proposito=ods', async () => {
    const captured = mockGenerateSupabase()

    const response = await POST(request({
      action: 'generate',
      nombre: 'Lote ODS clásico',
      cantidad: 2,
      expires_in_days: 30,
      proposito: 'ods',
    }))

    expect(response.status).toBe(201)
    expect(captured.batch).toEqual(expect.objectContaining({
      proposito: 'ods',
    }))
    expect(captured.batch).not.toHaveProperty('application_id')
  })

  it('rechaza un lote de acceso con application_id: la app solo en lotes ODS', async () => {
    const captured = mockGenerateSupabase()

    const response = await POST(request({
      action: 'generate',
      nombre: 'Lote acceso con app',
      cantidad: 2,
      expires_in_days: 30,
      application_id: APP_ID,
    }))
    const body = await response.json()

    expect(response.status).toBe(422)
    expect(body.error).toContain('programa ODS')
    expect(captured.batch).toBeNull()
  })

  it('rechaza proposito ods cuando la migración 070 no está aplicada', async () => {
    getBatchCapability.mockResolvedValue({ hasAppColumn: false, hasPurposeColumn: false })
    const captured = mockGenerateSupabase()

    const response = await POST(request({
      action: 'generate',
      nombre: 'Lote ODS sin 070',
      cantidad: 2,
      expires_in_days: 30,
      proposito: 'ods',
    }))
    const body = await response.json()

    expect(response.status).toBe(503)
    expect(body.error).toContain('070')
    expect(captured.batch).toBeNull()
  })
})
