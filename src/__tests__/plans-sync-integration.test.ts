/**
 * Test de integración: Flujo completo del sistema de planes
 *
 * Verifica end-to-end (con Supabase mockeado) el flujo:
 *   1. Crear plan (estado inicial en DB)
 *   2. Asignar plan a municipio (municipality.plan_id = plan.id)
 *   3. Modificar apps del plan (plan_applications actualizadas)
 *   4. Sincronizar plan (POST /api/admin/plans/[id]/sync)
 *   5. Verificar apps del municipio actualizadas (apps_count por municipio)
 *
 * El test mockea la cadena de llamadas Supabase que hace el endpoint
 * de sync. La RPC assign_municipality_plan (real en DB) hace el trabajo
 * atómico en producción; aquí simulamos su retorno para verificar que
 * el endpoint la invoca correctamente con los parámetros esperados.
 *
 * NOTA: aunque el nombre es "integración", no conecta a una DB real.
 * Es un test de estilo integrador del endpoint con todos los mocks
 * de Supabase/admin-auth/rate-limit alineados.
 */

import type { AdminUser } from '@/lib/admin/auth'

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

interface MockPlan {
  id: string
  nombre: string
  slug: string
}

interface MockMunicipality {
  id: string
  slug: string
  nombre_municipio: string
}

interface MockRpcResult {
  municipality_id: string
  plan_id: string | null
  sync_mode: string
  apps_count: number
  deleted_count: number
}

type QueryResult<T> = { data: T | null; error: { message: string } | null }

type RpcErrorMode =
  | { kind: 'none' }
  | { kind: 'all'; message: string }
  | { kind: 'per-mun'; errors: Record<string, string> } // municipality_id → error msg

// ---------------------------------------------------------------------------
// Estado simulado de la "DB"
// ---------------------------------------------------------------------------

const PLANS: MockPlan[] = [
  { id: 'plan-premium-uuid', nombre: 'Plan Premium', slug: 'premium' },
  { id: 'plan-basico-uuid', nombre: 'Plan Básico', slug: 'basico' },
]

const MUNICIPALITIES: MockMunicipality[] = [
  { id: 'mun-1', slug: 'zafra', nombre_municipio: 'Zafra' },
  { id: 'mun-2', slug: 'jerez', nombre_municipio: 'Jerez de los Caballeros' },
  { id: 'mun-3', slug: 'villafranca', nombre_municipio: 'Villafranca de los Barros' },
]

const municipalityPlanMap = new Map<string, string | null>([
  ['mun-1', 'plan-premium-uuid'],
  ['mun-2', 'plan-premium-uuid'],
  ['mun-3', 'plan-basico-uuid'],
])

// Apps por plan (simula plan_applications). Se modifica en cada test.
const planAppsMap = new Map<string, number>([
  ['plan-premium-uuid', 5],
  ['plan-basico-uuid', 3],
])

// Histórico de invocaciones a la RPC
const rpcCalls: Array<{
  municipality_id: string
  plan_id: string | null
  sync_mode: string
}> = []

let rpcErrorMode: RpcErrorMode = { kind: 'none' }

// ---------------------------------------------------------------------------
// Mock chain (thenable) para emular la API fluent de Supabase
// ---------------------------------------------------------------------------

/**
 * Construye un thenable que soporta:
 *   - métodos encadenables (eq, select, insert, update, delete, …) que devuelven `this`
 *   - .single() → ejecuta `terminal` y resuelve a su resultado
 *   - await chain (sin .single) → ejecuta `terminal` y resuelve a su resultado
 *
 * El closure `terminal` recibe el mapa de filtros acumulado y devuelve
 * `{ data, error }`. Reset de filtros por query (no global).
 */
function makeThenableChain(
  terminal: (filters: Record<string, string>) => QueryResult<unknown>,
) {
  const filters: Record<string, string> = {}

  const chain: Record<string, unknown> = {}

  const recordFilter = (col: string, val: string) => {
    filters[col] = val
    return chain
  }

  chain.eq = jest.fn((col: string, val: string) => recordFilter(col, val))
  chain.select = jest.fn(() => chain)
  chain.insert = jest.fn(() => chain)
  chain.update = jest.fn(() => chain)
  chain.delete = jest.fn(() => chain)
  chain.single = jest.fn(() => Promise.resolve(terminal(filters)))

  // Hacer que el chain sea await-able (como Supabase real)
  chain.then = (onFulfilled: (v: QueryResult<unknown>) => unknown) =>
    Promise.resolve(terminal(filters)).then(onFulfilled)

  return chain
}

// ---------------------------------------------------------------------------
// Mocks de los módulos
// ---------------------------------------------------------------------------

jest.mock('@/lib/admin/auth', () => ({
  verifyAdminAccess: jest.fn(),
}))

jest.mock('@/lib/admin/rate-limit', () => ({
  checkRateLimitAsync: jest.fn(),
}))

jest.mock('@/lib/supabase/server', () => ({
  createAdminClient: jest.fn(),
}))

jest.mock('next/headers', () => ({
  cookies: jest.fn(() => ({
    getAll: jest.fn().mockReturnValue([]),
    set: jest.fn(),
  })),
}))

jest.mock('next/server', () => {
  // NextResponse como clase real: el route hace `instanceof NextResponse`
  // para distinguir entre AdminUser (exitoso) y respuesta de error.
  class NextResponse {
    status: number
    body: unknown
    constructor(body: unknown, init?: { status?: number }) {
      this.body = body
      this.status = init?.status ?? 200
    }
    async json() {
      return this.body
    }
  }
  ;(NextResponse as unknown as { json: jest.Mock }).json = jest
    .fn()
    .mockImplementation((body: unknown, init?: { status?: number }) =>
      new NextResponse(body, init),
    )
  return { NextResponse }
})

// ---------------------------------------------------------------------------
// Importaciones post-mocks
// ---------------------------------------------------------------------------

import { verifyAdminAccess } from '@/lib/admin/auth'
import { checkRateLimitAsync } from '@/lib/admin/rate-limit'
import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { POST } from '@/app/api/admin/plans/[id]/sync/route'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ADMIN_USER: AdminUser = {
  id: 'admin-uuid',
  email: 'admin@tecuida.es',
  nombre: 'Admin',
  apellidos: 'Root',
  rol: 'superadmin',
}

function makeRequest(): Request {
  // Como rate-limit y auth están mockeados, el Request real no se inspecciona.
  return {} as unknown as Request
}

function makeParams(id: string) {
  return { params: { id } }
}

function setupSupabaseMock() {
  const supabase = {
    from: jest.fn((table: string) => {
      if (table === 'subscription_plans') {
        return makeThenableChain((filters) => {
          const id = filters.id
          const plan = PLANS.find((p) => p.id === id) ?? null
          return plan
            ? { data: plan, error: null }
            : { data: null, error: { message: 'Plan no encontrado' } }
        })
      }
      if (table === 'municipalities') {
        return makeThenableChain((filters) => {
          const planId = filters.plan_id
          if (!planId) return { data: MUNICIPALITIES, error: null }
          const filtered = MUNICIPALITIES.filter(
            (m) => municipalityPlanMap.get(m.id) === planId,
          )
          return { data: filtered, error: null }
        })
      }
      return makeThenableChain(() => ({ data: null, error: null }))
    }),

    rpc: jest.fn(
      async (
        fnName: string,
        params: { p_municipality_id: string; p_plan_id: string; p_sync_mode: string },
      ) => {
        if (fnName !== 'assign_municipality_plan') {
          return { data: null, error: { message: `Función desconocida: ${fnName}` } }
        }

        rpcCalls.push({
          municipality_id: params.p_municipality_id,
          plan_id: params.p_plan_id,
          sync_mode: params.p_sync_mode,
        })

        // Manejo de errores según el modo configurado
        if (rpcErrorMode.kind === 'all') {
          return { data: null, error: { message: rpcErrorMode.message } }
        }
        if (rpcErrorMode.kind === 'per-mun') {
          const perMunError = rpcErrorMode.errors[params.p_municipality_id]
          if (perMunError) {
            return { data: null, error: { message: perMunError } }
          }
        }

        // Simular respuesta exitosa: apps_count basado en planAppsMap
        const planId = params.p_plan_id
        const appsCount = planId ? planAppsMap.get(planId) ?? 0 : 0

        const result: MockRpcResult = {
          municipality_id: params.p_municipality_id,
          plan_id: params.p_plan_id,
          sync_mode: params.p_sync_mode,
          apps_count: appsCount,
          deleted_count: 0,
        }
        return { data: result, error: null }
      },
    ),
  }

  return supabase
}

// ---------------------------------------------------------------------------
// Setup / Teardown
// ---------------------------------------------------------------------------

beforeAll(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key'
})

beforeEach(() => {
  jest.clearAllMocks()
  rpcCalls.length = 0
  rpcErrorMode = { kind: 'none' }

  // Reset estado
  planAppsMap.set('plan-premium-uuid', 5)
  planAppsMap.set('plan-basico-uuid', 3)
  municipalityPlanMap.set('mun-1', 'plan-premium-uuid')
  municipalityPlanMap.set('mun-2', 'plan-premium-uuid')
  municipalityPlanMap.set('mun-3', 'plan-basico-uuid')

  // Por defecto: admin autenticado, sin rate limit
  ;(verifyAdminAccess as jest.Mock).mockResolvedValue(ADMIN_USER)
  ;(checkRateLimitAsync as jest.Mock).mockResolvedValue(null)
})

// ---------------------------------------------------------------------------
// Tests — Flujo completo de un plan
// ---------------------------------------------------------------------------

describe('Integración: flujo completo de planes', () => {
  it('flujo happy path: plan con 2 municipios sincroniza ambos vía RPC atómica', async () => {
    const supabase = setupSupabaseMock()
    ;(createAdminClient as jest.Mock).mockReturnValue(supabase)

    // Paso 3: superadmin edita el plan y añade apps (5 → 7)
    planAppsMap.set('plan-premium-uuid', 7)

    // Paso 4: invocar el endpoint de sync
    const response = await POST(makeRequest(), makeParams('plan-premium-uuid'))
    const body = await response.json()

    // Paso 5: verificar respuesta
    expect(response.status).toBe(200)
    expect(body.data.synced_count).toBe(2)
    expect(body.data.failed_count).toBe(0)
    expect(body.data.results).toHaveLength(2)
    expect(body.data.plan_id).toBe('plan-premium-uuid')
    expect(body.data.plan_name).toBe('Plan Premium')

    // Verificar que se invocó la RPC con los parámetros correctos
    expect(rpcCalls).toHaveLength(2)
    rpcCalls.forEach((call) => {
      expect(call.plan_id).toBe('plan-premium-uuid')
      expect(call.sync_mode).toBe('preserve_extras')
    })
    expect(rpcCalls.map((c) => c.municipality_id).sort()).toEqual(['mun-1', 'mun-2'])
  })

  it('refleja apps modificadas: el apps_count retornado refleja el estado nuevo del plan', async () => {
    const supabase = setupSupabaseMock()
    ;(createAdminClient as jest.Mock).mockReturnValue(supabase)

    // Estado inicial: 5 apps
    expect(planAppsMap.get('plan-premium-uuid')).toBe(5)

    // Superadmin EDITA el plan: añade 2 apps
    planAppsMap.set('plan-premium-uuid', 7)

    // Sincronizar
    const response = await POST(makeRequest(), makeParams('plan-premium-uuid'))
    const body = await response.json()

    // El apps_count por municipio refleja el cambio
    body.data.results.forEach((r: { apps_count: number }) => {
      expect(r.apps_count).toBe(7)
    })
  })

  it('plan sin municipios suscritos: devuelve mensaje informativo sin llamar a la RPC', async () => {
    const supabase = setupSupabaseMock()
    ;(createAdminClient as jest.Mock).mockReturnValue(supabase)

    // Mover mun-3 a premium para dejar el plan básico sin suscriptores
    municipalityPlanMap.set('mun-3', 'plan-premium-uuid')

    const response = await POST(makeRequest(), makeParams('plan-basico-uuid'))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.message).toContain('no tiene municipios suscritos')
    expect(body.data.synced_count).toBe(0)
    expect(body.data.failed_count).toBe(0)
    expect(body.data.results).toEqual([])
    expect(rpcCalls).toHaveLength(0)
  })

  it('plan no existe: devuelve 404 sin tocar la RPC', async () => {
    const supabase = setupSupabaseMock()
    ;(createAdminClient as jest.Mock).mockReturnValue(supabase)

    const response = await POST(makeRequest(), makeParams('plan-inexistente'))
    const body = await response.json()

    expect(response.status).toBe(404)
    expect(body.error).toBe('Plan no encontrado')
    expect(rpcCalls).toHaveLength(0)
  })

  it('fallo PARCIAL: una RPC falla, la otra tiene éxito y se reporta correctamente', async () => {
    const supabase = setupSupabaseMock()
    ;(createAdminClient as jest.Mock).mockReturnValue(supabase)

    // Fallo solo para mun-2 (simula un timeout en la RPC de ese municipio)
    rpcErrorMode = {
      kind: 'per-mun',
      errors: { 'mun-2': 'Connection timeout' },
    }

    const response = await POST(makeRequest(), makeParams('plan-premium-uuid'))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.data.synced_count).toBe(1)
    expect(body.data.failed_count).toBe(1)

    const mun1 = body.data.results.find(
      (r: { municipality_id: string }) => r.municipality_id === 'mun-1',
    )
    const mun2 = body.data.results.find(
      (r: { municipality_id: string }) => r.municipality_id === 'mun-2',
    )

    expect(mun1).toMatchObject({ success: true, apps_count: 5 })
    expect(mun2).toMatchObject({ success: false, error: 'Connection timeout' })
  })

  it('fallo total: todas las RPCs fallan → todos los municipios reportan error', async () => {
    const supabase = setupSupabaseMock()
    ;(createAdminClient as jest.Mock).mockReturnValue(supabase)

    rpcErrorMode = { kind: 'all', message: 'Database is down' }

    const response = await POST(makeRequest(), makeParams('plan-premium-uuid'))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.data.synced_count).toBe(0)
    expect(body.data.failed_count).toBe(2)
    body.data.results.forEach((r: { success: boolean; error: string }) => {
      expect(r.success).toBe(false)
      expect(r.error).toBe('Database is down')
    })
  })

  it('admin sin autenticar: devuelve 401 sin consultar Supabase', async () => {
    ;(verifyAdminAccess as jest.Mock).mockResolvedValue(
      NextResponse.json({ error: 'No autorizado' }, { status: 401 }),
    )

    const response = await POST(makeRequest(), makeParams('plan-premium-uuid'))

    expect(response.status).toBe(401)
    expect(rpcCalls).toHaveLength(0)
    expect(createAdminClient).not.toHaveBeenCalled()
  })

  it('rate limit excedido: devuelve 429 sin procesar la request', async () => {
    ;(checkRateLimitAsync as jest.Mock).mockResolvedValue(
      NextResponse.json(
        { error: 'Demasiadas peticiones' },
        { status: 429 },
      ),
    )

    const response = await POST(makeRequest(), makeParams('plan-premium-uuid'))

    expect(response.status).toBe(429)
    expect(rpcCalls).toHaveLength(0)
    expect(verifyAdminAccess).not.toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// Tests — Invariantes del flujo
// ---------------------------------------------------------------------------

describe('Integración: invariantes del flujo', () => {
  it('siempre invoca la RPC con sync_mode=preserve_extras (sync masivo nunca es strict)', async () => {
    const supabase = setupSupabaseMock()
    ;(createAdminClient as jest.Mock).mockReturnValue(supabase)

    await POST(makeRequest(), makeParams('plan-premium-uuid'))

    rpcCalls.forEach((call) => {
      expect(call.sync_mode).toBe('preserve_extras')
    })
  })

  it('verifica rate limit ANTES que admin auth ANTES que Supabase (orden importa)', async () => {
    const supabase = setupSupabaseMock()
    ;(createAdminClient as jest.Mock).mockReturnValue(supabase)

    const callOrder: string[] = []
    ;(checkRateLimitAsync as jest.Mock).mockImplementation(async () => {
      callOrder.push('checkRateLimit')
      return null
    })
    ;(verifyAdminAccess as jest.Mock).mockImplementation(async () => {
      callOrder.push('verifyAdminAccess')
      return ADMIN_USER
    })
    ;(createAdminClient as jest.Mock).mockImplementation(() => {
      callOrder.push('createAdminClient')
      return supabase
    })

    await POST(makeRequest(), makeParams('plan-premium-uuid'))

    expect(callOrder).toEqual([
      'checkRateLimit',
      'verifyAdminAccess',
      'createAdminClient',
    ])
  })

  it('el plan_id pasado a la RPC coincide con el plan solicitado en la URL', async () => {
    const supabase = setupSupabaseMock()
    ;(createAdminClient as jest.Mock).mockReturnValue(supabase)

    await POST(makeRequest(), makeParams('plan-basico-uuid'))

    expect(rpcCalls).toHaveLength(1) // solo mun-3 está en plan-basico
    expect(rpcCalls[0].plan_id).toBe('plan-basico-uuid')
    expect(rpcCalls[0].municipality_id).toBe('mun-3')
  })

  it('no se invoca la RPC para municipios que NO tienen ese plan', async () => {
    const supabase = setupSupabaseMock()
    ;(createAdminClient as jest.Mock).mockReturnValue(supabase)

    // Plan básico solo tiene 1 municipio (mun-3); los otros 2 están en premium
    await POST(makeRequest(), makeParams('plan-basico-uuid'))

    const invokedMunIds = rpcCalls.map((c) => c.municipality_id)
    expect(invokedMunIds).toEqual(['mun-3'])
    expect(invokedMunIds).not.toContain('mun-1')
    expect(invokedMunIds).not.toContain('mun-2')
  })

  it('el slug y nombre del municipio vienen del join (no de IDs), permitiendo UI directa', async () => {
    const supabase = setupSupabaseMock()
    ;(createAdminClient as jest.Mock).mockReturnValue(supabase)

    const response = await POST(makeRequest(), makeParams('plan-premium-uuid'))
    const body = await response.json()

    body.data.results.forEach(
      (r: { slug: string; nombre: string; municipality_id: string }) => {
        const mun = MUNICIPALITIES.find((m) => m.id === r.municipality_id)
        expect(r.slug).toBe(mun?.slug)
        expect(r.nombre).toBe(mun?.nombre_municipio)
      },
    )
  })
})
