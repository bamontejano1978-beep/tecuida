/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * @jest-environment node
 *
 * Justificación: el route handler usa `Request` (Web fetch API) que no está
 * disponible en `jest-environment-jsdom` (default del proyecto). Forzar el
 * entorno `node` evita el `ReferenceError: Request is not defined` al cargar
 * `route.ts`. Alternativa: mockear Request, pero `@jest-environment node` es
 * más fiel al runtime real de Vercel donde se ejecuta el endpoint.
 */

/**
 * Tests del endpoint GET /api/admin/debug/[slug]
 *
 * Cubre el contrato del endpoint: auth superadmin + rate limit + slug
 * validation + breakdown de apps per-tenant. Mockeamos Supabase con
 * chain helpers para verificar que cada branch del discriminante del
 * bug "apps no aparecen en landings" se reporta correctamente.
 */

jest.mock('@/lib/supabase/server', () => ({
  createAdminClient: jest.fn(),
}))

jest.mock('@/lib/admin/auth', () => ({
  verifyAdminAccess: jest.fn(),
}))

jest.mock('@/lib/admin/rate-limit', () => ({
  checkRateLimitAsync: jest.fn(),
}))

import { GET } from '../route'
import type { AppDiagnostic } from '../route'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { verifyAdminAccess } from '@/lib/admin/auth'
import { checkRateLimitAsync } from '@/lib/admin/rate-limit'

const mockedCreateAdminClient = createAdminClient as jest.Mock
const mockedVerifyAdminAccess = verifyAdminAccess as jest.Mock
const mockedCheckRateLimitAsync = checkRateLimitAsync as jest.Mock

const ADMIN_USER = { id: 'admin-1', email: 'super@tecuida.es', rol: 'superadmin' }

function makeRequest(): Request {
  return new Request('http://localhost/api/admin/debug/zafra')
}

function makeParams(slug: string) {
  return { params: Promise.resolve({ slug }) }
}

// ---------------------------------------------------------------------------
// Helper: configurar mock fluent-chain de Supabase por escenario
// ---------------------------------------------------------------------------
//
// Diferencia:
//   · municipalities:  .from → .select(cols) → .eq(slug, ?) → .maybeSingle()
//     devuelve { data, error }
//   · municipality_applications:
//     .from → .select(cols) → .eq(municipality_id, ?) → awaitable Promise
//     devuelve { data, error } (array)
//   · categories (count mode):
//     .from → .select('id', {count:'exact', head:true}) → awaitable Promise
//     devuelve { data: null, count, error }
interface SupabaseMockOptions {
  tenantRow?: any | null
  assignmentRows?: any[]
  categoriesCount?: number
  tenantError?: { message: string } | null
  assignmentsError?: { message: string } | null
  categoriesError?: { message: string } | null
}

function setupSupabaseMock(opts: SupabaseMockOptions = {}) {
  const tenant = opts.tenantRow ?? null
  const assignments = opts.assignmentRows ?? []
  const categoriesCount = opts.categoriesCount ?? 6

  const maybeSingle = jest.fn().mockResolvedValue({
    data: tenant,
    error: opts.tenantError ?? null,
  })

  const assignmentsPromise = Promise.resolve({
    data: assignments,
    error: opts.assignmentsError ?? null,
  })

  const categoriesPromise = Promise.resolve({
    data: null,
    count: categoriesCount,
    error: opts.categoriesError ?? null,
  })

  const from = jest.fn().mockImplementation((table: string) => {
    if (table === 'municipalities') {
      return {
        select: () => ({
          eq: () => ({
            maybeSingle,
          }),
        }),
      }
    }
    if (table === 'municipality_applications') {
      return {
        select: () => ({
          eq: () => assignmentsPromise,
        }),
      }
    }
    if (table === 'categories') {
      return {
        // Para categories con { count: 'exact', head: true } no encadena .eq()
        select: () => categoriesPromise,
      }
    }
    return {}
  })

  mockedCreateAdminClient.mockReturnValue({ from })

  return { from, maybeSingle }
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('GET /api/admin/debug/[slug]', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Defaults: auth y rate limit OK. Cada test puede override.
    mockedCheckRateLimitAsync.mockResolvedValue(null)
    mockedVerifyAdminAccess.mockResolvedValue(ADMIN_USER)
  })

  // ── Tests de auth ────────────────────────────────────────────────────

  it('devuelve 401 cuando verifyAdminAccess retorna NextResponse (401)', async () => {
    // IMPORTANTE: usar `NextResponse.json` (no `new Response`) para que el
    // guard `instanceof NextResponse` haga short-circuit. Un Web `Response`
    // plano NO pasa el check y cae al belt-and-suspenders con posibles
    // consecuencias downstream si la contract cambia.
    const errResponse = NextResponse.json(
      { error: 'No autorizado' },
      { status: 401 },
    )
    mockedVerifyAdminAccess.mockResolvedValue(errResponse)

    const res = await GET(makeRequest(), makeParams('zafra'))

    expect(res.status).toBe(401)
    // En este branch NO debe tocar la DB.
    expect(mockedCreateAdminClient).not.toHaveBeenCalled()
  })

  it('devuelve 401 cuando verifyAdminAccess retorna null', async () => {
    mockedVerifyAdminAccess.mockResolvedValue(null)

    const res = await GET(makeRequest(), makeParams('zafra'))

    expect(res.status).toBe(401)
    expect(mockedCreateAdminClient).not.toHaveBeenCalled()
  })

  it('devuelve 401 cuando verifyAdminAccess retorna un string (tipo no-objeto)', async () => {
    mockedVerifyAdminAccess.mockResolvedValue('not-an-object')

    const res = await GET(makeRequest(), makeParams('zafra'))

    expect(res.status).toBe(401)
    expect(mockedCreateAdminClient).not.toHaveBeenCalled()
  })

  it('devuelve 401 cuando verifyAdminAccess retorna un array (typeof === object edge case)', async () => {
    // Los arrays pasan `typeof === 'object'` y romperían `${adminUser.id}`
    // en el audit log si la contract cambiase. El guard debe cortarlo.
    mockedVerifyAdminAccess.mockResolvedValue([] as unknown as never)

    const res = await GET(makeRequest(), makeParams('zafra'))

    expect(res.status).toBe(401)
    expect(mockedCreateAdminClient).not.toHaveBeenCalled()
  })

  // ── Tests de rate limit ──────────────────────────────────────────────

  it('devuelve 429 cuando checkRateLimitAsync retorna NextResponse', async () => {
    const rateLimitResponse = new Response('Too Many Requests', { status: 429 })
    mockedCheckRateLimitAsync.mockResolvedValue(
      rateLimitResponse as unknown as Response,
    )

    const res = await GET(makeRequest(), makeParams('zafra'))

    expect(res.status).toBe(429)
    expect(mockedVerifyAdminAccess).not.toHaveBeenCalled()
  })

  // ── Tests de validación de slug ──────────────────────────────────────

  it('devuelve 400 cuando el slug contiene caracteres no permitidos (uppercase)', async () => {
    const res = await GET(makeRequest(), makeParams('ZAFRA'))
    expect(res.status).toBe(400)
    expect(mockedCreateAdminClient).not.toHaveBeenCalled()
  })

  it('devuelve 400 cuando el slug contiene espacios', async () => {
    const res = await GET(makeRequest(), makeParams('con espacio'))
    expect(res.status).toBe(400)
    expect(mockedCreateAdminClient).not.toHaveBeenCalled()
  })

  it('devuelve 400 cuando el slug excede 100 caracteres', async () => {
    const longSlug = 'a'.repeat(101)
    const res = await GET(makeRequest(), makeParams(longSlug))
    expect(res.status).toBe(400)
  })

  it('devuelve 400 cuando el slug está vacío', async () => {
    const res = await GET(makeRequest(), makeParams(''))
    expect(res.status).toBe(400)
  })

  // ── Tests de boundary de slug (regex acepta 2..100 chars) ────────────

  it('acepta un slug de exactamente 2 caracteres (boundary inferior)', async () => {
    setupSupabaseMock({
      tenantRow: {
        id: 'tenant-uuid-ab',
        slug: 'ab',
        nombre_municipio: 'AB',
        estado_suscripcion: 'activa',
        oculto_admin: false,
      },
      assignmentRows: [],
      categoriesCount: 6,
    })

    const res = await GET(makeRequest(), makeParams('ab'))
    expect(res.status).toBe(200)
  })

  it('acepta un slug de exactamente 100 caracteres (boundary superior)', async () => {
    // 100 chars válido: empieza/termina en alfanum según regex.
    const slug = 'a'.repeat(99) + 'b'
    expect(slug.length).toBe(100)
    setupSupabaseMock({
      tenantRow: {
        id: 'tenant-uuid-long',
        slug,
        nombre_municipio: 'Long',
        estado_suscripcion: 'activa',
        oculto_admin: false,
      },
      assignmentRows: [],
      categoriesCount: 6,
    })

    const res = await GET(makeRequest(), makeParams(slug))
    expect(res.status).toBe(200)
  })

  // ── Tests de 404 (municipio no existe) ──────────────────────────────

  it('devuelve 404 cuando el municipio no existe', async () => {
    setupSupabaseMock({ tenantRow: null })

    const res = await GET(makeRequest(), makeParams('no-existe'))

    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toContain('no-existe')
  })

  // ── Tests del happy path breakdown del bug ──────────────────────────

  it('devuelve 200 con breakdown completo cuando tenant existe y hay assignments', async () => {
    setupSupabaseMock({
      tenantRow: {
        id: 'tenant-uuid-1',
        slug: 'zafra',
        nombre_municipio: 'Zafra',
        estado_suscripcion: 'activa',
        oculto_admin: false,
      },
      assignmentRows: [
        {
          activa: true,
          application: {
            id: 'app-1',
            nombre: 'Mindful30',
            activa: true,
            category_id: 'cat-bienestar',
          },
        },
        {
          activa: true,
          application: {
            id: 'app-2',
            nombre: 'Reto30',
            activa: true,
            category_id: 'cat-bienestar',
          },
        },
        {
          activa: true,
          // Branch del fix: app globalmente inactiva pero asignada per-tenant
          application: {
            id: 'app-3',
            nombre: 'SunsetApp',
            activa: false,
            category_id: 'cat-familia',
          },
        },
      ],
      categoriesCount: 6,
    })

    const res = await GET(makeRequest(), makeParams('zafra'))

    expect(res.status).toBe(200)
    const body = await res.json()

    // Campos obligatorios del contrato:
    expect(body.tenantId).toBe('tenant-uuid-1')
    expect(body.tenantSlug).toBe('zafra')
    expect(body.tenantName).toBe('Zafra')
    expect(body.appsRaw).toBe(3)
    expect(body.appsWithApplication).toBe(3)
    expect(body.appsActive).toBe(2)
    expect(body.appsInactiveGlobal).toBe(1)
    expect(body.appNames).toHaveLength(3)
    expect(body.categoriesCount).toBe(6)
    expect(body.categoriesWithApps).toBe(2) // bienestar + familia
    expect(typeof body.timestamp).toBe('string')

    // appNames debe estar ordenado alfabéticamente y contener el soft-disabled.
    const appList = body.appNames as AppDiagnostic[]
    expect(appList.map((a) => a.nombre)).toEqual([
      'Mindful30',
      'Reto30',
      'SunsetApp',
    ])
    const sunset = appList.find((a) => a.nombre === 'SunsetApp')
    expect(sunset?.appActiva).toBe(false)
    expect(sunset?.assignmentActiva).toBe(true)
    expect(sunset?.appOrfanada).toBe(false)
  })

  it('devuelve 200 con appsRaw=0 cuando el municipio no tiene assignments', async () => {
    setupSupabaseMock({
      tenantRow: {
        id: 'tenant-uuid-2',
        slug: 'villafranca',
        nombre_municipio: 'Villafranca',
        estado_suscripcion: 'activa',
        oculto_admin: false,
      },
      assignmentRows: [],
      categoriesCount: 6,
    })

    const res = await GET(makeRequest(), makeParams('villafranca'))

    expect(res.status).toBe(200)
    const body = await res.json()

    expect(body.appsRaw).toBe(0)
    expect(body.appsWithApplication).toBe(0)
    expect(body.appsActive).toBe(0)
    expect(body.appsInactiveGlobal).toBe(0)
    expect(body.appNames).toEqual([])
    expect(body.categoriesWithApps).toBe(0)
  })

  it('marca appOrfanada=true cuando el LEFT JOIN a applications devuelve null', async () => {
    setupSupabaseMock({
      tenantRow: {
        id: 'tenant-uuid-3',
        slug: 'calamonte',
        nombre_municipio: 'Calamonte',
        estado_suscripcion: 'activa',
        oculto_admin: false,
      },
      assignmentRows: [
        // Una app válida
        {
          activa: true,
          application: {
            id: 'app-1',
            nombre: 'ValidApp',
            activa: true,
            category_id: 'cat-x',
          },
        },
        // Una app huérfana (la fila de applications fue borrada pero
        // la assignment quedó)
        {
          activa: true,
          application: null,
        },
      ],
      categoriesCount: 6,
    })

    const res = await GET(makeRequest(), makeParams('calamonte'))

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.appsRaw).toBe(2)
    expect(body.appsWithApplication).toBe(1) // solo ValidApp
    expect(body.appsActive).toBe(1)
    expect(body.appsInactiveGlobal).toBe(0)

    const orphan = (body.appNames as AppDiagnostic[]).find(
      (a) => a.nombre === '(app borrada)',
    )
    expect(orphan?.appOrfanada).toBe(true)
    expect(orphan?.appActiva).toBe(false) // null-safe fallback
    expect(orphan?.assignmentActiva).toBe(true)
  })

  it('devuelve 500 si tenant query retorna error', async () => {
    setupSupabaseMock({
      tenantError: { message: 'conexión rechazada' },
    })

    const res = await GET(makeRequest(), makeParams('zafra'))

    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toBe('Error interno del servidor')
  })
})
