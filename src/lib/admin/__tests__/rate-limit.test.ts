jest.mock('next/server', () => ({
  NextResponse: {
    json: (_body: unknown, init?: ResponseInit) => ({
      status: init?.status ?? 200,
      headers: new Headers(init?.headers),
    }),
  },
}))

import { checkRateLimit } from '@/lib/admin/rate-limit'

function request(ip: string, path = '/api/test') {
  return {
    method: 'GET',
    url: `https://tecuida.group${path}`,
    headers: new Headers({ 'x-forwarded-for': ip }),
  } as Request
}

describe('checkRateLimit', () => {
  it('permite peticiones dentro del límite', () => {
    const namespace = `test:allow:${Date.now()}`
    expect(checkRateLimit(request('192.0.2.1'), { limit: 2, namespace })).toBeNull()
    expect(checkRateLimit(request('192.0.2.1'), { limit: 2, namespace })).toBeNull()
  })

  it('devuelve 429 al superar el límite', () => {
    const namespace = `test:block:${Date.now()}`
    expect(checkRateLimit(request('192.0.2.2'), { limit: 1, namespace })).toBeNull()
    const response = checkRateLimit(request('192.0.2.2'), { limit: 1, namespace })
    expect(response?.status).toBe(429)
    expect(response?.headers.get('Retry-After')).toBeTruthy()
  })

  it('aísla los contadores por IP', () => {
    const namespace = `test:ip:${Date.now()}`
    expect(checkRateLimit(request('192.0.2.3'), { limit: 1, namespace })).toBeNull()
    expect(checkRateLimit(request('192.0.2.4'), { limit: 1, namespace })).toBeNull()
  })
})
