/** @jest-environment node */
/* eslint-disable @typescript-eslint/no-explicit-any */

jest.mock('@/lib/supabase/server', () => ({ createAdminClient: jest.fn() }))
jest.mock('@/lib/admin/auth', () => ({ verifyAdminAccess: jest.fn() }))
jest.mock('@/lib/admin/rate-limit', () => ({ checkRateLimitAsync: jest.fn() }))

import { POST } from '../route'

const { createAdminClient } = jest.requireMock('@/lib/supabase/server') as {
  createAdminClient: jest.Mock
}
const { verifyAdminAccess } = jest.requireMock('@/lib/admin/auth') as {
  verifyAdminAccess: jest.Mock
}
const { checkRateLimitAsync } = jest.requireMock('@/lib/admin/rate-limit') as {
  checkRateLimitAsync: jest.Mock
}

const MUNICIPALITY_ID = '11111111-1111-1111-1111-111111111111'
const AUTH_USER_ID = '22222222-2222-2222-2222-222222222222'

function buildDb(responses: Array<{ data?: unknown; error?: unknown | null }>) {
  let index = 0
  const consume = () => responses[index++] ?? { data: null, error: null }
  const builder = new Proxy(function noop() {} as any, {
    get(_target, property) {
      if (property === 'then') {
        return (onFulfilled: any, onRejected: any) =>
          Promise.resolve(consume()).then(onFulfilled, onRejected)
      }
      if (property === 'single' || property === 'maybeSingle') {
        return () => Promise.resolve(consume())
      }
      return () => builder
    },
  })
  return builder
}

function request(body: unknown) {
  return new Request(`http://localhost/api/admin/municipalities/${MUNICIPALITY_ID}/managers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }) as any
}

beforeEach(() => {
  jest.clearAllMocks()
  checkRateLimitAsync.mockResolvedValue(null)
  verifyAdminAccess.mockResolvedValue({
    id: '33333333-3333-3333-3333-333333333333',
    email: 'admin@test.com',
    rol: 'superadmin',
  })
})

it('rechaza cuerpos de invitación inválidos antes de consultar la base de datos', async () => {
  const response = await POST(request({ action: 'invite', email: 'incorrecto' }), {
    params: { id: MUNICIPALITY_ID },
  })

  expect(response.status).toBe(422)
  expect(createAdminClient).not.toHaveBeenCalled()
})

it('indica que un ciudadano existente debe promocionarse desde la lista', async () => {
  const db = buildDb([
    { data: { id: MUNICIPALITY_ID, slug: 'test', nombre_municipio: 'Test' }, error: null },
    { data: [{ id: AUTH_USER_ID, municipality_id: MUNICIPALITY_ID, rol: 'ciudadano' }], error: null },
  ])
  createAdminClient.mockReturnValue({ from: () => db })

  const response = await POST(request({ action: 'invite', email: 'vecino@test.com' }), {
    params: { id: MUNICIPALITY_ID },
  })
  const body = await response.json()

  expect(response.status).toBe(409)
  expect(body.error).toContain('Hacer gestor')
})

it('invita, vincula y registra al nuevo gestor', async () => {
  const invitation = {
    id: '44444444-4444-4444-4444-444444444444',
    email: 'gestor@test.com',
    estado: 'pendiente',
    created_at: '2026-07-20T10:00:00.000Z',
    last_sent_at: '2026-07-20T10:00:00.000Z',
    accepted_at: null,
  }
  const db = buildDb([
    { data: { id: MUNICIPALITY_ID, slug: 'test', nombre_municipio: 'Test' }, error: null },
    { data: [], error: null },
    { data: [], error: null },
    { data: null, error: null },
    { data: invitation, error: null },
  ])
  const inviteUserByEmail = jest.fn().mockResolvedValue({
    data: { user: { id: AUTH_USER_ID } },
    error: null,
  })
  createAdminClient.mockReturnValue({
    from: () => db,
    auth: {
      admin: {
        inviteUserByEmail,
        deleteUser: jest.fn(),
      },
    },
  })

  const response = await POST(request({ action: 'invite', email: 'GESTOR@test.com' }), {
    params: { id: MUNICIPALITY_ID },
  })
  const body = await response.json()

  expect(response.status).toBe(201)
  expect(body.invitation).toEqual(invitation)
  expect(inviteUserByEmail).toHaveBeenCalledWith(
    'gestor@test.com',
    expect.objectContaining({
      redirectTo: 'http://localhost/auth/accept-invite',
      data: expect.objectContaining({ invitation_kind: 'municipal_manager' }),
    }),
  )
})
