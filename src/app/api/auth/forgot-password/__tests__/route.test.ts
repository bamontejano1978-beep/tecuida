/** @jest-environment node */
/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Tests de POST /api/auth/forgot-password.
 *
 * La ruta responde siempre «enviado» para no revelar si un correo tiene
 * cuenta. La excepción es un fallo de ENVÍO (cuota de correos agotada):
 * callarlo deja al ciudadano esperando un enlace que no llegará nunca.
 */

jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }))
jest.mock('@/lib/admin/rate-limit', () => ({ checkRateLimitAsync: jest.fn() }))
jest.mock('@supabase/ssr', () => ({ createServerClient: jest.fn() }))
jest.mock('next/server', () => ({
  NextResponse: {
    redirect: jest.fn((url: string, status: number) => ({
      url,
      status,
      cookies: { set: jest.fn() },
    })),
  },
}))

import type { NextRequest } from 'next/server'
import { POST } from '../route'

const { checkRateLimitAsync } = jest.requireMock('@/lib/admin/rate-limit') as {
  checkRateLimitAsync: jest.Mock
}
const { createServerClient } = jest.requireMock('@supabase/ssr') as {
  createServerClient: jest.Mock
}
const { NextResponse } = jest.requireMock('next/server') as {
  NextResponse: { redirect: jest.Mock }
}

function makeRequest(email: string) {
  return {
    headers: new Headers({ host: 'villafrancadelosbarros.tecuida.group' }),
    cookies: { get: () => undefined, getAll: () => [], set: jest.fn() },
    formData: async () => ({ get: (key: string) => (key === 'email' ? email : null) }),
  } as unknown as NextRequest
}

function redirectedTo(): URL {
  const call = NextResponse.redirect.mock.calls.at(-1)
  if (!call) throw new Error('El handler no redirigió a ninguna parte')
  return new URL(call[0] as string)
}

beforeEach(() => {
  jest.clearAllMocks()
  process.env.NEXT_PUBLIC_BASE_DOMAIN = 'tecuida.group'
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
  checkRateLimitAsync.mockResolvedValue(null)
})

describe('recuperación de contraseña', () => {
  it('confirma el envío cuando Supabase acepta la petición', async () => {
    createServerClient.mockReturnValue({
      auth: { resetPasswordForEmail: jest.fn().mockResolvedValue({ error: null }) },
    })

    await POST(makeRequest('vecina@example.com'))

    const url = redirectedTo()
    expect(url.pathname).toBe('/recuperar')
    expect(url.searchParams.get('sent')).toBe('1')
  })

  it('avisa cuando la cuota de correos está agotada en lugar de fingir que se envió', async () => {
    createServerClient.mockReturnValue({
      auth: {
        resetPasswordForEmail: jest.fn().mockResolvedValue({
          error: { message: 'email rate limit exceeded' },
        }),
      },
    })
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {})

    await POST(makeRequest('vecina@example.com'))

    const url = redirectedTo()
    expect(url.pathname).toBe('/recuperar')
    expect(url.searchParams.get('error')).toContain('límite de envíos')
    expect(url.searchParams.get('sent')).toBeNull()
    consoleError.mockRestore()
  })

  it('no revela si el correo existe ante otros fallos', async () => {
    createServerClient.mockReturnValue({
      auth: {
        resetPasswordForEmail: jest.fn().mockResolvedValue({
          error: { message: 'User not found' },
        }),
      },
    })
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {})

    await POST(makeRequest('desconocido@example.com'))

    expect(redirectedTo().searchParams.get('sent')).toBe('1')
    consoleError.mockRestore()
  })
})
