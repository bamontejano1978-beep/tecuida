/**
 * @jest-environment node
 *
 * Contrato de invalidación — `PUT /api/admin/municipalities/[id]/applications`.
 *
 * Tras una sincronización exitosa de apps para un municipio, el endpoint debe
 * llamar AMBAS invalidaciones:
 *   • revalidateTag(MUNICIPALITY_APPS_TAG) — purga el `unstable_cache` con
 *     esa tag (que cubre TODOS los tenants en una sola operación).
 *   • revalidatePath('/') — purga la Route Cache de la raíz como red de
 *     seguridad ante una clave de cache CDN por subdominio.
 *
 * Si la mutación falla (municipio inexistente, app inválida, error Supabase)
 * NO se debe invalidar cache — la BD no cambió.
 */

jest.mock('next/cache', () => ({
  // Lista explícita sin spread para evitar efectos sutiles con la API de
  // Next.js. Solo espiamos `revalidateTag`/`revalidatePath`. `unstable_cache`
  // se expone como identity pass-through: el helper
  // @/lib/tenant/municipality-apps-cache lo invoca para envolver la query,
  // pero los routes bajo test NO lo llaman, así que aquí basta con que
  // devuelva la función original sin cachear.
  revalidateTag: jest.fn(),
  revalidatePath: jest.fn(),
  unstable_cache: <T extends (...args: any[]) => any>(fn: T) => fn,
}))

jest.mock('@/lib/supabase/server', () => ({
  createAdminClient: jest.fn(),
}))
jest.mock('@/lib/admin/auth', () => ({
  verifyAdminAccess: jest.fn(),
}))
jest.mock('@/lib/admin/rate-limit', () => ({
  checkRateLimitAsync: jest.fn(),
}))

import { NextResponse } from 'next/server'
import { PUT } from '../route'
import { MUNICIPALITY_APPS_TAG } from '@/lib/tenant/municipality-apps-cache'

// ── Mocks tipados ──
const { createAdminClient } = jest.requireMock('@/lib/supabase/server') as {
  createAdminClient: jest.Mock
}
const { verifyAdminAccess } = jest.requireMock('@/lib/admin/auth') as {
  verifyAdminAccess: jest.Mock
}
const { checkRateLimitAsync } = jest.requireMock('@/lib/admin/rate-limit') as {
  checkRateLimitAsync: jest.Mock
}
const cacheMock = jest.requireMock('next/cache') as {
  revalidateTag: jest.Mock
  revalidatePath: jest.Mock
}

// ── Helpers ──

/**
 * Crea un cliente de Supabase mockeado que consume una secuencia de respuestas
 * en orden, una por cada `await` del route handler. Todos los métodos
 * encadenables (from/select/eq/in/etc.) devuelven el mismo objeto; los
 * terminales (single/maybeSingle o await directo) consumen la siguiente
 * respuesta de la cola.
 */
function buildSupabaseMock(responses: Array<{ data?: unknown; error?: unknown | null }>) {
  let idx = 0
  const consume = () => responses[idx++] ?? { data: null, error: null }

  // Proxy que devuelve a sí mismo para todos los métodos encadenables,
  // y expone `then` para `await` + `single`/`maybeSingle` como terminales.
  const supabase = new Proxy(function noop() {} as any, {
    get(_target, prop) {
      if (prop === 'then') {
        return (onFulfilled: any, onRejected: any) =>
          Promise.resolve(consume()).then(onFulfilled, onRejected)
      }
      if (prop === 'single' || prop === 'maybeSingle') {
        return () => Promise.resolve(consume())
      }
      // Cualquier otro método encadenable (from, select, eq, in, delete, ...)
      // devuelve `supabase` para que .then() siga resoluble al final.
      return () => supabase
    },
  })

  // El handler devuelve métodos tipados para TS
  return supabase as any
}

const MUNICIPIO_ID = '11111111-1111-1111-1111-111111111111'
const APP_ID = '22222222-2222-2222-2222-222222222222'

function setupAuth() {
  ;(verifyAdminAccess as jest.Mock).mockResolvedValue({
    id: 'admin-1',
    email: 'admin@test',
    nombre: 'Admin',
    apellidos: 'Test',
    rol: 'superadmin',
  })
  ;(checkRateLimitAsync as jest.Mock).mockResolvedValue(null)
}

function makePutRequest(body: unknown) {
  return new Request(
    `http://localhost/api/admin/municipalities/${MUNICIPIO_ID}/applications`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
  )
}

// ── Tests ──

beforeEach(() => {
  jest.clearAllMocks()
  setupAuth()
})

describe('PUT /api/admin/municipalities/[id]/applications — invalidación de cache', () => {
  it('llama revalidateTag(MUNICIPALITY_APPS_TAG) + revalidatePath("/") tras éxito', async () => {
    // Secuencia de respuestas que el route consume vía el mock de Supabase:
    // 1. .from('municipalities').select('id').eq('id').single() → municipio existe
    // 2. .from('applications').select('id').in('id', application_ids) → app válida
    // 3. .from('municipality_applications').delete().eq() → ok
    // 4. .from('municipality_applications').insert(rows) → ok
    // 5. .from('municipality_applications').select(...) → lista actualizada (return final)
    ;(createAdminClient as jest.Mock).mockReturnValue(
      buildSupabaseMock([
        { data: { id: MUNICIPIO_ID }, error: null },
        { data: [{ id: APP_ID }], error: null },
        { error: null },
        { error: null },
        { data: [{ application_id: APP_ID }], error: null },
      ]),
    )

    const request = makePutRequest({
      municipality_id: MUNICIPIO_ID,
      application_ids: [APP_ID],
    })
    const response = await PUT(request, { params: { id: MUNICIPIO_ID } })

    expect(response).toBeInstanceOf(NextResponse)
    expect(response.status).toBe(200)

    expect(cacheMock.revalidateTag).toHaveBeenCalledTimes(1)
    expect(cacheMock.revalidateTag).toHaveBeenCalledWith(MUNICIPALITY_APPS_TAG)

    expect(cacheMock.revalidatePath).toHaveBeenCalledTimes(1)
    expect(cacheMock.revalidatePath).toHaveBeenCalledWith('/')
  })

  it('llama revalidateTag y revalidatePath en orden (primero tag, después path)', async () => {
    ;(createAdminClient as jest.Mock).mockReturnValue(
      buildSupabaseMock([
        { data: { id: MUNICIPIO_ID }, error: null },
        { data: [{ id: APP_ID }], error: null },
        { error: null },
        { error: null },
        { data: [], error: null },
      ]),
    )

    await PUT(makePutRequest({ municipality_id: MUNICIPIO_ID, application_ids: [APP_ID] }), {
      params: { id: MUNICIPIO_ID },
    })

    const tagOrder = cacheMock.revalidateTag.mock.invocationCallOrder[0]
    const pathOrder = cacheMock.revalidatePath.mock.invocationCallOrder[0]
    expect(tagOrder).toBeLessThan(pathOrder)
  })

  it('NO llama revalidateTag ni revalidatePath si la validación Zod falla', async () => {
    // municipality_id vacío no es UUID válido
    await PUT(makePutRequest({ municipality_id: 'no-es-uuid', application_ids: [] }), {
      params: { id: MUNICIPIO_ID },
    })

    expect(cacheMock.revalidateTag).not.toHaveBeenCalled()
    expect(cacheMock.revalidatePath).not.toHaveBeenCalled()
  })

  it('NO llama revalidateTag ni revalidatePath si el municipio no existe', async () => {
    ;(createAdminClient as jest.Mock).mockReturnValue(
      buildSupabaseMock([{ data: null, error: { message: 'not found' } }]),
    )

    await PUT(makePutRequest({ municipality_id: MUNICIPIO_ID, application_ids: [APP_ID] }), {
      params: { id: MUNICIPIO_ID },
    })

    expect(cacheMock.revalidateTag).not.toHaveBeenCalled()
    expect(cacheMock.revalidatePath).not.toHaveBeenCalled()
  })

  it('NO llama revalidateTag ni revalidatePath si el DELETE en BD falla', async () => {
    // Municipio ok, apps ok, pero delete() falla
    ;(createAdminClient as jest.Mock).mockReturnValue(
      buildSupabaseMock([
        { data: { id: MUNICIPIO_ID }, error: null },
        { data: [{ id: APP_ID }], error: null },
        { error: { message: 'fk violation' } },
      ]),
    )

    await PUT(makePutRequest({ municipality_id: MUNICIPIO_ID, application_ids: [APP_ID] }), {
      params: { id: MUNICIPIO_ID },
    })

    expect(cacheMock.revalidateTag).not.toHaveBeenCalled()
    expect(cacheMock.revalidatePath).not.toHaveBeenCalled()
  })

  it('NO llama revalidateTag ni revalidatePath si el INSERT en BD falla', async () => {
    ;(createAdminClient as jest.Mock).mockReturnValue(
      buildSupabaseMock([
        { data: { id: MUNICIPIO_ID }, error: null },
        { data: [{ id: APP_ID }], error: null },
        { error: null },
        { error: { message: 'duplicate key' } },
      ]),
    )

    await PUT(makePutRequest({ municipality_id: MUNICIPIO_ID, application_ids: [APP_ID] }), {
      params: { id: MUNICIPIO_ID },
    })

    expect(cacheMock.revalidateTag).not.toHaveBeenCalled()
    expect(cacheMock.revalidatePath).not.toHaveBeenCalled()
  })

  it('NO llama revalidateTag ni revalidatePath cuando verifyAdminAccess falla', async () => {
    ;(verifyAdminAccess as jest.Mock).mockReturnValueOnce(
      NextResponse.json({ error: 'No autorizado' }, { status: 401 }),
    )

    const request = makePutRequest({ municipality_id: MUNICIPIO_ID, application_ids: [APP_ID] })
    await PUT(request, { params: { id: MUNICIPIO_ID } })

    expect(cacheMock.revalidateTag).not.toHaveBeenCalled()
    expect(cacheMock.revalidatePath).not.toHaveBeenCalled()
  })

  it('NO llama revalidateTag ni revalidatePath cuando rate limit se dispara', async () => {
    ;(checkRateLimitAsync as jest.Mock).mockReturnValueOnce(
      NextResponse.json({ error: 'rate limited' }, { status: 429 }),
    )

    await PUT(makePutRequest({ municipality_id: MUNICIPIO_ID, application_ids: [APP_ID] }), {
      params: { id: MUNICIPIO_ID },
    })

    expect(cacheMock.revalidateTag).not.toHaveBeenCalled()
    expect(cacheMock.revalidatePath).not.toHaveBeenCalled()
  })
})
