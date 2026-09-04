/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
/**
 * @jest-environment node
 *
 * Contrato de invalidación — `PUT /api/admin/applications/[id]/bulk`.
 *
 * Asignación masiva: una app se asigna/desasigna de N municipios en una sola
 * operación. Afecta a múltiples landings a la vez → invalidar por tag cubre
 * todos los tenants en una sola operación.
 *
 * Tras éxito, se llama:
 *   • revalidateTag(MUNICIPALITY_APPS_TAG)
 *   • revalidatePath('/')
 */

jest.mock('next/cache', () => {
  // Pasamos la implementación real para preservar APIs como `unstable_cache`
  // que el helper @/lib/tenant/municipality-apps-cache importa, y reemplazamos
  // SOLO las funciones que queremos espiar.
  const actual = jest.requireActual('next/cache')
  return {
    ...actual,
    revalidateTag: jest.fn(),
    revalidatePath: jest.fn(),
  }
})

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

function buildSupabaseMock(responses: Array<{ data?: unknown; error?: unknown | null }>) {
  let idx = 0
  const consume = () => responses[idx++] ?? { data: null, error: null }
  const calls: Array<{ method: string; args: unknown[] }> = []
  const supabase = new Proxy(function noop() {} as any, {
    get(_target, prop) {
      if (prop === '__calls') return calls
      if (prop === 'then') {
        return (onFulfilled: any, onRejected: any) =>
          Promise.resolve(consume()).then(onFulfilled, onRejected)
      }
      if (prop === 'single' || prop === 'maybeSingle') {
        return (...args: unknown[]) => {
          calls.push({ method: String(prop), args })
          return Promise.resolve(consume())
        }
      }
      return (...args: unknown[]) => {
        calls.push({ method: String(prop), args })
        return supabase
      }
    },
  })
  return supabase as any
}

const APP_ID = '22222222-2222-2222-2222-222222222222'
const MUN_ID_1 = 'a1111111-1111-1111-1111-111111111111'
const MUN_ID_2 = 'a2222222-2222-2222-2222-222222222222'

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
    `http://localhost/api/admin/applications/${APP_ID}/bulk`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
  )
}

beforeEach(() => {
  jest.clearAllMocks()
  setupAuth()
})

describe('PUT /api/admin/applications/[id]/bulk — invalidación de cache', () => {
  it('llama revalidateTag(MUNICIPALITY_APPS_TAG) + revalidatePath("/") tras éxito', async () => {
    // 1. .select('id').eq('id').single() → app existe
    // 2. .select('id').in('id', municipality_ids) → municipios válidos
    // 3. consulta de asignaciones existentes → ok
    // 4. .delete().eq('application_id', id) → ok
    // 5. .insert(rows) → ok
    // 6. .select(...).eq('application_id', id) → lista actualizada
    ;(createAdminClient as jest.Mock).mockReturnValue(
      buildSupabaseMock([
        { data: { id: APP_ID }, error: null },
        { data: [{ id: MUN_ID_1 }, { id: MUN_ID_2 }], error: null },
        { data: [], error: null },
        { error: null },
        { error: null },
        { data: [{ municipality_id: MUN_ID_1 }], error: null },
      ]),
    )

    const response = await PUT(
      makePutRequest({ municipality_ids: [MUN_ID_1, MUN_ID_2] }),
      { params: { id: APP_ID } },
    )

    expect(response.status).toBe(200)
    expect(cacheMock.revalidateTag).toHaveBeenCalledTimes(1)
    expect(cacheMock.revalidateTag).toHaveBeenCalledWith(MUNICIPALITY_APPS_TAG)
    expect(cacheMock.revalidatePath).toHaveBeenCalledTimes(1)
    expect(cacheMock.revalidatePath).toHaveBeenCalledWith('/')
  })

  it('llama revalidate incluso con municipality_ids vacío (clear-all)', async () => {
    // 1. .select('id').eq('id').single() → app existe
    // 2. consulta asignaciones existentes
    // 3. delete + final select (no insert porque array vacío)
    ;(createAdminClient as jest.Mock).mockReturnValue(
      buildSupabaseMock([
        { data: { id: APP_ID }, error: null },
        { data: [], error: null },
        { error: null },
        { data: [], error: null },
      ]),
    )

    const response = await PUT(
      makePutRequest({ municipality_ids: [] }),
      { params: { id: APP_ID } },
    )

    expect(response.status).toBe(200)
    // El mensaje del endpoint dice "0 municipios" en este caso
    expect(cacheMock.revalidateTag).toHaveBeenCalledWith(MUNICIPALITY_APPS_TAG)
    expect(cacheMock.revalidatePath).toHaveBeenCalledWith('/')
  })

  it('NO llama revalidate cuando la app no existe', async () => {
    ;(createAdminClient as jest.Mock).mockReturnValue(
      buildSupabaseMock([{ data: null, error: { message: 'not found' } }]),
    )

    await PUT(makePutRequest({ municipality_ids: [MUN_ID_1] }), { params: { id: APP_ID } })

    expect(cacheMock.revalidateTag).not.toHaveBeenCalled()
    expect(cacheMock.revalidatePath).not.toHaveBeenCalled()
  })

  it('NO llama revalidate cuando el DELETE en BD falla', async () => {
    ;(createAdminClient as jest.Mock).mockReturnValue(
      buildSupabaseMock([
        { data: { id: APP_ID }, error: null },
        { data: [{ id: MUN_ID_1 }], error: null },
        { data: [], error: null },
        { error: { message: 'fk violation' } },
      ]),
    )

    await PUT(makePutRequest({ municipality_ids: [MUN_ID_1] }), { params: { id: APP_ID } })

    expect(cacheMock.revalidateTag).not.toHaveBeenCalled()
    expect(cacheMock.revalidatePath).not.toHaveBeenCalled()
  })

  it('NO llama revalidate cuando el INSERT en BD falla', async () => {
    ;(createAdminClient as jest.Mock).mockReturnValue(
      buildSupabaseMock([
        { data: { id: APP_ID }, error: null },
        { data: [{ id: MUN_ID_1 }], error: null },
        { data: [], error: null },
        { error: null },
        { error: { message: 'duplicate key' } },
      ]),
    )

    await PUT(makePutRequest({ municipality_ids: [MUN_ID_1] }), { params: { id: APP_ID } })

    expect(cacheMock.revalidateTag).not.toHaveBeenCalled()
    expect(cacheMock.revalidatePath).not.toHaveBeenCalled()
  })

  it('NO llama revalidate cuando la validación Zod falla', async () => {
    // municipality_ids no es array
    await PUT(makePutRequest({ municipality_ids: 'not-an-array' }), {
      params: { id: APP_ID },
    })

    expect(cacheMock.revalidateTag).not.toHaveBeenCalled()
    expect(cacheMock.revalidatePath).not.toHaveBeenCalled()
  })

  it('deja las nuevas asignaciones como pendientes para el gestor municipal', async () => {
    const supabase = buildSupabaseMock([
      { data: { id: APP_ID }, error: null },
      { data: [{ id: MUN_ID_1 }], error: null },
      { data: [], error: null },
      { error: null },
      { error: null },
      { data: [{ municipality_id: MUN_ID_1 }], error: null },
    ])
    ;(createAdminClient as jest.Mock).mockReturnValue(supabase)

    await PUT(makePutRequest({ municipality_ids: [MUN_ID_1] }), {
      params: { id: APP_ID },
    })

    const insertCall = supabase.__calls.find(
      (call: { method: string }) => call.method === 'insert',
    )
    expect(insertCall?.args[0]).toEqual([
      expect.objectContaining({
        municipality_id: MUN_ID_1,
        application_id: APP_ID,
        activa: true,
        publication_status: 'disponible',
        published_at: null,
        hidden_at: null,
      }),
    ])
  })
})
