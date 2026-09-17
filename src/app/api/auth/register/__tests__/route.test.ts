/** @jest-environment node */
/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Tests del route handler POST /api/auth/register.
 *
 * Cubren los dos fallos reales detectados en producción sobre el portal de
 * Villafranca de los Barros:
 *
 *  1. El ciudadano veía «No se pudo crear la cuenta con esos datos.» cuando su
 *     correo ya tenía cuenta (Supabase responde con `identities: []` en lugar
 *     de un error). Ahora el mensaje explica qué pasa y cómo entrar.
 *  2. Entrar por `villafranca-de-los-barros.tecuida.group` (la forma con
 *     guiones, que sí responde en el frontend) rompía el alta con «Municipio
 *     no encontrado.» porque el handler no resolvía los alias de subdominio.
 */

jest.mock('server-only', () => ({}))
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }))
jest.mock('@/lib/admin/rate-limit', () => ({ checkRateLimitAsync: jest.fn() }))
jest.mock('@/lib/supabase/server', () => ({ createAdminClient: jest.fn() }))
jest.mock('@supabase/ssr', () => ({ createServerClient: jest.fn() }))
jest.mock('@/lib/supabase/auth-cookies', () => ({ buildAuthCookies: jest.fn(() => []) }))

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
const { createAdminClient } = jest.requireMock('@/lib/supabase/server') as {
  createAdminClient: jest.Mock
}
const { createServerClient } = jest.requireMock('@supabase/ssr') as {
  createServerClient: jest.Mock
}
const { NextResponse } = jest.requireMock('next/server') as {
  NextResponse: { redirect: jest.Mock }
}

// ---------------------------------------------------------------------------
// Datos de prueba
// ---------------------------------------------------------------------------

const VILLAFRANCA = {
  id: 'e0000001-0000-0000-0000-000000000005',
  slug: 'villafrancadelosbarros',
  invite_codes_required: false,
}

const MACONDO = {
  id: 'e0000001-0000-0000-0000-000000000009',
  slug: 'macondo',
  invite_codes_required: true,
}

const USER_ID = '57937d69-7989-4e40-bcc7-780a77e9d3da'

/** Municipios resolubles por slug (los alias no son filas de la tabla). */
const MUNICIPALITIES: Record<string, typeof VILLAFRANCA> = {
  [VILLAFRANCA.slug]: VILLAFRANCA,
  [MACONDO.slug]: MACONDO,
}

// ---------------------------------------------------------------------------
// Dobles de la base de datos
// ---------------------------------------------------------------------------

type FakeOptions = {
  /** Cuentas que devolverá `auth.admin.listUsers` (para el correo existente). */
  authUsers?: Array<Record<string, unknown>>
  /** Si el ciudadano ya tiene fila en `public.users`. */
  existingProfile?: string | null
  /** Error a devolver al insertar el perfil. */
  insertError?: { message: string } | null
}

function makeAdminClient(options: FakeOptions = {}) {
  const slugQueries: string[] = []
  const inserts: Array<{ table: string; value: Record<string, unknown> }> = []
  const deleted: string[] = []

  const from = (table: string) => {
    let slug: string | null = null

    const result = () => {
      if (table === 'municipalities') {
        const row = slug ? MUNICIPALITIES[slug] : undefined
        return row ? { data: row, error: null } : { data: null, error: { message: 'Not found' } }
      }
      if (table === 'users') {
        return {
          data: options.existingProfile ? { id: options.existingProfile } : null,
          error: null,
        }
      }
      return { data: null, error: null }
    }

    const builder: any = {
      select: () => builder,
      eq: (column: string, value: unknown) => {
        if (table === 'municipalities' && column === 'slug') {
          slug = String(value)
          slugQueries.push(slug)
        }
        return builder
      },
      not: () => builder,
      in: () => builder,
      order: () => builder,
      limit: () => builder,
      single: async () => result(),
      maybeSingle: async () => result(),
      insert: (value: Record<string, unknown>) => {
        inserts.push({ table, value })
        return Promise.resolve({ data: null, error: options.insertError ?? null })
      },
      update: () => builder,
    }

    return builder
  }

  const client = {
    from,
    rpc: async () => ({ data: null, error: null }),
    auth: {
      admin: {
        listUsers: async () => ({
          data: { users: options.authUsers ?? [] },
          error: null,
        }),
        createUser: async () => ({ data: { user: null }, error: null }),
        updateUserById: async () => ({ data: { user: null }, error: null }),
        deleteUser: async (id: string) => {
          deleted.push(id)
          return { data: null, error: null }
        },
      },
    },
    slugQueries,
    inserts,
    deleted,
  }

  return client
}

function makeRequest(options: {
  host: string
  fields: Record<string, string>
  tenant?: string
}) {
  const url = `https://${options.host}/api/auth/register${options.tenant ? `?tenant=${options.tenant}` : ''}`
  const fields = options.fields

  return {
    headers: new Headers({ host: options.host }),
    nextUrl: new URL(url),
    cookies: { get: () => undefined, getAll: () => [], set: jest.fn() },
    formData: async () => ({ get: (key: string) => fields[key] ?? null }),
  } as unknown as NextRequest
}

function redirectedTo(): URL {
  const call = NextResponse.redirect.mock.calls.at(-1)
  if (!call) throw new Error('El handler no redirigió a ninguna parte')
  return new URL(call[0] as string)
}

function signUpMock(result: unknown) {
  return jest.fn().mockResolvedValue(result)
}

beforeEach(() => {
  jest.clearAllMocks()
  process.env.NEXT_PUBLIC_BASE_DOMAIN = 'tecuida.group'
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
  checkRateLimitAsync.mockResolvedValue(null)
})

// ---------------------------------------------------------------------------
// Alta abierta (Villafranca de los Barros)
// ---------------------------------------------------------------------------

describe('alta abierta en un municipio sin código', () => {
  it('crea la cuenta y el perfil ciudadano del municipio del subdominio', async () => {
    const signUp = signUpMock({
      data: {
        user: { id: USER_ID, identities: [{ id: 'identity-1' }] },
        session: { access_token: 'token' },
      },
      error: null,
    })
    createServerClient.mockReturnValue({ auth: { signUp } })
    const admin = makeAdminClient()
    createAdminClient.mockReturnValue(admin)

    const response = (await POST(makeRequest({
      host: 'villafrancadelosbarros.tecuida.group',
      fields: {
        email: 'vecina@example.com',
        password: 'contrasena-segura',
        alias: 'vecina',
      },
    }))) as unknown as { url: string; status: number }

    expect(response.status).toBe(303)
    expect(new URL(response.url).pathname).toBe('/dashboard')

    // El alta va a Supabase con el municipio del subdominio en la metadata.
    expect(signUp).toHaveBeenCalledWith(expect.objectContaining({
      email: 'vecina@example.com',
      options: expect.objectContaining({
        data: expect.objectContaining({
          municipality_slug: 'villafrancadelosbarros',
          alias: 'vecina',
        }),
      }),
    }))

    expect(admin.inserts).toHaveLength(1)
    expect(admin.inserts[0].table).toBe('users')
    expect(admin.inserts[0].value).toEqual(expect.objectContaining({
      id: USER_ID,
      municipality_id: VILLAFRANCA.id,
      rol: 'ciudadano',
      residency_status: 'open_registration',
    }))
  })
})

// ---------------------------------------------------------------------------
// Correo ya registrado — regresión del mensaje que veía el ciudadano
// ---------------------------------------------------------------------------

describe('correo que ya tiene cuenta', () => {
  /** Supabase responde con `identities: []` en lugar de un error. */
  const duplicateResponse = {
    data: { user: { id: USER_ID, identities: [] }, session: null },
    error: null,
  }

  it('explica que la cuenta existe en lugar de «no se pudo crear la cuenta»', async () => {
    createServerClient.mockReturnValue({ auth: { signUp: signUpMock(duplicateResponse) } })
    const admin = makeAdminClient({
      authUsers: [{
        id: USER_ID,
        email: 'vecina@example.com',
        email_confirmed_at: '2026-07-22T05:49:21Z',
      }],
    })
    createAdminClient.mockReturnValue(admin)

    await POST(makeRequest({
      host: 'villafrancadelosbarros.tecuida.group',
      fields: { email: 'vecina@example.com', password: 'contrasena-segura' },
    }))

    const url = redirectedTo()
    expect(url.pathname).toBe('/register')
    expect(url.searchParams.get('error')).toContain('Ya existe una cuenta con este correo')
    expect(url.searchParams.get('error')).toContain('Inicia sesión')
    // Marca para que el formulario ofrezca las salidas sin depender del texto.
    expect(url.searchParams.get('error_code')).toBe('existing_account')
    expect(admin.inserts).toHaveLength(0)
  })

  it('da la misma salida cuando Supabase responde «already registered» (sin confirmación por email)', async () => {
    createServerClient.mockReturnValue({
      auth: {
        signUp: signUpMock({
          data: { user: null, session: null },
          error: { message: 'User already registered' },
        }),
      },
    })
    createAdminClient.mockReturnValue(makeAdminClient({
      authUsers: [{
        id: USER_ID,
        email: 'vecina@example.com',
        email_confirmed_at: '2026-07-22T05:49:21Z',
      }],
    }))

    await POST(makeRequest({
      host: 'villafrancadelosbarros.tecuida.group',
      fields: { email: 'vecina@example.com', password: 'contrasena-segura' },
    }))

    const url = redirectedTo()
    expect(url.searchParams.get('error')).toContain('Ya existe una cuenta con este correo')
    expect(url.searchParams.get('error_code')).toBe('existing_account')
  })

  it('avisa de que la cuenta está pendiente de confirmar si nunca se confirmó', async () => {
    createServerClient.mockReturnValue({ auth: { signUp: signUpMock(duplicateResponse) } })
    createAdminClient.mockReturnValue(makeAdminClient({
      authUsers: [{
        id: USER_ID,
        email: 'vecina@example.com',
        email_confirmed_at: null,
      }],
    }))

    await POST(makeRequest({
      host: 'villafrancadelosbarros.tecuida.group',
      fields: { email: 'vecina@example.com', password: 'contrasena-segura' },
    }))

    const error = redirectedTo().searchParams.get('error') ?? ''
    expect(error).toContain('pendiente de confirmar')
    expect(error).toContain('email de confirmación')
  })

  it('no rompe el alta si la consulta del estado falla', async () => {
    createServerClient.mockReturnValue({ auth: { signUp: signUpMock(duplicateResponse) } })
    const admin = makeAdminClient()
    admin.auth.admin.listUsers = async () => {
      throw new Error('DB caída')
    }
    createAdminClient.mockReturnValue(admin)
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {})

    await POST(makeRequest({
      host: 'villafrancadelosbarros.tecuida.group',
      fields: { email: 'vecina@example.com', password: 'contrasena-segura' },
    }))

    expect(redirectedTo().searchParams.get('error')).toContain('Ya existe una cuenta')
    consoleError.mockRestore()
  })
})

// ---------------------------------------------------------------------------
// Alfabeto de subdominios — regresión del alias
// ---------------------------------------------------------------------------

describe('aliases de subdominio', () => {
  it('resuelve el municipio cuando el subdominio llega con guiones', async () => {
    const signUp = signUpMock({
      data: {
        user: { id: USER_ID, identities: [{ id: 'identity-1' }] },
        session: { access_token: 'token' },
      },
      error: null,
    })
    createServerClient.mockReturnValue({ auth: { signUp } })
    const admin = makeAdminClient()
    createAdminClient.mockReturnValue(admin)

    const response = (await POST(makeRequest({
      host: 'villafranca-de-los-barros.tecuida.group',
      fields: { email: 'vecina@example.com', password: 'contrasena-segura' },
    }))) as unknown as { url: string; status: number }

    // Probó el slug literal y, al no existir, el alias canónico.
    expect(admin.slugQueries).toEqual([
      'villafranca-de-los-barros',
      'villafrancadelosbarros',
    ])
    expect(response.status).toBe(303)
    expect(new URL(response.url).searchParams.get('error')).toBeNull()
    // El perfil se vincula al municipio canónico, no al alias.
    expect(signUp).toHaveBeenCalledWith(expect.objectContaining({
      options: expect.objectContaining({
        data: expect.objectContaining({ municipality_slug: 'villafrancadelosbarros' }),
      }),
    }))
  })

  it('sigue rechazando los municipios que no existen', async () => {
    const signUp = signUpMock({ data: { user: null, session: null }, error: null })
    createServerClient.mockReturnValue({ auth: { signUp } })
    createAdminClient.mockReturnValue(makeAdminClient())

    await POST(makeRequest({
      host: 'municipio-inventado.tecuida.group',
      fields: { email: 'vecina@example.com', password: 'contrasena-segura' },
    }))

    expect(redirectedTo().searchParams.get('error')).toBe('Municipio no encontrado.')
    expect(signUp).not.toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// Errores técnicos de Supabase Auth → mensaje en español
// ---------------------------------------------------------------------------

describe('errores de Supabase traducidos al ciudadano', () => {
  function failWith(message: string) {
    createServerClient.mockReturnValue({
      auth: {
        signUp: signUpMock({
          data: { user: null, session: null },
          error: { message },
        }),
      },
    })
  }

  it('explica el límite de envío de correos en vez de mostrar «email rate limit exceeded»', async () => {
    failWith('email rate limit exceeded')
    createAdminClient.mockReturnValue(makeAdminClient())
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {})

    await POST(makeRequest({
      host: 'villafrancadelosbarros.tecuida.group',
      fields: { email: 'vecina@example.com', password: 'contrasena-segura' },
    }))

    const error = redirectedTo().searchParams.get('error') ?? ''
    expect(error).toContain('límite de envíos')
    expect(error).toContain('avisa a tu ayuntamiento')
    expect(error).not.toContain('rate limit')
    consoleError.mockRestore()
  })

  it('dice cuántos segundos hay que esperar tras intentos seguidos', async () => {
    failWith('For security purposes, you can only request this after 58 seconds.')
    createAdminClient.mockReturnValue(makeAdminClient())
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {})

    await POST(makeRequest({
      host: 'villafrancadelosbarros.tecuida.group',
      fields: { email: 'vecina@example.com', password: 'contrasena-segura' },
    }))

    expect(redirectedTo().searchParams.get('error')).toContain('58 segundos')
    consoleError.mockRestore()
  })

  it('no filtra el texto técnico en inglés ante un fallo desconocido', async () => {
    failWith('some unexpected internal failure')
    createAdminClient.mockReturnValue(makeAdminClient())
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {})

    await POST(makeRequest({
      host: 'villafrancadelosbarros.tecuida.group',
      fields: { email: 'vecina@example.com', password: 'contrasena-segura' },
    }))

    const error = redirectedTo().searchParams.get('error') ?? ''
    expect(error).toContain('No se pudo crear la cuenta en este momento')
    expect(error).not.toContain('internal failure')
    consoleError.mockRestore()
  })
})

// ---------------------------------------------------------------------------
// Municipios con código obligatorio
// ---------------------------------------------------------------------------

describe('municipios que exigen código', () => {
  it('rechaza el alta sin código antes de crear nada', async () => {
    const signUp = signUpMock({ data: { user: null, session: null }, error: null })
    createServerClient.mockReturnValue({ auth: { signUp } })
    const admin = makeAdminClient()
    createAdminClient.mockReturnValue(admin)

    await POST(makeRequest({
      host: 'macondo.tecuida.group',
      fields: { email: 'vecina@example.com', password: 'contrasena-segura' },
    }))

    expect(redirectedTo().searchParams.get('error')).toBe(
      'Necesitas un código municipal válido para registrarte.',
    )
    expect(signUp).not.toHaveBeenCalled()
    expect(admin.inserts).toHaveLength(0)
  })
})
