/**
 * Tests unitarios para el middleware raíz de Next.js.
 *
 * Verifica:
 *  - Protección de rutas: /app/*, /perfil, /dashboard → redirect /login sin sesión
 *  - Rutas públicas (/login, /register, /auth/*) pasan sin verificación
 *  - Rutas de error (/404, /suspendido) pasan sin verificación
 *  - Query params redirect y tenant se incluyen correctamente en el redirect
 *  - Con sesión activa, la request pasa y recibe headers de tenant
 *  - Sin tenant (dominio raíz) pasa a landing page
 *  - Tenant no encontrado → redirect /404
 *  - Suscripción suspendida → redirect /suspendido
 *
 * NOTA: Se mockea 'next/server' completo porque jest.spyOn no funciona
 * con módulos transpilados por SWC (Next.js). Usamos jest.fn() directo.
 */

import type { MunicipalityConfig } from '@/types'
import type { User } from '@supabase/supabase-js'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock('@/lib/supabase/middleware', () => ({
  updateSession: jest.fn(),
}))

jest.mock('@/lib/tenant/cache', () => ({
  tenantCache: {
    get: jest.fn(),
    set: jest.fn(),
  },
}))

jest.mock('@supabase/ssr', () => ({
  createServerClient: jest.fn(),
}))

/**
 * Mock completo de 'next/server'. Next.js compila con SWC lo que rompe
 * jest.spyOn sobre NextResponse.redirect / NextResponse.next.
 *
 * NO usamos jest.requireActual porque jsdom no tiene la global `Request`
 * que NextRequest necesita, y eso rompería el require del módulo real.
 */
jest.mock('next/server', () => {
  // Helpers para construir NextResponse-like objects
  function makeNextResponse(
    init: { status: number; headers: [string, string][] },
  ) {
    const headers = new Map<string, string>(init.headers)
    return {
      status: init.status,
      headers: {
        get: (name: string) => headers.get(name.toLowerCase()) ?? null,
        set: (name: string, value: string) =>
          headers.set(name.toLowerCase(), value),
      },
      cookies: {
        getAll: jest.fn().mockReturnValue([]),
        set: jest.fn(),
      },
    }
  }

  const mockNext = jest
    .fn()
    .mockImplementation(
      (opts?: { request?: { headers?: Record<string, string> | Headers } }) => {
        const raw = opts?.request?.headers
        let reqHeaders: [string, string][] = []
        if (raw) {
          // Headers no es enumerable con Object.entries — usar iterador
          reqHeaders =
            typeof (raw as Headers).entries === 'function'
              ? (Array.from(raw as Headers) as [string, string][])
              : (Object.entries(raw as Record<string, string>))
        }
        return makeNextResponse({
          status: 200,
          headers: reqHeaders,
        })
      },
    )

  const mockRedirect = jest.fn().mockImplementation((url: URL | string) => {
    const urlStr = typeof url === 'string' ? url : url.toString()
    return makeNextResponse({
      status: 307,
      headers: [['location', urlStr]],
    })
  })

  return {
    NextResponse: {
      next: mockNext,
      redirect: mockRedirect,
    },
    NextRequest: jest.fn().mockImplementation((url: URL | string) => {
      const parsedUrl = typeof url === 'string' ? new URL(url) : url
      // headers debe ser iterable (para new Headers()) Y tener .get()
      const headerEntries: [string, string][] = [['host', parsedUrl.host]]
      const headers = Object.assign(headerEntries, {
        get: (name: string) => {
          const found = headerEntries.find(
            ([k]) => k.toLowerCase() === name.toLowerCase(),
          )
          return found ? found[1] : null
        },
      })
      return {
        nextUrl: parsedUrl,
        url: parsedUrl.toString(),
        headers,
        cookies: {
          getAll: jest.fn().mockReturnValue([]),
          get: jest.fn(),
          set: jest.fn(),
        },
      }
    }),
  }
})

// Importamos los módulos mockeados para controlar sus retornos
import { updateSession } from '@/lib/supabase/middleware'
import { tenantCache } from '@/lib/tenant/cache'
import { NextResponse, NextRequest } from 'next/server'

// Ahora importamos el middleware (los mocks ya están activos)
import { middleware } from '../middleware'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Usuario mínimo para simular sesión activa */
function mockUser(): User {
  return {
    id: '00000000-0000-0000-0000-000000000001',
    aud: 'authenticated',
    role: 'authenticated',
    email: 'ciudadano@test.com',
    phone: '',
    app_metadata: {},
    user_metadata: {},
    identities: [],
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  } as User
}

/** Configuración mínima de municipio para tests con sesión */
function mockConfig(overrides?: Partial<MunicipalityConfig>): MunicipalityConfig {
  return {
    id: 'tenant-1',
    slug: 'calamonte',
    nombre_municipio: 'Calamonte',
    nombre_ayuntamiento: 'Ayuntamiento de Calamonte',
    dominio: 'calamonte.tecuida.group',
    escudo_url: '',
    logo_url: '',
    hero_image_url: '',
    colores_corporativos: {
      primary: '#003087',
      secondary: '#0070f3',
      accent: '#f5a623',
      background: '#ffffff',
      text: '#111111',
    },
    imagenes_municipio: [],
    textos_institucionales: {
      bienvenida: 'Bienvenido',
      descripcion: 'Portal municipal',
      pie_pagina: 'Pie de página',
    },
    modulos_activos: [],
    estado_suscripcion: 'activa',
    ...overrides,
  }
}

/** Construye un NextRequest con el hostname y pathname dados */
function makeRequest(url: string): NextRequest {
  return new NextRequest(new URL(url)) as unknown as NextRequest
}

/** Respuesta por defecto de updateSession (NextResponse simple con cookies vacías) */
function defaultSessionResponse(user: User | null = null) {
  return {
    response: NextResponse.next(),
    user,
  }
}

// ---------------------------------------------------------------------------
// Configuración del entorno
// ---------------------------------------------------------------------------

beforeAll(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key'
})

beforeEach(() => {
  jest.clearAllMocks()
  // Por defecto: updateSession devuelve sin usuario (no autenticado)
  ;(updateSession as jest.Mock).mockResolvedValue(defaultSessionResponse(null))
  // Por defecto: caché vacía
  ;(tenantCache.get as jest.Mock).mockResolvedValue(null)
})

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Protección de rutas autenticadas', () => {
  // ----- Rutas protegidas sin sesión -----

  it('redirige /app/123 a /login con tenant y redirect cuando no hay sesión', async () => {
    const req = makeRequest('https://calamonte.tecuida.group/app/123')

    await middleware(req)

    expect(NextResponse.redirect).toHaveBeenCalledTimes(1)
    const redirectUrl = (NextResponse.redirect as jest.Mock).mock.calls[0][0] as URL
    expect(redirectUrl.pathname).toBe('/login')
    expect(redirectUrl.searchParams.get('tenant')).toBe('calamonte')
    expect(redirectUrl.searchParams.get('redirect')).toBe('/app/123')
  })

  it('redirige /perfil a /login con tenant y redirect cuando no hay sesión', async () => {
    const req = makeRequest('https://calamonte.tecuida.group/perfil')

    await middleware(req)

    expect(NextResponse.redirect).toHaveBeenCalledTimes(1)
    const redirectUrl = (NextResponse.redirect as jest.Mock).mock.calls[0][0] as URL
    expect(redirectUrl.pathname).toBe('/login')
    expect(redirectUrl.searchParams.get('tenant')).toBe('calamonte')
    expect(redirectUrl.searchParams.get('redirect')).toBe('/perfil')
  })

  it('redirige /dashboard a /login con tenant y redirect cuando no hay sesión', async () => {
    const req = makeRequest('https://calamonte.tecuida.group/dashboard')

    await middleware(req)

    expect(NextResponse.redirect).toHaveBeenCalledTimes(1)
    const redirectUrl = (NextResponse.redirect as jest.Mock).mock.calls[0][0] as URL
    expect(redirectUrl.pathname).toBe('/login')
    expect(redirectUrl.searchParams.get('redirect')).toBe('/dashboard')
  })

  // ----- Rutas protegidas con sesión -----

  it('permite /app/123 cuando el usuario tiene sesión activa', async () => {
    ;(updateSession as jest.Mock).mockResolvedValue(
      defaultSessionResponse(mockUser()),
    )
    ;(tenantCache.get as jest.Mock).mockResolvedValue(mockConfig())

    const req = makeRequest('https://calamonte.tecuida.group/app/123')

    const res = await middleware(req)

    // No debe redirigir → debe devolver 200 con headers de tenant
    expect(NextResponse.redirect).not.toHaveBeenCalled()
    expect(res.headers.get('x-tenant-slug')).toBe('calamonte')
    expect(res.headers.get('x-tenant-name')).toBe('Calamonte')
  })

  // ----- Rutas públicas: no deben verificar auth -----

  it('permite /login sin verificar autenticación (evita bucle)', async () => {
    const req = makeRequest('https://calamonte.tecuida.group/login')

    const res = await middleware(req)

    // Debe devolver la respuesta de updateSession directamente (paso 2)
    expect(res.status).toBe(200)
    expect(NextResponse.redirect).not.toHaveBeenCalled()
  })

  it('permite /register sin verificar autenticación', async () => {
    const req = makeRequest('https://calamonte.tecuida.group/register')

    const res = await middleware(req)

    expect(res.status).toBe(200)
    expect(NextResponse.redirect).not.toHaveBeenCalled()
  })

  it('permite /auth/callback sin verificar autenticación', async () => {
    const req = makeRequest('https://calamonte.tecuida.group/auth/callback')

    const res = await middleware(req)

    expect(res.status).toBe(200)
    expect(NextResponse.redirect).not.toHaveBeenCalled()
  })

  // ----- Rutas de error: no deben verificar auth -----

  it('permite /404 sin verificar autenticación (evita bucle)', async () => {
    const req = makeRequest('https://calamonte.tecuida.group/404')

    const res = await middleware(req)

    expect(res.status).toBe(200)
    expect(NextResponse.redirect).not.toHaveBeenCalled()
  })

  it('permite /suspendido sin verificar autenticación', async () => {
    const req = makeRequest('https://calamonte.tecuida.group/suspendido')

    const res = await middleware(req)

    expect(res.status).toBe(200)
  })

  // ----- Assets públicos: no deben verificar auth ni tenant -----

  it('permite /_next/static/chunk.js sin verificar tenant', async () => {
    const req = makeRequest('https://tecuida.es/_next/static/chunk.js')

    const res = await middleware(req)

    expect(res.status).toBe(200)
    expect(tenantCache.get).not.toHaveBeenCalled()
  })

  it('permite /favicon.ico sin resolución de tenant', async () => {
    const req = makeRequest('https://tecuida.es/favicon.ico')

    const res = await middleware(req)

    expect(res.status).toBe(200)
  })
})

describe('Resolución de tenant', () => {
  // ----- Sin tenant (dominio raíz) -----

  it('pasa la request sin modificar cuando no hay tenant (dominio raíz)', async () => {
    ;(updateSession as jest.Mock).mockResolvedValue(defaultSessionResponse(null))

    const req = makeRequest('https://tecuida.es/')

    const res = await middleware(req)

    // Debe pasar al landing page
    expect(res.status).toBe(200)
    // No debe intentar resolver tenant
    expect(tenantCache.get).not.toHaveBeenCalled()
  })

  // ----- Tenant no encontrado -----

  it('redirige a /404 cuando el tenant no existe y el usuario tiene sesión', async () => {
    ;(updateSession as jest.Mock).mockResolvedValue(
      defaultSessionResponse(mockUser()),
    )
    // Cache vacía + DB mock sin configurar → resolveTenant hace catch → null
    ;(tenantCache.get as jest.Mock).mockResolvedValue(null)

    const req = makeRequest('https://inexistente.tecuida.group/')

    await middleware(req)

    // Con usuario autenticado, el check de auth pasa.
    // Al resolver tenant y no encontrarlo → redirect /404?slug=inexistente
    expect(NextResponse.redirect).toHaveBeenCalledTimes(1)
    const redirectUrl = (NextResponse.redirect as jest.Mock).mock.calls[0][0] as URL
    expect(redirectUrl.pathname).toBe('/404')
    expect(redirectUrl.searchParams.get('slug')).toBe('inexistente')
  })

  it('redirige a /login cuando no hay sesión en tenant inexistente (auth check primero)', async () => {
    // Sin usuario → el check de auth en paso 3 redirige a /login
    // ANTES de intentar resolver el tenant
    ;(updateSession as jest.Mock).mockResolvedValue(defaultSessionResponse(null))

    const req = makeRequest('https://inexistente.tecuida.group/perfil')

    await middleware(req)

    expect(NextResponse.redirect).toHaveBeenCalledTimes(1)
    const redirectUrl = (NextResponse.redirect as jest.Mock).mock.calls[0][0] as URL
    expect(redirectUrl.pathname).toBe('/login')
    // El tenant se preserva aunque no exista
    expect(redirectUrl.searchParams.get('tenant')).toBe('inexistente')
    expect(redirectUrl.searchParams.get('redirect')).toBe('/perfil')
  })
})

describe('Suscripción suspendida o cancelada', () => {
  it('redirige a /suspendido cuando el tenant tiene suscripción suspendida', async () => {
    ;(updateSession as jest.Mock).mockResolvedValue(
      defaultSessionResponse(mockUser()),
    )
    ;(tenantCache.get as jest.Mock).mockResolvedValue(
      mockConfig({ estado_suscripcion: 'suspendida' }),
    )

    const req = makeRequest('https://calamonte.tecuida.group/')

    await middleware(req)

    expect(NextResponse.redirect).toHaveBeenCalledTimes(1)
    const redirectUrl = (NextResponse.redirect as jest.Mock).mock.calls[0][0] as URL
    expect(redirectUrl.pathname).toBe('/suspendido')
    expect(redirectUrl.searchParams.get('tenant')).toBe('calamonte')
  })

  it('redirige a /suspendido cuando el tenant tiene suscripción cancelada', async () => {
    ;(updateSession as jest.Mock).mockResolvedValue(
      defaultSessionResponse(mockUser()),
    )
    ;(tenantCache.get as jest.Mock).mockResolvedValue(
      mockConfig({ estado_suscripcion: 'cancelada' }),
    )

    const req = makeRequest('https://calamonte.tecuida.group/')

    await middleware(req)

    expect(NextResponse.redirect).toHaveBeenCalledTimes(1)
    const redirectUrl = (NextResponse.redirect as jest.Mock).mock.calls[0][0] as URL
    expect(redirectUrl.pathname).toBe('/suspendido')
  })
})

describe('Query params en redirect', () => {
  it('preserva query params existentes en el redirect URL', async () => {
    const req = makeRequest(
      'https://calamonte.tecuida.group/app/123?foo=bar&baz=qux',
    )

    await middleware(req)

    expect(NextResponse.redirect).toHaveBeenCalledTimes(1)
    const redirectUrl = (NextResponse.redirect as jest.Mock).mock.calls[0][0] as URL
    expect(redirectUrl.searchParams.get('redirect')).toBe(
      '/app/123?foo=bar&baz=qux',
    )
  })

  it('incluye solo redirect cuando no hay query params en la ruta original', async () => {
    const req = makeRequest('https://calamonte.tecuida.group/dashboard')

    await middleware(req)

    const redirectUrl = (NextResponse.redirect as jest.Mock).mock.calls[0][0] as URL
    expect(redirectUrl.searchParams.get('redirect')).toBe('/dashboard')
  })
})

describe('Desarrollo local — tenant por query param', () => {
  it('extrae el tenant desde ?tenant= en localhost', async () => {
    ;(updateSession as jest.Mock).mockResolvedValue(
      defaultSessionResponse(mockUser()),
    )
    ;(tenantCache.get as jest.Mock).mockResolvedValue(
      mockConfig({ slug: 'calamonte' }),
    )

    const req = makeRequest('http://localhost:3000/?tenant=calamonte')

    const res = await middleware(req)

    expect(res.headers.get('x-tenant-slug')).toBe('calamonte')
  })

  it('redirige a /login con tenant desde ?tenant= en localhost', async () => {
    const req = makeRequest('http://localhost:3000/app/123?tenant=calamonte')

    await middleware(req)

    expect(NextResponse.redirect).toHaveBeenCalledTimes(1)
    const redirectUrl = (NextResponse.redirect as jest.Mock).mock.calls[0][0] as URL
    expect(redirectUrl.searchParams.get('tenant')).toBe('calamonte')
    expect(redirectUrl.searchParams.get('redirect')).toBe(
      '/app/123?tenant=calamonte',
    )
  })
})

describe('Headers de tenant en respuesta exitosa', () => {
  it('inyecta todos los headers x-tenant-* cuando el tenant se resuelve correctamente', async () => {
    ;(updateSession as jest.Mock).mockResolvedValue(
      defaultSessionResponse(mockUser()),
    )
    ;(tenantCache.get as jest.Mock).mockResolvedValue(
      mockConfig({
        id: 'uuid-tenant-1',
        slug: 'calamonte',
        nombre_municipio: 'Calamonte',
        dominio: 'calamonte.tecuida.group',
        estado_suscripcion: 'activa',
      }),
    )

    const req = makeRequest('https://calamonte.tecuida.group/')

    const res = await middleware(req)

    expect(res.headers.get('x-tenant-id')).toBe('uuid-tenant-1')
    expect(res.headers.get('x-tenant-slug')).toBe('calamonte')
    expect(res.headers.get('x-tenant-name')).toBe('Calamonte')
    expect(res.headers.get('x-tenant-domain')).toBe('calamonte.tecuida.group')
    expect(res.headers.get('x-tenant-subscription-status')).toBe('activa')
    // x-tenant-subscription-type ya no se inyecta (sin planes)
  })
})
