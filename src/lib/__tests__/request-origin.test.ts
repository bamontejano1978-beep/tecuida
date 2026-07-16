import { getTrustedOrigin } from '@/lib/request-origin'

const ORIGINAL_ENV = process.env

describe('getTrustedOrigin', () => {
  const request = (url: string, host: string) => ({
    url,
    headers: new Headers({ host }),
  }) as Request

  beforeEach(() => {
    process.env = {
      ...ORIGINAL_ENV,
      NODE_ENV: 'production',
      NEXT_PUBLIC_BASE_DOMAIN: 'tecuida.group',
      NEXT_PUBLIC_SITE_URL: 'https://tecuida.group',
    }
  })

  afterAll(() => {
    process.env = ORIGINAL_ENV
  })

  it('conserva subdominios válidos del tenant', () => {
    expect(
      getTrustedOrigin(request('https://zafra.tecuida.group/register', 'zafra.tecuida.group')),
    ).toBe('https://zafra.tecuida.group')
  })

  it('rechaza un Host externo y usa el origen canónico', () => {
    expect(
      getTrustedOrigin(request('https://tecuida.group/register', 'evil.example')),
    ).toBe('https://tecuida.group')
  })

  it('permite localhost solo fuera de producción', () => {
    process.env = { ...process.env, NODE_ENV: 'development' }
    expect(
      getTrustedOrigin(request('http://localhost:3000/register', 'localhost:3000')),
    ).toBe('http://localhost:3000')
  })
})
