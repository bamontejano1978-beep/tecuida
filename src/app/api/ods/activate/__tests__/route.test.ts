/** @jest-environment node */
/* eslint-disable @typescript-eslint/no-explicit-any */

jest.mock('@/lib/admin/rate-limit', () => ({ checkRateLimitAsync: jest.fn() }))
jest.mock('@/lib/supabase/server', () => ({
  createAdminClient: jest.fn(),
  createClient: jest.fn(),
}))

import { POST } from '../route'

const { checkRateLimitAsync } = jest.requireMock('@/lib/admin/rate-limit') as {
  checkRateLimitAsync: jest.Mock
}
const { createAdminClient, createClient } = jest.requireMock('@/lib/supabase/server') as {
  createAdminClient: jest.Mock
  createClient: jest.Mock
}

const USER_ID = '44444444-0068-0000-0000-000000000004'
const APP_ID = '22222222-0068-0000-0000-000000000002'
const EMAIL = 'ana@test.com'

function request(body: unknown) {
  return new Request('https://tecuida.group/api/ods/activate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function mockSession(email: string | null) {
  createClient.mockReturnValue({
    auth: { getUser: async () => ({ data: { user: email ? { id: USER_ID, email } : null } }) },
  })
}

function mockAdminRpc(impl: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>) {
  createAdminClient.mockReturnValue({ rpc: impl })
}

beforeEach(() => {
  jest.clearAllMocks()
  process.env.INVITE_CODE_PEPPER = 'test-pepper-with-at-least-thirty-two-characters'
  checkRateLimitAsync.mockResolvedValue(null)
})

it('exige sesión con correo para activar el código', async () => {
  mockSession(null)

  const response = await POST(
    request({ code: 'VI-ABCD-1234-EFGH-JKLM', application_id: APP_ID }),
  )

  expect(response.status).toBe(401)
  expect(createAdminClient).not.toHaveBeenCalled()
})

it('rechaza payloads inválidos', async () => {
  mockSession(EMAIL)

  const response = await POST(request({ code: 'corto', application_id: 'no-es-uuid' }))

  expect(response.status).toBe(422)
})

it('mapea el límite semanal a un mensaje claro', async () => {
  mockSession(EMAIL)
  mockAdminRpc(async () => ({ data: null, error: { message: 'WEEKLY_LIMIT_REACHED' } }))

  const response = await POST(
    request({ code: 'VI-ABCD-1234-EFGH-JKLM', application_id: APP_ID }),
  )

  expect(response.status).toBe(422)
  const data = await response.json()
  expect(data.error).toContain('semana')
})

it('mapea el correo que no coincide con el destino', async () => {
  mockSession(EMAIL)
  mockAdminRpc(async () => ({ data: null, error: { message: 'CODE_EMAIL_MISMATCH' } }))

  const response = await POST(
    request({ code: 'VI-ABCD-1234-EFGH-JKLM', application_id: APP_ID }),
  )

  const data = await response.json()
  expect(data.error).toContain('otro correo')
})

it('normaliza el código y pasa el hash a la función SQL', async () => {
  mockSession(EMAIL)
  const rpc = jest.fn(async () => ({ data: APP_ID, error: null }))
  createAdminClient.mockReturnValue({ rpc })

  await POST(request({ code: ' vi-abcd-1234-efgh-jklm ', application_id: APP_ID }))

  expect(rpc).toHaveBeenCalledWith(
    'activate_code_grant',
    expect.objectContaining({
      p_user_id: USER_ID,
      p_application_id: APP_ID,
    }),
  )
  const args = (rpc.mock.calls[0] as unknown[])[1] as Record<string, string>
  expect(args.p_code_hash).toMatch(/^[0-9a-f]{64}$/)
  expect(args.p_email_hash).toMatch(/^[0-9a-f]{64}$/)
})

it('devuelve la aplicación concedida tras una activación correcta', async () => {
  mockSession(EMAIL)
  mockAdminRpc(async () => ({ data: APP_ID, error: null }))

  const response = await POST(
    request({ code: 'VI-ABCD-1234-EFGH-JKLM', application_id: APP_ID }),
  )

  expect(response.status).toBe(200)
  const data = await response.json()
  expect(data.application_id).toBe(APP_ID)
})

// ── Flujo de app pre-asignada (migración 069) ──

describe('flujo de app pre-asignada en el lote', () => {
  it('permite activar sin application_id: la RPC recibe NULL y la app la resuelve el lote', async () => {
    mockSession(EMAIL)
    const rpc = jest.fn(async () => ({ data: APP_ID, error: null }))
    createAdminClient.mockReturnValue({ rpc })

    const response = await POST(request({ code: 'VI-ABCD-1234-EFGH-JKLM' }))

    expect(response.status).toBe(200)
    expect(rpc).toHaveBeenCalledWith(
      'activate_code_grant',
      expect.objectContaining({
        p_user_id: USER_ID,
        p_application_id: null,
      }),
    )
    const data = await response.json()
    expect(data.application_id).toBe(APP_ID)
  })

  it('acepta application_id explícito a null y lo reenvía como null', async () => {
    mockSession(EMAIL)
    const rpc = jest.fn(async () => ({ data: APP_ID, error: null }))
    createAdminClient.mockReturnValue({ rpc })

    const response = await POST(
      request({ code: 'VI-ABCD-1234-EFGH-JKLM', application_id: null }),
    )

    expect(response.status).toBe(200)
    expect(rpc).toHaveBeenCalledWith(
      'activate_code_grant',
      expect.objectContaining({ p_application_id: null }),
    )
  })

  it('mapea APP_REQUIRED a un mensaje claro cuando ni lote ni cliente indican app', async () => {
    mockSession(EMAIL)
    mockAdminRpc(async () => ({ data: null, error: { message: 'APP_REQUIRED' } }))

    const response = await POST(request({ code: 'VI-ABCD-1234-EFGH-JKLM' }))

    expect(response.status).toBe(422)
    const data = await response.json()
    expect(data.error).toContain('aplicación')
  })

  it('no confunde APP_REQUIRED con APP_NOT_AVAILABLE (claves de error similares)', async () => {
    mockSession(EMAIL)
    mockAdminRpc(async () => ({ data: null, error: { message: 'APP_NOT_AVAILABLE' } }))

    const response = await POST(
      request({ code: 'VI-ABCD-1234-EFGH-JKLM', application_id: APP_ID }),
    )

    expect(response.status).toBe(422)
    const data = await response.json()
    expect(data.error).not.toContain('Falta')
    expect(data.error).toContain('no está disponible')
  })
})
