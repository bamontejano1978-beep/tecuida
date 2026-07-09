/**
 * @jest-environment node
 *
 * Lockea el contrato defensivo de `getMunicipalityAppsForLanding`: cualquier
 * error retornado por PostgRest DEBE loguearse con tenant id + code + message
 * y el helper DEBE devolver `[]` sin lanzar excepción al call site.
 *
 * Origen del bug que motiva este test: commits `41d2e29` + `6921c3b` — el
 * helper referenciaba `applications.created_at` antes de que la columna
 * existiera; PostgRest respondía 42703 y el helper lo engullía como `[]` →
 * las landings públicas mostraban 0 apps siendo diagnóstico imposible sin
 * Vercel logs + psql. Estos tests previenen el regreso del silencio.
 *
 * ESTRATEGIA:
 *   • Mock `@/lib/supabase/server`: builder chainable retorna `{ data, error }`
 *     controlado per-test via `mockBuilderResult`.
 *   • Mock `next/cache.unstable_cache`: pass-through. Estos tests apuntan al
 *     comportamiento del fetch, no del cache wrapper — ver page.test.tsx
 *     para tests del cache real.
 *   • **Limitación reconocida**: el pass-through bypasea validación de
 *     columnas del SELECT. Estos tests lockean el patrón defensivo ante
 *     errores, NO prueban que las columnas del SELECT existan en el schema
 *     remoto (eso requeriría testcontainers o test contra staging).
 *   • `jest.spyOn(console, 'error')` con `mockImplementation(() => {})` y
 *     `mockRestore()` en `afterEach` para aislamiento entre tests.
 */

// ─── Hand-rolled mock de `next/cache` ─────────────────────────────────────
// unstable_cache pasa por alto (no cacheamos — cada call ejecuta fn directo).
// revalidateTag/revalidatePath no-stubs (este test no los invoca; existen
// sólo para que los imports no fallen si alguna ruta los requiere).

jest.mock('next/cache', () => ({
  unstable_cache: <T extends (...args: unknown[]) => unknown>(fn: T) => fn,
  revalidateTag: jest.fn(),
  revalidatePath: jest.fn(),
}))

// ─── Mock de `@/lib/supabase/server` ──────────────────────────────────────
// `createAdminClient` retorna un builder mockeado. Cada test controla
// `mockBuilderResult` con el shape `{ data, error }` que la query debe
// resolver. El builder expone la cadena completa
//   supabase.from(table).select(cols).eq(col, val).eq(col, val).then(...)
// para espejar el helper real.

interface MockResult {
  data: unknown
  error: { code?: string; message?: string } | null
}

const mockBuilderResult: MockResult = { data: null, error: null }

jest.mock('@/lib/supabase/server', () => ({
  createAdminClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => Promise.resolve(mockBuilderResult),
        }),
      }),
    }),
  }),
}))

// ─── Imports DESPUÉS de los mocks (Jest los hoists) ──────────────────────

import { getMunicipalityAppsForLanding } from '@/lib/tenant/municipality-apps-cache'

// ─── Tests ───────────────────────────────────────────────────────────────

describe('getMunicipalityAppsForLanding — defensivo contra schema drift', () => {
  /**
   * Spy sobre console.error: captura logs del helper sin contaminar la salida
   * del test runner. Restaurado en afterEach para aislamiento entre tests.
   */
  let consoleErrorSpy: jest.SpyInstance

  beforeEach(() => {
    mockBuilderResult.data = null
    mockBuilderResult.error = null
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    consoleErrorSpy.mockRestore()
  })

  // ─── Caso crítico: schema drift (el bug histórico) ──────────────────────

  it('error 42703 "column does not exist" → loguea error con tenant+code+message y devuelve []', async () => {
    // Arrange: simulamos el bug histórico — PostgRest rechaza el SELECT
    // porque una columna referenciada no existe en el schema remoto.
    mockBuilderResult.error = {
      code: '42703',
      message: 'column "applications.created_at" does not exist',
    }

    // Act
    const result = await getMunicipalityAppsForLanding('tenant-zafra-drift')

    // Assert 1: el helper NO lanza — degrada controladamente a [].
    expect(result).toEqual([])

    // Assert 2: se logueó exactamente UNA vez (no más, no menos).
    expect(consoleErrorSpy).toHaveBeenCalledTimes(1)

    // Assert 3: el log incluye tenant id + code Postgres exacto + el message
    // verbatim. Si alguno falta, el log es inútil para diagnosticar post-deploy.
    const logLine = consoleErrorSpy.mock.calls[0]?.[0] as string | undefined
    expect(logLine).toBeDefined()
    expect(logLine).toContain('tenant=tenant-zafra-drift')
    expect(logLine).toContain('error.code=42703')
    expect(logLine).toContain('column "applications.created_at" does not exist')
  })

  // ─── Otros códigos de error — la red de seguridad cubre todos ───────────

  it('cualquier error code no-42703 también se loguea (defensa en profundidad)', async () => {
    // Arrange: simulamos un error de red / 5xx / timeout — el patrón
    // defensivo debe aplicar a CUALQUIER error, no sólo al histórico 42703.
    mockBuilderResult.error = {
      code: '50006',
      message: 'Network timeout reaching db',
    }

    const result = await getMunicipalityAppsForLanding('tenant-llerena-net')

    expect(result).toEqual([])
    expect(consoleErrorSpy).toHaveBeenCalledTimes(1)
    const logLine = consoleErrorSpy.mock.calls[0]?.[0] as string | undefined
    expect(logLine).toContain('tenant=tenant-llerena-net')
    expect(logLine).toContain('error.code=50006')
    expect(logLine).toContain('Network timeout reaching db')
  })

  // ─── Tenants distintos → logs separados ────────────────────────────────

  it('múltiples tenants con error → se loguea cada uno con su tenant id', async () => {
    // Arrange: simulamos drift affecting N tenants (e.g. deploy rotó).
    mockBuilderResult.error = {
      code: '42703',
      message: 'column missing',
    }

    // Act: el flujo típico del desplegador buscando cuál tenant rompió primero.
    await getMunicipalityAppsForLanding('tenant-A')
    await getMunicipalityAppsForLanding('tenant-B')
    await getMunicipalityAppsForLanding('tenant-C')

    // Assert: cada call generó su propio log con su tenant id en el texto.
    expect(consoleErrorSpy).toHaveBeenCalledTimes(3)
    const calls = consoleErrorSpy.mock.calls.map((c) => c[0] as string)
    expect(calls[0]).toContain('tenant=tenant-A')
    expect(calls[1]).toContain('tenant=tenant-B')
    expect(calls[2]).toContain('tenant=tenant-C')
  })

  // ─── Caso de éxito: cero logs (no contaminar Vercel logs en happy path) ─

  it('happy path → devuelve apps y NO loguea nada (cero ruido en Vercel logs)', async () => {
    // Arrange: simulación de respuesta exitosa (mismo shape que la remota).
    mockBuilderResult.data = [
      {
        application_id: '22222222-0000-0000-0000-000000000001',
        application: {
          id: '22222222-0000-0000-0000-000000000001',
          category_id: 'cat-bienestar',
          nombre: 'Mindful30',
          descripcion: 'Mindfulness 30 días',
          thumbnail_url: null,
          tipo: 'programa',
          activa: true,
          app_slug: 'mindful30',
          url_acceso: null,
          created_at: '2025-01-01T00:00:00Z',
        },
      },
    ]
    mockBuilderResult.error = null

    // Act
    const result = await getMunicipalityAppsForLanding('tenant-zafra-ok')

    // Assert 1: la app llega al consumidor con shape correcto.
    expect(result).toHaveLength(1)
    expect(result[0]?.application?.nombre).toBe('Mindful30')

    // Assert 2: cero logs — operations normales NO deben contaminar logs.
    // Esto es crítico para mantener signal-vs-noise en Vercel monitoring.
    expect(consoleErrorSpy).not.toHaveBeenCalled()
  })

  // ─── Error con campos parciales (nulls en code/message) ────────────────

  it('error con code/message undefined → fallback "unknown" (sin throw)', async () => {
    // Arrange: PostgRest teóricamente puede retornar un error object sin
    // `code` ni `message` (defensa contra shape drifts del cliente supabase).
    mockBuilderResult.error = {} // code: undefined, message: undefined

    const result = await getMunicipalityAppsForLanding('tenant-mystery')

    expect(result).toEqual([])
    expect(consoleErrorSpy).toHaveBeenCalledTimes(1)
    const logLine = consoleErrorSpy.mock.calls[0]?.[0] as string | undefined
    // El helper usa `?? 'unknown'` como fallback — verificamos que ambos
    // aparecen en el log para que el dev pueda grep por ellos.
    expect(logLine).toContain('error.code=unknown')
    expect(logLine).toContain('error.message="unknown"')
  })

  // ─── data + error simultáneamente (caso edge de Supabase) ──────────────

  it('data populado + error presente → helper prioriza error y devuelve []', async () => {
    // Arrange: edge case de la API supabase-js — algunos métodos devuelven
    // AMBOS. El helper debe priorizar el error (no swallow) para detectar
    // degradaciones parciales de schema.
    mockBuilderResult.data = [
      { application_id: 'x', application: { id: 'x', nombre: 'X' } },
    ]
    mockBuilderResult.error = { code: 'PGRST116', message: 'partial response' }

    const result = await getMunicipalityAppsForLanding('tenant-partial')

    // El helper retorna [] en cuanto hay error; data se descarta (consistente
    // con el Logging defensivo y con la semántica "no mostrar datos
    // potencialmente corruptos al ciudadano").
    expect(result).toEqual([])
    expect(consoleErrorSpy).toHaveBeenCalledTimes(1)
  })

  // ─── Caso data vacío (apps=0, sin error) ─────────────────────────────

  it('data:[] + error null → return [] sin loggear (regression guard contra noise)', async () => {
    // Arrange: caso "happy path" sin apps — el helper debe retornar []
    // sin contaminar logs con noise tipo "no apps found" o similares.
    // Si alguien añade un log spurious en este path, este test lo cazaría
    // antes de que el spam llegue a Vercel logs (32 tenants * N días
    // = ruido constante y costes de ingest).
    mockBuilderResult.data = []
    mockBuilderResult.error = null

    const result = await getMunicipalityAppsForLanding('tenant-empty-apps')

    expect(result).toEqual([])
    expect(consoleErrorSpy).not.toHaveBeenCalled()
  })

  // ─── Idempotencia same-tenant con error ─────────────────────────────

  it('2 calls consecutivos mismo tenant con error → 2 logs independientes (no hidden state per-tenant)', async () => {
    // Arrange: lockea que no haya state per-tenant que oculte / dedupe el
    // segundo error. Si alguien accidentalmente memoiza "already errored
    // for this tenant" en algún wrapper futuro, este test lo cazaría.
    mockBuilderResult.error = { code: '42703', message: 'column missing' }

    await getMunicipalityAppsForLanding('tenant-X')
    await getMunicipalityAppsForLanding('tenant-X')

    expect(consoleErrorSpy).toHaveBeenCalledTimes(2)
    expect(consoleErrorSpy.mock.calls[0]?.[0] as string).toContain('tenant=tenant-X')
    expect(consoleErrorSpy.mock.calls[1]?.[0] as string).toContain('tenant=tenant-X')
  })
})
