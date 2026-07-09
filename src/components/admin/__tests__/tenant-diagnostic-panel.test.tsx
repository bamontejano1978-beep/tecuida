/**
 * @jest-environment jsdom
 *
 * Tests del panel client `TenantDiagnosticPanel`.
 *
 * Lo que cubrimos:
 *   1. Render inicial: dropdown + empty state, sin requests en vuelo.
 *   2. Selección de tenant → fetch a /api/admin/debug/[slug] + render success.
 *   3. Race condition: cambiar de tenant rápido aborta el primer fetch
 *      (AbortController) y solo la última respuesta actualiza el UI.
 *   4. Error handling: respuesta !ok → UI con mensaje + botón Reintentar.
 *   5. Edge cases: appNames vacío (badge "Sin apps asignadas"), tenantHidden
 *      muestra badge Oculto.
 *   6. Purga per-tenant: click "Purgar cache de <slug>" → POST con slug query
 *      param → estado "success" → re-fetch del diagnóstico.
 *
 * Lo que NO probamos aquí (es responsabilidad de los tests del endpoint):
 *   • Validación de slug regex en el backend (cubierto en
 *     `src/app/api/admin/debug/[slug]/__tests__/route.test.ts`).
 *   • Auth/role checks (cubierto en auth.test.ts).
 *
 * Mock contract: reemplazamos `global.fetch` con jest.fn() por test para
 * evitar leaks entre casos.
 */

import { render, screen, waitFor, fireEvent, act } from '@testing-library/react'
import TenantDiagnosticPanel from '../tenant-diagnostic-panel'
import type {
  TenantOption,
  DebugResponse,
  PurgeResponse,
} from '../tenant-diagnostic-panel'

// ─── Fixtures ──────────────────────────────────────────────────────────────

const TENANTS: TenantOption[] = [
  { slug: 'zafra', nombre: 'Zafra', estado: 'activa', oculto: false },
  {
    slug: 'valverde-de-merida',
    nombre: 'Valverde de Mérida',
    estado: 'prueba',
    oculto: false,
  },
]

function makeDebugResponse(overrides: Partial<DebugResponse> = {}): DebugResponse {
  return {
    tenantId: 't-uuid-1',
    tenantSlug: 'zafra',
    tenantName: 'Zafra',
    tenantEstado: 'activa',
    tenantHidden: false,
    appsRaw: 32,
    appsWithApplication: 32,
    appsActive: 32,
    appsInactiveGlobal: 0,
    appNames: [
      {
        nombre: 'Mindful30',
        appActiva: true,
        appOrfanada: false,
        assignmentActiva: true,
      },
      {
        nombre: 'Reto30',
        appActiva: true,
        appOrfanada: false,
        assignmentActiva: true,
      },
    ],
    categoriesCount: 6,
    categoriesWithApps: 4,
    timestamp: '2026-07-09T08:00:00.000Z',
    ...overrides,
  }
}

function makePurgeResponse(slug: string): PurgeResponse {
  return {
    message: `Cache de datos invalidado para el tenant "${slug}"`,
    invalidated: { tag: 'municipality-apps', path: '/', slug },
    timestamp: '2026-07-09T08:01:00.000Z',
  }
}

// ─── Setup global.fetch mock ──────────────────────────────────────────────

let mockFetch: jest.Mock

beforeEach(() => {
  mockFetch = jest.fn()
  global.fetch = mockFetch as unknown as typeof fetch
})

afterEach(() => {
  jest.resetAllMocks()
  act(() => {
    jest.useRealTimers()
  })
})

// ─── Tests ────────────────────────────────────────────────────────────────

describe('TenantDiagnosticPanel — render y flujo', () => {
  it('muestra dropdown con todos los tenants y empty state al inicio', () => {
    render(<TenantDiagnosticPanel tenants={TENANTS} />)

    // Selector accesible por label
    const select = screen.getByLabelText(/municipio/i) as HTMLSelectElement
    expect(select).toBeInTheDocument()

    // Empty state
    expect(
      screen.getByText(/Selecciona un tenant para ver su estado/i),
    ).toBeInTheDocument()

    // Opciones: placeholder + 2 tenants
    const optionTexts = Array.from(select.options).map((o) => o.textContent)
    expect(optionTexts).toEqual(
      expect.arrayContaining([
        expect.stringContaining('— Selecciona un municipio —'),
        expect.stringContaining('Zafra (zafra)'),
        expect.stringContaining('Valverde de Mérida (valverde-de-merida)'),
      ]),
    )

    // Ningún fetch disparado al inicio
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('selectoriza el slug y hace fetch a /api/admin/debug/[slug]', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => makeDebugResponse(),
    } as unknown as Response)

    render(<TenantDiagnosticPanel tenants={TENANTS} />)
    const select = screen.getByLabelText(/municipio/i) as HTMLSelectElement

    act(() => {
      fireEvent.change(select, { target: { value: 'zafra' } })
    })

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })

    // URL + signal de AbortController presente
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/admin/debug/zafra',
      expect.objectContaining({ signal: expect.any(Object) }),
    )

    // Cards de éxito renderizan
    await waitFor(() => {
      expect(screen.getByText('Zafra')).toBeInTheDocument()
      // appsRaw is 32 — debe haber al menos un nodo con el número 32
      expect(screen.getAllByText('32').length).toBeGreaterThan(0)
      // appNames en la tabla
      expect(screen.getByText('Mindful30')).toBeInTheDocument()
      expect(screen.getByText('Reto30')).toBeInTheDocument()
    })
  })

  it('labeliza la card appsRaw como DANGER cuando el valor es 0 (branch 037/_seed)', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => makeDebugResponse({ appsRaw: 0 }),
    } as unknown as Response)

    render(<TenantDiagnosticPanel tenants={TENANTS} />)
    act(() => {
      fireEvent.change(screen.getByLabelText(/municipio/i), {
        target: { value: 'zafra' },
      })
    })

    await waitFor(() => {
      // Hint específico del branch roto
      expect(screen.getByText(/Necesita re-seed/i)).toBeInTheDocument()
    })
  })

  it('renderiza error UI con botón Reintentar cuando el endpoint responde !ok', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ error: 'DB caída' }),
    } as unknown as Response)

    render(<TenantDiagnosticPanel tenants={TENANTS} />)
    act(() => {
      fireEvent.change(screen.getByLabelText(/municipio/i), {
        target: { value: 'zafra' },
      })
    })

    await waitFor(() => {
      expect(screen.getByText(/Error al cargar el diagnóstico/i)).toBeInTheDocument()
      expect(screen.getByText(/DB caída/)).toBeInTheDocument()
      // Botón Reintentar presente
      expect(screen.getByRole('button', { name: /Reintentar/i })).toBeInTheDocument()
    })
  })

  it('Reintentar dispara un nuevo fetch al endpoint', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: 'transient' }),
      } as unknown as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => makeDebugResponse(),
      } as unknown as Response)

    render(<TenantDiagnosticPanel tenants={TENANTS} />)
    act(() => {
      fireEvent.change(screen.getByLabelText(/municipio/i), {
        target: { value: 'zafra' },
      })
    })

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Reintentar/i })).toBeInTheDocument()
    })

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: /Reintentar/i }))
    })

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(2)
      // Recovered: appNames visible
      expect(screen.getByText('Mindful30')).toBeInTheDocument()
    })
  })

  it('renderiza badge Oculto cuando tenantHidden es true', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => makeDebugResponse({ tenantHidden: true }),
    } as unknown as Response)

    render(<TenantDiagnosticPanel tenants={TENANTS} />)
    act(() => {
      fireEvent.change(screen.getByLabelText(/municipio/i), {
        target: { value: 'zafra' },
      })
    })

    await waitFor(() => {
      expect(screen.getByText('Oculto')).toBeInTheDocument()
    })
  })

  it('muestra badge "asignación off" para apps con assignmentActiva=false', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () =>
        makeDebugResponse({
          appNames: [
            {
              nombre: 'Mindful30',
              appActiva: true,
              appOrfanada: false,
              assignmentActiva: false, // <— per-tenant desactivada
            },
          ],
        }),
    } as unknown as Response)

    render(<TenantDiagnosticPanel tenants={TENANTS} />)
    act(() => {
      fireEvent.change(screen.getByLabelText(/municipio/i), {
        target: { value: 'zafra' },
      })
    })

    await waitFor(() => {
      expect(screen.getByText(/asignación off/)).toBeInTheDocument()
    })
  })

  it('muestra badge "huérfana" cuando appOrfanada es true (assignment sin app)', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () =>
        makeDebugResponse({
          appNames: [
            {
              nombre: '(app borrada)',
              appActiva: false,
              appOrfanada: true, // <— LEFT JOIN null
              assignmentActiva: true,
            },
          ],
        }),
    } as unknown as Response)

    render(<TenantDiagnosticPanel tenants={TENANTS} />)
    act(() => {
      fireEvent.change(screen.getByLabelText(/municipio/i), {
        target: { value: 'zafra' },
      })
    })

    await waitFor(() => {
      expect(screen.getByText(/huérfana/)).toBeInTheDocument()
    })
  })

  it('muestra "Sin apps asignadas" en la tabla cuando appNames está vacío', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => makeDebugResponse({ appNames: [], appsRaw: 0 }),
    } as unknown as Response)

    render(<TenantDiagnosticPanel tenants={TENANTS} />)
    act(() => {
      fireEvent.change(screen.getByLabelText(/municipio/i), {
        target: { value: 'zafra' },
      })
    })

    await waitFor(() => {
      expect(screen.getByText(/Sin apps asignadas/i)).toBeInTheDocument()
    })
  })

  it('abort el fetch anterior cuando el usuario cambia rápido de tenant (race condition)', async () => {
    // Capturamos las señales (no los controllers) que React pasa vía init.signal.
    // Si el componente respeta AbortController, nuestro cleanup debe disparar
    // abort() sobre el controller que posee esta señal, poniéndola en aborted=true.
    let firstSignal: AbortSignal | undefined
    mockFetch.mockImplementation(
      (url: string, init?: RequestInit): Promise<Response> => {
        const signal = init?.signal as AbortSignal | undefined
        if (url === '/api/admin/debug/zafra') {
          firstSignal = signal
          // Promise que nunca resuelve salvo cuando se aborte la señal.
          return new Promise<Response>((_, reject) => {
            if (!signal) return
            if (signal.aborted) {
              const e = new Error('aborted')
              e.name = 'AbortError'
              reject(e)
              return
            }
            signal.addEventListener('abort', () => {
              const e = new Error('aborted')
              e.name = 'AbortError'
              reject(e)
            })
          })
        }
        if (url === '/api/admin/debug/valverde-de-merida') {
          return Promise.resolve({
            ok: true,
            json: async () =>
              makeDebugResponse({
                tenantSlug: 'valverde-de-merida',
                tenantName: 'Valverde de Mérida',
              }),
          } as unknown as Response)
        }
        throw new Error(`unexpected url: ${url}`)
      },
    )

    render(<TenantDiagnosticPanel tenants={TENANTS} />)
    const select = screen.getByLabelText(/municipio/i) as HTMLSelectElement

    // 1ª selección: zafra (fetch queda pendiente, signal capturada)
    act(() => {
      fireEvent.change(select, { target: { value: 'zafra' } })
    })

    await waitFor(() => {
      expect(firstSignal).toBeDefined()
    })

    // 2ª selección rápida: valverde-de-merida — el cleanup de useEffect
    // del primer selection debe llamar abort() sobre el controller, lo
    // que pone `firstSignal.aborted=true`.
    act(() => {
      fireEvent.change(select, { target: { value: 'valverde-de-merida' } })
    })

    await waitFor(() => {
      expect(firstSignal?.aborted).toBe(true)
    })

    // Solo debe mostrar los datos de valverde-de-merida, no de zafra
    await waitFor(() => {
      expect(screen.getByText('Valverde de Mérida')).toBeInTheDocument()
    })
  })
})

describe('TenantDiagnosticPanel — flujo de purga per-tenant', () => {
  it('botón PurgeCacheButton POST con ?slug=X y re-fetchea el diagnostico', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => makeDebugResponse(),
      } as unknown as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => makePurgeResponse('zafra'),
      } as unknown as Response)
      // Re-fetch post-purge
      .mockResolvedValueOnce({
        ok: true,
        json: async () =>
          makeDebugResponse({
            timestamp: '2026-07-09T08:02:00.000Z', // <– nuevo timestamp
          }),
      } as unknown as Response)

    render(<TenantDiagnosticPanel tenants={TENANTS} />)
    act(() => {
      fireEvent.change(screen.getByLabelText(/municipio/i), {
        target: { value: 'zafra' },
      })
    })

    await waitFor(() => {
      // El botón debe incluir el slug dinámicamente
      expect(
        screen.getByRole('button', { name: /Purgar cache de "zafra"/i }),
      ).toBeInTheDocument()
    })

    act(() => {
      fireEvent.click(
        screen.getByRole('button', { name: /Purgar cache de "zafra"/i }),
      )
    })

    // POST con ?slug=zafra
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/admin/cache/purge?slug=zafra',
        expect.objectContaining({ method: 'POST' }),
      )
    })

    // Estado success visible
    await waitFor(() => {
      expect(screen.getByText(/Cache invalidado para zafra/i)).toBeInTheDocument()
    })

    // Re-fetch ejecutado (total 3 calls)
    expect(mockFetch).toHaveBeenCalledTimes(3)
  })

  it('botón Reintentar purga dispara POST de nuevo cuando hay error', async () => {
    mockFetch
      // 1ª: fetch inicial del diagnóstico (success)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => makeDebugResponse(),
      } as unknown as Response)
      // 2ª: POST purga falla
      .mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: async () => ({ error: 'rate limited' }),
      } as unknown as Response)
      // 3ª: retry del POST purga — éxito
      .mockResolvedValueOnce({
        ok: true,
        json: async () => makePurgeResponse('zafra'),
      } as unknown as Response)
      // 4ª: re-fetch diagnóstico automático post-purge éxito
      .mockResolvedValueOnce({
        ok: true,
        json: async () => makeDebugResponse(),
      } as unknown as Response)

    render(<TenantDiagnosticPanel tenants={TENANTS} />)
    act(() => {
      fireEvent.change(screen.getByLabelText(/municipio/i), {
        target: { value: 'zafra' },
      })
    })

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /Purgar cache de "zafra"/i }),
      ).toBeInTheDocument()
    })

    // 1ª click → POST falla
    act(() => {
      fireEvent.click(
        screen.getByRole('button', { name: /Purgar cache de "zafra"/i }),
      )
    })

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Reintentar purga/i })).toBeInTheDocument()
      expect(screen.getByText(/rate limited/)).toBeInTheDocument()
    })

    // 2ª click (retry) → POST re-fired
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: /Reintentar purga/i }))
    })

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(4)
      expect(screen.getByText(/Cache invalidado para zafra/i)).toBeInTheDocument()
    })
  })
})
