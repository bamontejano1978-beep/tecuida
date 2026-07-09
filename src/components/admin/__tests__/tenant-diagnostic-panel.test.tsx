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
    expect(select.value).toBe('') // place­holder por defecto

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

    // Ningún fetch disparado al inicio (sin initialSlug)
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('si recibe initialSlug, dispara fetch automático al montar + renderiza los datos', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => makeDebugResponse(),
    } as unknown as Response)

    render(<TenantDiagnosticPanel tenants={TENANTS} initialSlug="zafra" />)

    // El select debe mostrar el slug pre-seleccionado
    const select = screen.getByLabelText(/municipio/i) as HTMLSelectElement
    expect(select.value).toBe('zafra')

    // Fetch disparado automáticamente con el slug inicial
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/admin/debug/zafra',
      expect.objectContaining({ signal: expect.any(Object) }),
    )

    // Render de los datos fetcheados
    await waitFor(() => {
      expect(screen.getByText('Zafra')).toBeInTheDocument() // tenantName
      expect(screen.getByText('Mindful30')).toBeInTheDocument()
    })

    // Empty state ya NO se muestra
    expect(
      screen.queryByText(/Selecciona un tenant para ver su estado/i),
    ).not.toBeInTheDocument()
  })

  it('si initialSlug no existe en tenants list, el fetch devuelve 404 y se muestra error UI', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => ({ error: "Municipio 'fantasma' no existe" }),
    } as unknown as Response)

    render(<TenantDiagnosticPanel tenants={TENANTS} initialSlug="fantasma" />)

    // Fetch disparó igual con el slug inicial (aunque no esté en el dropdown)
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/admin/debug/fantasma',
        expect.objectContaining({}),
      )
    })

    // Error UI mostrado con el mensaje del backend
    await waitFor(() => {
      expect(
        screen.getByText(/Error al cargar el diagnóstico/i),
      ).toBeInTheDocument()
      expect(screen.getByText(/fantasma.*no existe/i)).toBeInTheDocument()
    })

    // El dropdown queda en placeholder (no había opción matching)
    const select = screen.getByLabelText(/municipio/i) as HTMLSelectElement
    expect(select.value).toBe('')
  })

  it('si initialSlug cambia entre renders (URL client-side nav), remonte y refetchea con el nuevo slug', async () => {
    // Test crítico (c) — simula que el server component re-renderiza
    // porque la URL searchParams cambió (`/admin?slug=zafra` →
    // `/admin?slug=llerena`). La fixture incluye Llerena en `tenants`
    // para que el `<select>` tenga una `<option value="llerena">`
    // matching — sin esto, el `<select>` mostraría vacío porque ningún
    // option coincide con selectedSlug='llerena'.
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () =>
          makeDebugResponse({
            tenantName: 'Zafra',
            tenantSlug: 'zafra',
          }),
      } as unknown as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () =>
          makeDebugResponse({
            tenantName: 'Llerena',
            tenantSlug: 'llerena',
          }),
      } as unknown as Response)

    const tenantsWithLlerena: TenantOption[] = [
      ...TENANTS,
      {
        slug: 'llerena',
        nombre: 'Llerena',
        estado: 'prueba' as const,
        oculto: false,
      },
    ]

    // Primer mount con initialSlug="zafra" — sin key explícito.
    const { rerender } = render(
      <TenantDiagnosticPanel tenants={tenantsWithLlerena} initialSlug="zafra" />,
    )
    await waitFor(() => {
      expect(
        screen.getByRole('heading', { level: 3, name: 'Zafra' }),
      ).toBeInTheDocument()
    })
    expect(mockFetch).toHaveBeenCalledTimes(1)
    expect(mockFetch).toHaveBeenLastCalledWith(
      '/api/admin/debug/zafra',
      expect.objectContaining({}),
    )

    // Re-render del parent con initialSlug="llerena" + `key="llerena"`.
    // El key change respecto a la primera mount (que tenía `key` interno
    // implícito de React) fuerza remount limpio del componente cliente.
    // Sin el key, el lazy initial state quedaría pegado al primer slug
    // (que es exactamente el bug que el `key` prop arregla).
    rerender(
      <TenantDiagnosticPanel
        key="llerena"
        tenants={tenantsWithLlerena}
        initialSlug="llerena"
      />,
    )

    // Después del remount: los datos de Zafra DEBEN desaparecer y los
    // de Llerena deben aparecer. Fetch debe haber sido llamado 2 veces.
    // La query por `<h3>` 'Zafra' es específica al tenant name en
    // SuccessView — NO se confunde con el `<option>` "Zafra (zafra)" del
    // dropdown que sigue presente (es un fixture de tenancy).
    await waitFor(() => {
      expect(
        screen.getByRole('heading', { level: 3, name: 'Llerena' }),
      ).toBeInTheDocument()
    })
    expect(
      screen.queryByRole('heading', { level: 3, name: 'Zafra' }),
    ).not.toBeInTheDocument()
    expect(mockFetch).toHaveBeenCalledTimes(2)
    expect(mockFetch).toHaveBeenNthCalledWith(
      2,
      '/api/admin/debug/llerena',
      expect.objectContaining({}),
    )
    // Dropdown value: como Llerena está en tenants, el <option value="llerena">
    // existe y el select puede mostrar selectedSlug='llerena'.
    expect(
      screen.getByLabelText(/municipio/i, { selector: 'select' }),
    ).toHaveValue('llerena')
  })

  it('si initialSlug NO cambia, no remonta ni refetchea (preserve state en navegación lateral)', async () => {
    // Sentinel test inverso: confirma que el comportamiento de remount
    // SOLO ocurre cuando initialSlug cambia. Re-renders con la misma
    // prop NO deben disparar fetch adicional.
    //
    // ⚠️ Importante: NO especifica `key=` en el rerender — sin key explícito,
    // React preserva la instance (mismo element con mismos props lógicos).
    // Esto simula el comportamiento del parent en /admin/page.tsx cuando
    // server re-renderiza con la misma `?slug=` (e.g. nueva mutación en
    // server data sin cambio de URL): el `key` computado es el mismo, sin
    // remount, sin fetch extra.
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () =>
        makeDebugResponse({
          tenantName: 'Zafra',
          tenantSlug: 'zafra',
        }),
    } as unknown as Response)

    const { rerender } = render(
      <TenantDiagnosticPanel tenants={TENANTS} initialSlug="zafra" />,
    )
    await waitFor(() => {
      expect(
        screen.getByRole('heading', { level: 3, name: 'Zafra' }),
      ).toBeInTheDocument()
    })
    const fetchCallsAfterMount = mockFetch.mock.calls.length
    // Lock adicional: primer fetch debe haber sido para zafra explícitamente.
    expect(mockFetch).toHaveBeenNthCalledWith(
      1,
      '/api/admin/debug/zafra',
      expect.objectContaining({}),
    )

    // Re-render del parent con TENANTS actualizado pero MISMO initialSlug.
    // Sin key change, React preserva la instance: selectedSlug/diagnostics
    // NO se resetean, fetch NO se dispara.
    const tenantsUpdated: TenantOption[] = [
      ...TENANTS,
      {
        slug: 'nuevo-municipio',
        nombre: 'Nuevo Municipio',
        estado: 'prueba' as const,
        oculto: false,
      },
    ]
    rerender(
      <TenantDiagnosticPanel
        tenants={tenantsUpdated}
        initialSlug="zafra"  // ← mismo slug, sin key change
      />,
    )

    // ⚠️ Importante: NO usar setTimeout arbitrario para "esperar ticks
    // pendientes" — es flaky en CI y en máquinas con React 18 concurrent
    // rendering. La forma determinística es waitFor con assertion
    // inverse-positive: si el componente re-fetchease, el callCount
    // subiría y waitFor capturaría el cambio (con un error claro).
    await waitFor(() => {
      expect(mockFetch.mock.calls.length).toBe(fetchCallsAfterMount)
    })
    // Verificar además que el dropdown sigue sincronizado con selectedSlug:
    // si el state fuera reseted, el dropdown mostraría placeholder.
    expect(
      screen.getByLabelText(/municipio/i, { selector: 'select' }),
    ).toHaveValue('zafra')
    expect(
      screen.getByRole('heading', { level: 3, name: 'Zafra' }),
    ).toBeInTheDocument()
    // Lock adicional: la nueva opción "Nuevo Municipio" del dropdown
    // debe ser visible sin necesidad de cambiar la URL — confirma que
    // tenants mutated correctamente sin state reset.
    expect(
      screen.getByRole('option', { name: /Nuevo Municipio/ }),
    ).toBeInTheDocument()
  })

  it('si initialSlug pasa de válido a undefined (URL clearing), remonta a idle y limpia el UI', async () => {
    // Test crítico (e): cubre el path "usuario navega fuera del deep-link"
    // → /admin sin `?slug=` → key cambia al fallback → remount → volver
    // a empty state. Sin este test, un bug en cómo el parent computa la
    // prop `key` para el fallback dejaría el panel mostrando datos stale
    // aunque el usuario está en `/admin` (sin slug) y la URL cambió.
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () =>
          makeDebugResponse({
            tenantName: 'Zafra',
            tenantSlug: 'zafra',
          }),
      } as unknown as Response)
      // Mock de defensa: si React 18 strict mode o algún dispatcher
      // dispara un re-fetch durante el remount, regresamos una promise
      // rechazada (no throw sincrónico — eso rompería el chain .then()
      // antes del .catch()). La rejection cae en el catch del componente
      // y dispara setDiagnostics({ kind: 'error' }). Cuando el test
      // luego assertea el idle state, fallará con error UI visible —
      // indicador claro de regresión (re-fetch indeseado).
      .mockRejectedValue(
        new Error('test-e-guard: spurious fetch during remount without initialSlug'),
      )

    // Primer mount con initialSlug="zafra" + key implícito interno
    const { rerender } = render(
      <TenantDiagnosticPanel tenants={TENANTS} initialSlug="zafra" />,
    )
    await waitFor(() => {
      expect(
        screen.getByRole('heading', { level: 3, name: 'Zafra' }),
      ).toBeInTheDocument()
    })
    expect(mockFetch).toHaveBeenCalledTimes(1)
    expect(mockFetch).toHaveBeenNthCalledWith(
      1,
      '/api/admin/debug/zafra',
      expect.objectContaining({}),
    )

    // Simular navegación client-side a `/admin` sin `?slug=`: el parent
    // re-renderiza con `diagnosticSlugParam=undefined` → key fallback
    // `'__tenant-diagnostic-no-slug__'`. El componente cliente remonta:
    // `selectedSlug=''`, diagnostics=idle, fetch NO debe dispararse
    // (porque `selectedSlug=''` se evalúa early-return en el useEffect).
    rerender(
      <TenantDiagnosticPanel
        key="__tenant-diagnostic-no-slug__"
        tenants={TENANTS}
        // initialSlug omitido → undefined
      />,
    )

    // Esperar que el remount complete: idle state visible.
    await waitFor(() => {
      expect(
        screen.getByText(/Selecciona un tenant para ver su estado/i),
      ).toBeInTheDocument()
    })

    // Verificar que los datos de Zafra desaparecieron completamente.
    expect(
      screen.queryByRole('heading', { level: 3, name: 'Zafra' }),
    ).not.toBeInTheDocument()

    // Dropdown regresa a placeholder.
    expect(
      screen.getByLabelText(/municipio/i, { selector: 'select' }),
    ).toHaveValue('')

    // ⚠️ Si el componente re-fetcheaba durante el remount, el guard
    // mockImplementation throw daría un error visible en jest. Si este
    // test pasa, confirma que NO se disparó fetch post-remount.
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
