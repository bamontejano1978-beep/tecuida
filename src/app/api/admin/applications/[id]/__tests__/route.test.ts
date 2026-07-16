/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
/**
 * @jest-environment node
 *
 * Contrato de invalidación — `PUT /api/admin/applications/[id]` y `DELETE`.
 *
 * PUT: actualiza propiedades de la app (nombre, thumbnail, activa, etc.).
 *      Afecta a TODAS las landings que la tengan activada → invalidar por tag.
 * DELETE: soft-delete (activa=false). Mismo motivo → invalidar por tag.
 *
 * Idempotencia DELETE: si la app ya estaba desactivada (`existing.activa=false`),
 * el endpoint responde 200 sin tocar la BD → NO debe invalidar (no hubo cambio).
 *
 * En ambos casos válidos se llama:
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
import { PUT, DELETE } from '../route'
import { MUNICIPALITY_APPS_TAG } from '@/lib/tenant/municipality-apps-cache'
import { getAppProgramTag, APP_PROGRAM_TAG_PREFIX } from '@/lib/tenant/app-program-cache'

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

// Mismo helper supabase chainable que otros tests de invalidación.
function buildSupabaseMock(responses: Array<{ data?: unknown; error?: unknown | null }>) {
  let idx = 0
  const consume = () => responses[idx++] ?? { data: null, error: null }
  const supabase = new Proxy(function noop() {} as any, {
    get(_target, prop) {
      if (prop === 'then') {
        return (onFulfilled: any, onRejected: any) =>
          Promise.resolve(consume()).then(onFulfilled, onRejected)
      }
      if (prop === 'single' || prop === 'maybeSingle') {
        return () => Promise.resolve(consume())
      }
      return () => supabase
    },
  })
  return supabase as any
}

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
    `http://localhost/api/admin/applications/${APP_ID}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
  )
}

function makeDeleteRequest() {
  return new Request(
    `http://localhost/api/admin/applications/${APP_ID}`,
    { method: 'DELETE' },
  )
}

beforeEach(() => {
  jest.clearAllMocks()
  setupAuth()
})

describe('PUT /api/admin/applications/[id] — invalidación de cache', () => {
  it('llama revalidateTag(MUNICIPALITY_APPS_TAG) + revalidatePath("/") tras éxito', async () => {
    // 1. .select('id').eq('id').single() → app existe
    // 2. .update(...).eq('id').select().single() → app actualizada (retorna 'data')
    ;(createAdminClient as jest.Mock).mockReturnValue(
      buildSupabaseMock([
        { data: { id: APP_ID }, error: null },
        { data: { id: APP_ID, nombre: 'Mindful30' }, error: null },
      ]),
    )

    const response = await PUT(
      makePutRequest({ nombre: 'Mindful30', activa: true }),
      { params: { id: APP_ID } },
    )

    expect(response.status).toBe(200)
    // PUT success: tag compartido (landings) + tag por-app (bundle programa) + path
    expect(cacheMock.revalidateTag).toHaveBeenCalledTimes(2)
    expect(cacheMock.revalidateTag).toHaveBeenCalledWith(MUNICIPALITY_APPS_TAG)
    expect(cacheMock.revalidateTag).toHaveBeenCalledWith(getAppProgramTag(APP_ID))
    expect(cacheMock.revalidatePath).toHaveBeenCalledTimes(1)
    expect(cacheMock.revalidatePath).toHaveBeenCalledWith('/')
  })

  it('construye el tag por-app con la forma esperada (regression guard)', async () => {
    expect(APP_PROGRAM_TAG_PREFIX).toBe('app-program-')
    expect(getAppProgramTag(APP_ID)).toBe(`app-program-${APP_ID}`)
  })

  it('NO llama revalidate cuando la app no existe', async () => {
    ;(createAdminClient as jest.Mock).mockReturnValue(
      buildSupabaseMock([{ data: null, error: { message: 'not found' } }]),
    )

    await PUT(makePutRequest({ nombre: 'X' }), { params: { id: APP_ID } })

    expect(cacheMock.revalidateTag).not.toHaveBeenCalled()
    expect(cacheMock.revalidatePath).not.toHaveBeenCalled()
  })

  it('NO llama revalidate cuando el update falla', async () => {
    ;(createAdminClient as jest.Mock).mockReturnValue(
      buildSupabaseMock([
        { data: { id: APP_ID }, error: null },
        { data: null, error: { message: 'update failed' } },
      ]),
    )

    await PUT(makePutRequest({ nombre: 'X' }), { params: { id: APP_ID } })

    expect(cacheMock.revalidateTag).not.toHaveBeenCalled()
    expect(cacheMock.revalidatePath).not.toHaveBeenCalled()
  })

  it('NO llama revalidate cuando la validación Zod falla (body inválido)', async () => {
    await PUT(makePutRequest({ nombre: '' }), { params: { id: APP_ID } })

    expect(cacheMock.revalidateTag).not.toHaveBeenCalled()
    expect(cacheMock.revalidatePath).not.toHaveBeenCalled()
  })
})

describe('DELETE /api/admin/applications/[id] — invalidación de cache', () => {
  it('llama revalidateTag + revalidatePath tras desactivar una app activa', async () => {
    // .select('id, activa').eq('id').single() → app activa=true
    // .update({ activa: false }).eq('id') → ok
    ;(createAdminClient as jest.Mock).mockReturnValue(
      buildSupabaseMock([
        { data: { id: APP_ID, activa: true }, error: null },
        { error: null },
      ]),
    )

    const response = await DELETE(makeDeleteRequest(), { params: { id: APP_ID } })

    expect(response.status).toBe(200)
    // DELETE success: tag compartido (landings) + tag por-app (bundle programa) + path
    expect(cacheMock.revalidateTag).toHaveBeenCalledTimes(2)
    expect(cacheMock.revalidateTag).toHaveBeenCalledWith(MUNICIPALITY_APPS_TAG)
    expect(cacheMock.revalidateTag).toHaveBeenCalledWith(getAppProgramTag(APP_ID))
    expect(cacheMock.revalidatePath).toHaveBeenCalledTimes(1)
    expect(cacheMock.revalidatePath).toHaveBeenCalledWith('/')
  })

  it('NO llama revalidate cuando la app ya estaba desactivada (idempotencia)', async () => {
    // existing.activa = false → early return sin tocar la BD
    ;(createAdminClient as jest.Mock).mockReturnValue(
      buildSupabaseMock([{ data: { id: APP_ID, activa: false }, error: null }]),
    )

    const response = await DELETE(makeDeleteRequest(), { params: { id: APP_ID } })

    expect(response.status).toBe(200)
    // El mensaje específico de la rama idempotente
    const body = await response.json()
    expect(body.message).toBe('Aplicación ya estaba desactivada')

    expect(cacheMock.revalidateTag).not.toHaveBeenCalled()
    expect(cacheMock.revalidatePath).not.toHaveBeenCalled()
  })

  it('NO llama revalidate cuando la app no existe', async () => {
    ;(createAdminClient as jest.Mock).mockReturnValue(
      buildSupabaseMock([{ data: null, error: null }]),
    )

    await DELETE(makeDeleteRequest(), { params: { id: APP_ID } })

    expect(cacheMock.revalidateTag).not.toHaveBeenCalled()
    expect(cacheMock.revalidatePath).not.toHaveBeenCalled()
  })

  it('NO llama revalidate cuando el update de soft-delete falla', async () => {
    ;(createAdminClient as jest.Mock).mockReturnValue(
      buildSupabaseMock([
        { data: { id: APP_ID, activa: true }, error: null },
        { error: { message: 'update failed' } },
      ]),
    )

    await DELETE(makeDeleteRequest(), { params: { id: APP_ID } })

    expect(cacheMock.revalidateTag).not.toHaveBeenCalled()
    expect(cacheMock.revalidatePath).not.toHaveBeenCalled()
  })
})
