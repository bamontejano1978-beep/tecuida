/** @jest-environment node */
/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Tests de descripcion_override (migración 073) en /api/municipio/applications.
 *
 * La gestora municipal puede personalizar la descripción de una app para su
 * municipio sin tocar la descripción global de `applications`:
 *   - string (<= 1000, trimado) → se guarda en descripcion_override.
 *   - '' → mostrar sin descripción en el municipio (intencional).
 *   - null → restaurar la descripción global (columna a NULL).
 */

jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
  revalidateTag: jest.fn(),
  // municipality-apps-cache evalúa unstable_cache a nivel de módulo (import
  // de MUNICIPALITY_APPS_TAG): passthrough para que no explote el import.
  unstable_cache: jest.fn((fn: unknown) => fn),
  unstable_noStore: jest.fn((fn: unknown) => fn),
}))
jest.mock('@/lib/admin/rate-limit', () => ({ checkRateLimitAsync: jest.fn() }))
jest.mock('@/lib/admin/activities', () => ({ getAdminAccess: jest.fn() }))
jest.mock('@/lib/supabase/server', () => ({ createAdminClient: jest.fn() }))

import { POST } from '../route'

const { checkRateLimitAsync } = jest.requireMock('@/lib/admin/rate-limit') as {
  checkRateLimitAsync: jest.Mock
}
const { getAdminAccess } = jest.requireMock('@/lib/admin/activities') as {
  getAdminAccess: jest.Mock
}
const { createAdminClient } = jest.requireMock('@/lib/supabase/server') as {
  createAdminClient: jest.Mock
}
const { revalidateTag } = jest.requireMock('next/cache') as {
  revalidateTag: jest.Mock
}

const MUNICIPALITY_ID = '11111111-1111-1111-1111-111111111111'
const USER_ID = '33333333-3333-3333-3333-333333333333'
const APP_ID = '55555555-0700-5555-5555-555555555555'

function request(body: unknown) {
  return new Request('https://tecuida.group/api/municipio/applications', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

/**
 * Mock flexible del cliente Supabase. La ruta hace dos encadenados sobre
 * municipality_applications: 1) select(...).eq().eq().single() (assignment)
 * y 2) update(...).eq().eq().select().single() (update final). Distinguimos
 * por la llamada a update(): antes de ella, single() devuelve el assignment;
 * después, el updateResult. `captured` guarda payload y select para afirmar.
 */
function mockSupabase(opts: {
  assignment?: { data: unknown; error?: unknown }
  updateResult?: { data: unknown; error?: unknown }
} = {}) {
  const captured: { update?: unknown; select?: string } = {}
  let updated = false
  const builder: any = {
    select: (cols: string) => {
      if (updated) captured.select = cols
      return builder
    },
    eq: () => builder,
    update: (payload: unknown) => {
      captured.update = payload
      updated = true
      return builder
    },
    single: async () =>
      updated
        ? opts.updateResult ?? { data: null, error: null }
        : opts.assignment ?? {
            // Assignment por defecto: app activa en el municipio del gestor.
            data: {
              municipality_id: MUNICIPALITY_ID,
              application_id: APP_ID,
              activa: true,
            },
            error: null,
          },
  }
  createAdminClient.mockReturnValue({ from: () => builder })
  return captured
}

function mockGestora() {
  getAdminAccess.mockResolvedValue({
    is_superadmin: false,
    user_id: USER_ID,
    email: 'gestor@test.com',
    municipality_id: MUNICIPALITY_ID,
  })
}

beforeEach(() => {
  jest.clearAllMocks()
  checkRateLimitAsync.mockResolvedValue(null)
  mockGestora()
})

describe('POST /api/municipio/applications — descripcion_override (073)', () => {
  it('guarda la descripción recortada y revalida la caché de apps', async () => {
    const captured = mockSupabase({
      updateResult: {
        data: { application_id: APP_ID, descripcion_override: 'Texto municipal' },
        error: null,
      },
    })

    const response = await POST(
      request({ application_id: APP_ID, descripcion_override: '  Texto municipal  ' }),
    )
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(captured.update).toMatchObject({ descripcion_override: 'Texto municipal' })
    expect(captured.select).toContain('descripcion_override')
    expect(body.data.descripcion_override).toBe('Texto municipal')
    expect(revalidateTag).toHaveBeenCalledWith('municipality-apps')
    expect(revalidateTag).toHaveBeenCalledTimes(1)
  })

  it('null restaura la descripción global (columna a NULL)', async () => {
    const captured = mockSupabase({
      updateResult: { data: { application_id: APP_ID, descripcion_override: null }, error: null },
    })

    const response = await POST(request({ application_id: APP_ID, descripcion_override: null }))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(captured.update).toMatchObject({ descripcion_override: null })
    expect(body.data.descripcion_override).toBeNull()
  })

  it('cadena vacía = mostrar sin descripción en el municipio (intencional)', async () => {
    const captured = mockSupabase({
      updateResult: { data: { application_id: APP_ID, descripcion_override: '' }, error: null },
    })

    const response = await POST(request({ application_id: APP_ID, descripcion_override: '   ' }))

    expect(response.status).toBe(200)
    // El trim de '   ' da '', que se conserva: significa "sin descripción".
    expect(captured.update).toMatchObject({ descripcion_override: '' })
  })

  it('acepta exactamente 1000 caracteres (frontera del límite)', async () => {
    const captured = mockSupabase({
      updateResult: { data: { application_id: APP_ID, descripcion_override: 'x' }, error: null },
    })

    await POST(request({ application_id: APP_ID, descripcion_override: 'a'.repeat(1000) }))

    const saved = (captured.update as { descripcion_override: string }).descripcion_override
    expect(saved).toHaveLength(1000)
  })

  it('rechaza descripciones > 1000 con 422 (validación zod)', async () => {
    const captured = mockSupabase()

    const response = await POST(
      request({ application_id: APP_ID, descripcion_override: 'a'.repeat(1001) }),
    )

    expect(response.status).toBe(422)
    expect(captured.update).toBeUndefined()
  })

  it('rechaza el body si no trae ningún campo editable (422)', async () => {
    const response = await POST(request({ application_id: APP_ID }))
    expect(response.status).toBe(422)
  })

  it('devuelve 401 sin sesión y 403 para superadmin', async () => {
    getAdminAccess.mockResolvedValueOnce(null)
    const noAuth = await POST(request({ application_id: APP_ID, descripcion_override: 'x' }))
    expect(noAuth.status).toBe(401)

    getAdminAccess.mockResolvedValueOnce({
      is_superadmin: true,
      user_id: USER_ID,
      email: 'sa@test.com',
      municipality_id: null,
    })
    const superadmin = await POST(request({ application_id: APP_ID, descripcion_override: 'x' }))
    expect(superadmin.status).toBe(403)
  })

  it('devuelve 404 si la app no está asignada al municipio', async () => {
    mockSupabase({ assignment: { data: null, error: { message: 'no rows' } } })

    const response = await POST(request({ application_id: APP_ID, descripcion_override: 'x' }))
    expect(response.status).toBe(404)
  })

  it('devuelve 422 si la asignación está inactiva', async () => {
    mockSupabase({ assignment: { data: { activa: false } } })

    const response = await POST(request({ application_id: APP_ID, descripcion_override: 'x' }))
    expect(response.status).toBe(422)
  })

  it('devuelve 500 si el update falla', async () => {
    mockSupabase({
      updateResult: { data: null, error: { message: 'column does not exist' } },
    })

    const response = await POST(request({ application_id: APP_ID, descripcion_override: 'x' }))
    expect(response.status).toBe(500)
  })
})
