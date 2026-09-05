/** @jest-environment node */
import { POST } from '../route'
import { createAdminClient, createClient } from '@/lib/supabase/server'

jest.mock('@/lib/supabase/server', () => ({ createClient: jest.fn(), createAdminClient: jest.fn() }))
jest.mock('@/lib/admin/rate-limit', () => ({ checkRateLimitAsync: jest.fn().mockResolvedValue(null) }))
const id = '00000000-0000-4000-8000-000000000001'
const rpc = jest.fn().mockResolvedValue({ error: null })
const eq = jest.fn()
function setup(authenticated: boolean, assigned: boolean) {
  const query = { select: jest.fn().mockReturnThis(), eq, not: jest.fn().mockReturnThis(), maybeSingle: jest.fn() }
  eq.mockReturnValue(query)
  query.maybeSingle.mockResolvedValueOnce({ data: { municipality_id: 'municipality-1' } }).mockResolvedValueOnce({ data: assigned ? { application_id: id } : null })
  jest.mocked(createClient).mockReturnValue({ auth: { getUser: jest.fn().mockResolvedValue({ data: { user: authenticated ? { id: 'real-user' } : null } }) } } as never)
  jest.mocked(createAdminClient).mockReturnValue({ from: jest.fn().mockReturnValue(query), rpc } as never)
}
beforeEach(() => jest.clearAllMocks())
function request(body: unknown) { return new Request('http://localhost/api/citizen/applications', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }) }
test('requires authentication', async () => {
  setup(false, true)
  expect((await POST(request({ application_id: id, action: 'open' }))).status).toBe(401)
  expect(rpc).not.toHaveBeenCalled()
})
test('rejects applications outside the published municipal offer', async () => {
  setup(true, false)
  expect((await POST(request({ application_id: id, action: 'open' }))).status).toBe(403)
  expect(rpc).not.toHaveBeenCalled()
  expect(eq).toHaveBeenCalledWith('publication_status', 'publicada')
})
test('uses the authenticated identity, never a submitted user id', async () => {
  setup(true, true)
  expect((await POST(request({ application_id: id, action: 'favorite', favorite: true, user_id: 'attacker' }))).status).toBe(204)
  expect(rpc).toHaveBeenCalledWith('set_application_favorite', { p_user: 'real-user', p_application: id, p_favorite: true })
})
test('rejects invalid identifiers before mutating data', async () => {
  setup(true, true)
  expect((await POST(request({ application_id: 'bad', action: 'open' }))).status).toBe(422)
  expect(rpc).not.toHaveBeenCalled()
})
