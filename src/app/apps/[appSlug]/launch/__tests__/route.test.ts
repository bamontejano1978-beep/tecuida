/** @jest-environment node */
import { NextRequest } from 'next/server'
import { GET } from '../route'
import { getPublicApplication } from '@/lib/applications/public-application'

jest.mock('@/lib/applications/public-application', () => ({ getPublicApplication: jest.fn() }))
const request = () => new NextRequest('https://tecuida.group/apps/example/launch?access_token=private&redirect=https://untrusted.test')

test('does not forward query credentials to external applications', async () => {
  jest.mocked(getPublicApplication).mockResolvedValue({ id: 'app', app_slug: 'example', url_acceso: 'https://example.org/activity' } as never)
  const response = await GET(request(), { params: { appSlug: 'example' } })
  expect(response.headers.get('location')).toBe('https://example.org/activity')
})
test('keeps reviewed integrations in the municipal launcher', async () => {
  jest.mocked(getPublicApplication).mockResolvedValue({ id: 'app', app_slug: 'organizatron', url_acceso: 'https://organizatron-nine.vercel.app' } as never)
  const response = await GET(request(), { params: { appSlug: 'organizatron' } })
  expect(response.headers.get('location')).toBe('https://tecuida.group/apps/organizatron/run')
})
test('rejects unsafe configured URLs', async () => {
  jest.mocked(getPublicApplication).mockResolvedValue({ id: 'app', url_acceso: 'javascript:alert(1)' } as never)
  expect((await GET(request(), { params: { appSlug: 'example' } })).status).toBe(422)
})
