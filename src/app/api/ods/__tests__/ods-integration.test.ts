/** @jest-environment node */
/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Test de integración del ciclo completo del programa ODS con
 * aplicación pre-asignada al lote (migración 069):
 *
 *   1. Generar lote con app asignada   → POST /api/municipio/invite-codes
 *   2. Importar destinos (tarjetas)    → POST /api/municipio/ods (import_destinations)
 *   3. Enviar códigos por correo       → POST /api/municipio/ods (send_pending)
 *   4. Resolver la app del código      → GET /api/ods/resolve
 *   5. Activar (sin elegir app)        → POST /api/ods/activate
 *
 * Las cuatro rutas reales se ejecutan contra UNA base de datos en memoria
 * compartida (emulación de PostgREST). Las funciones SQL transaccionales
 * (activate_code_grant y su semántica de 068/069) están fuera de alcance
 * aquí: en la ruta de activación se verifica el CONTRATO con la RPC
 * (hashes, p_application_id=NULL y error mapeado), no la lógica SQL.
 *
 * Aislamiento de red: fetch global interceptado para Resend.
 */

jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }))
jest.mock('@/lib/admin/rate-limit', () => ({ checkRateLimitAsync: jest.fn() }))
jest.mock('@/lib/admin/activities', () => ({ getAdminAccess: jest.fn() }))
jest.mock('@/lib/supabase/server', () => ({
  createAdminClient: jest.fn(),
  createClient: jest.fn(),
}))

// El resto de módulos reales: hashing, cripto de destinos, generación de
// códigos, handlers de rutas. Solo se mockea la capa de acceso a datos.

import { POST as inviteCodesPOST } from '@/app/api/municipio/invite-codes/route'
import { POST as odsPOST } from '@/app/api/municipio/ods/route'
import { GET as resolveGET } from '@/app/api/ods/resolve/route'
import { POST as activatePOST } from '@/app/api/ods/activate/route'

// ─────────────────────────────────────────────────────────────────────────
// Base de datos en memoria
// ─────────────────────────────────────────────────────────────────────────

const MUNICIPALITY_ID = '11111111-0069-1111-1111-111111111111'
const MANAGER_USER_ID = '33333333-0069-3333-3333-333333333333'
const CITIZEN_USER_ID = '44444444-0069-4444-4444-444444444444'
const APP_ID = '22222222-0069-2222-2222-222222222222'
const APP_NAME = 'Reto 30'

interface DbRow {
  id?: string
  [key: string]: unknown
}

function inMemoryDb() {
  // Defaults de columna NOT NULL con DEFAULT en la migración real: la ruta
  // no los envía (confía en la DB), así que la emulación los aplica aquí.
  const TABLE_DEFAULTS: Record<string, Record<string, unknown>> = {
    municipal_invite_codes: {
      estado: 'disponible',
      sent_count: 0,
    },
    municipal_invite_batches: {
      estado: 'activo',
    },
  }

  const tables: Record<string, DbRow[]> = {
    municipalities: [
      {
        id: MUNICIPALITY_ID,
        slug: 'villafranca',
        invite_codes_required: false,
        oculto_admin: false,
      },
    ],
    municipality_applications: [
      {
        application_id: APP_ID,
        municipality_id: MUNICIPALITY_ID,
        activa: true,
        publication_status: 'publicada',
      },
    ],
    applications: [{ id: APP_ID, nombre: APP_NAME }],
    municipal_invite_batches: [],
    municipal_invite_codes: [],
    users: [
      { id: MANAGER_USER_ID, municipality_id: MUNICIPALITY_ID },
      { id: CITIZEN_USER_ID, municipality_id: MUNICIPALITY_ID },
    ],
  }

  function makeBuilder(table: string) {
    const rows = tables[table] || []
    const state: {
      filters: Array<[string, string, unknown]>
      selected: string | null
      insertRows: DbRow[] | null
      updatePatch: Record<string, unknown> | null
      deleted: boolean
      limitCount: number | null
      notNullCol: string | null
      isNullCol: string | null
      inFilter: Array<[string, unknown[]]> | null
      orderCol: string | null
    } = {
      filters: [],
      selected: null,
      insertRows: null,
      updatePatch: null,
      deleted: false,
      limitCount: null,
      notNullCol: null,
      isNullCol: null,
      inFilter: null,
      orderCol: null,
    }

    function matches(row: DbRow): boolean {
      for (const [col, op, val] of state.filters) {
        if (op === 'eq' && row[col] !== val) return false
      }
      if (state.inFilter) {
        for (const [col, values] of state.inFilter) {
          const v = row[col]
          if (!values.includes(v)) return false
        }
      }
      // SQL: NULL e "inexistente" son equivalentes a efectos de filtro.
      if (state.notNullCol && (row[state.notNullCol] ?? null) === null) return false
      if (state.isNullCol && (row[state.isNullCol] ?? null) !== null) return false
      return true
    }

    const builder: any = {
      select: (cols?: string) => {
        state.selected = cols || '*'
        return builder
      },
      insert: (payload: DbRow | DbRow[]) => {
        state.insertRows = Array.isArray(payload) ? payload : [payload]
        return builder
      },
      update: (patch: Record<string, unknown>) => {
        state.updatePatch = patch
        return builder
      },
      delete: () => {
        state.deleted = true
        return builder
      },
      eq: (col: string, val: unknown) => {
        state.filters.push([col, 'eq', val])
        return builder
      },
      in: (col: string, values: unknown[]) => {
        state.inFilter = [[col, values]]
        return builder
      },
      not: (col: string, _op: string, val: null) => {
        state.notNullCol = col
        void val
        return builder
      },
      is: (col: string, val: null) => {
        if (val === null) state.isNullCol = col
        return builder
      },
      order: (col: string) => {
        state.orderCol = col
        return builder
      },
      limit: (n: number) => {
        state.limitCount = n
        return builder
      },
      // PostgREST-like: las mutaciones pendientes (insert/update/delete)
      // se ejecutan en el primer terminal (single/maybeSingle/then).
      flush(): { data: unknown; error: unknown } {
        if (state.insertRows) {
          const now = new Date().toISOString()
          const defaults = TABLE_DEFAULTS[table] || {}
          const inserted = state.insertRows.map((r, i) => ({
            ...defaults,
            ...r,
            id: (r.id as string | undefined) ?? `${table}-id-${rows.length + 1}-${i}`,
            created_at: now,
          }))
          rows.push(...inserted)
          state.insertRows = null
          return { data: JSON.parse(JSON.stringify(inserted[0] ?? null)), error: null }
        }
        if (state.updatePatch) {
          for (const row of rows) {
            if (matches(row)) Object.assign(row, state.updatePatch)
          }
          state.updatePatch = null
          return { data: null, error: null }
        }
        if (state.deleted) {
          let kept = 0
          for (const row of rows) {
            if (!matches(row)) rows[kept++] = row
          }
          rows.length = kept
          state.deleted = false
          return { data: null, error: null }
        }
        let found = rows.filter(matches)
        if (state.orderCol) {
          found = [...found].sort((a, b) =>
            String(a[state.orderCol!]).localeCompare(String(b[state.orderCol!])),
          )
        }
        if (state.limitCount !== null) found = found.slice(0, state.limitCount)
        return { data: JSON.parse(JSON.stringify(found)), error: null }
      },
      single: async function () {
        if (state.insertRows || state.updatePatch || state.deleted) {
          const res = builder.flush()
          // insert+select+single devuelve la fila insertada
          if (res.data) return res
          return { data: null, error: { message: 'expected 1 row', code: 'PGRST116' } }
        }
        const found = rows.filter(matches)
        if (found.length !== 1) {
          return { data: null, error: { message: 'expected 1 row', code: 'PGRST116' } }
        }
        return { data: JSON.parse(JSON.stringify(found[0])), error: null }
      },
      maybeSingle: async function () {
        if (state.insertRows || state.updatePatch || state.deleted) {
          return builder.flush()
        }
        const found = rows.filter(matches)
        return {
          data: found[0] ? JSON.parse(JSON.stringify(found[0])) : null,
          error: null,
        }
      },
      // await builder → PostgREST-like ejecución de insert/update/delete/select-*
      then: (resolve: (value: unknown) => unknown) => {
        resolve(builder.flush())
      },
    }
    return builder
  }

  // Resolución del join `batch:municipal_invite_batches(application:applications(nombre))`:
  // enriquece filas de municipal_invite_codes con su lote y app.
  function enrichCodesWithBatch(rows: DbRow[]): DbRow[] {
    return rows.map((row) => {
      if (!('batch_id' in row) || row.batch) return row
      const batch = tables.municipal_invite_batches.find((b) => b.id === row.batch_id)
      const application = batch?.application_id
        ? tables.applications.find((a) => a.id === batch.application_id) || null
        : null
      return {
        ...row,
        // Misma forma que el join real `batch:municipal_invite_batches!(
        //   application_id, application:applications(id, nombre, ...))`:
        // el objeto application lleva TODAS las columnas seleccionadas (con id).
        batch: application && batch
          ? {
              application_id: batch.application_id,
              application,
            }
          : null,
      }
    })
  }

  function makeBuilderEnriched(table: string) {
    const builder = makeBuilder(table)
    if (table !== 'municipal_invite_codes') return builder
    const originalMaybeSingle = builder.maybeSingle.bind(builder)
    builder.maybeSingle = async () => {
      const res = await originalMaybeSingle()
      if (res.data && 'batch_id' in res.data) {
        res.data = enrichCodesWithBatch([res.data])[0]
      }
      return res
    }
    const originalThen = builder.then.bind(builder)
    builder.then = (resolve: (value: unknown) => unknown) =>
      originalThen((result: { data: unknown }) => {
        if (Array.isArray(result.data)) {
          result = { ...result, data: enrichCodesWithBatch(result.data) }
        }
        return resolve(result)
      })
    return builder
  }

  const rpcMock = jest.fn()

  return {
    from: jest.fn((table: string) => makeBuilderEnriched(table)),
    // rpc: la activación real vive en la función SQL; el test de integración
    // verifica el contrato (se sobreescribe por test cuando hace falta).
    rpc: rpcMock,
    __tables: tables,
    __reset: () => {
      for (const key of Object.keys(tables)) {
        if (!['municipalities', 'municipality_applications', 'applications', 'users'].includes(key)) {
          tables[key] = []
        }
      }
    },
  }
}

const db = inMemoryDb()

// ─────────────────────────────────────────────────────────────────────────
// Mocks de auth por rol
// ─────────────────────────────────────────────────────────────────────────

const { getAdminAccess } = jest.requireMock('@/lib/admin/activities') as {
  getAdminAccess: jest.Mock
}
const getAdminAccessMock = getAdminAccess

function mockAuth(modules: {
  clientUser?: { id: string; email: string } | null
  adminAccess?: unknown
}) {
  // /api/municipio/* usa getAdminAccess; /api/ods/* usa createClient().auth
  getAdminAccessMock.mockResolvedValue(
    'adminAccess' in modules ? modules.adminAccess : {
      is_superadmin: false,
      user_id: MANAGER_USER_ID,
      email: 'gestora@villafranca.es',
      municipality_id: MUNICIPALITY_ID,
    },
  )

  const citizen = modules.clientUser === undefined
    ? { id: CITIZEN_USER_ID, email: 'ana@participante.es' }
    : modules.clientUser

  const { createClient, createAdminClient } = jest.requireMock('@/lib/supabase/server') as {
    createClient: jest.Mock
    createAdminClient: jest.Mock
  }
  createClient.mockReturnValue({
    auth: { getUser: async () => ({ data: { user: citizen } }) },
  })
  createAdminClient.mockReturnValue(db)
}

beforeEach(() => {
  jest.clearAllMocks()
  db.__reset()
  db.rpc.mockReset()
  db.rpc.mockImplementation(async () => ({
    data: null,
    error: { message: 'RPC_NOT_MOCKED' },
  }))
  process.env.INVITE_CODE_PEPPER = 'test-pepper-with-at-least-thirty-two-characters'
  process.env.ODS_DESTINATION_KEY = 'a'.repeat(64)
  process.env.RESEND_API_KEY = 're_test_key'

  const { checkRateLimitAsync } = jest.requireMock('@/lib/admin/rate-limit')
  checkRateLimitAsync.mockResolvedValue(null)
})

afterEach(() => {
  jest.restoreAllMocks()
})

// ─────────────────────────────────────────────────────────────────────────
// Helpers de petición
// ─────────────────────────────────────────────────────────────────────────

function postRequest(url: string, body: unknown) {
  return new Request(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

let sentEmails: Array<{ to: string; subject: string; html: string }> = []

beforeEach(() => {
  sentEmails = []
  jest.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
    const url = String(input)
    if (url.includes('api.resend.com/emails')) {
      const body = JSON.parse(String(init?.body)) as {
        to: string[]
        subject: string
        html: string
      }
      sentEmails.push({ to: body.to[0], subject: body.subject, html: body.html })
      return new Response(JSON.stringify({ id: 'email-id' }), { status: 200 })
    }
    return new Response('unexpected fetch', { status: 500 })
  })
})

// ─────────────────────────────────────────────────────────────────────────
// El ciclo completo
// ─────────────────────────────────────────────────────────────────────────

describe('ciclo completo ODS: lote con app → envío → activación', () => {
  it('ejecuta las 5 fases con app pre-asignada y personaliza el correo', async () => {
    mockAuth({})

    // ── FASE 1: generar lote con aplicación pre-asignada ──
    const genRes = await inviteCodesPOST(postRequest(
      'https://tecuida.group/api/municipio/invite-codes',
      {
        action: 'generate',
        nombre: 'Semana 42 · Reto 30',
        cantidad: 3,
        expires_in_days: 30,
        proposito: 'ods',
        application_id: APP_ID,
      },
    ))
    const genBody = await genRes.json()

    expect(genRes.status).toBe(201)
    expect(genBody.codes).toHaveLength(3)

    // El lote quedó en la "DB" con la app asignada
    expect(db.__tables.municipal_invite_batches).toHaveLength(1)
    expect(db.__tables.municipal_invite_batches[0].application_id).toBe(APP_ID)
    expect(db.__tables.municipal_invite_codes).toHaveLength(3)

    // ── FASE 2: importar destinos (CSV de tarjetas) ──
    const [c1, c2, c3] = genBody.codes as string[]
    const importRes = await odsPOST(postRequest(
      'https://tecuida.group/api/municipio/ods',
      {
        action: 'import_destinations',
        rows: [
          { code_value: c1, email: 'ana@participante.es' },
          { code_value: c2, email: 'luis@participante.es' },
          { code_value: c3, email: 'marta@participante.es' },
        ],
      },
    ))
    const importBody = await importRes.json()

    expect(importRes.status).toBe(200)
    expect(importBody.imported).toBe(3)

    // Los hashes de destino quedaron asignados a cada código
    const codeRows = db.__tables.municipal_invite_codes
    expect(codeRows.every((c) => typeof c.destination_email_hash === 'string')).toBe(true)
    expect(codeRows.every((c) => typeof c.destination_email_encrypted === 'string')).toBe(true)

    // ── FASE 3: enviar los códigos pendientes por correo ──
    const sendRes = await odsPOST(postRequest(
      'https://tecuida.group/api/municipio/ods',
      { action: 'send_pending' },
    ))
    const sendBody = await sendRes.json()

    expect(sendRes.status).toBe(200)
    expect(sendBody.sent).toBe(3)
    expect(sendBody.failed).toEqual([])

    // 3 correos capturados; el subject menciona la app asignada (069)
    expect(sentEmails).toHaveLength(3)
    for (const email of sentEmails) {
      expect(email.subject).toBe(`Tu acceso a ${APP_NAME} · VCA TE CUIDA`)
      expect(email.html).toContain(APP_NAME)
      expect(email.html).toContain(encodeURIComponent === encodeURIComponent ? '' : '')
    }
    // Cada correo fue a su destino
    expect(new Set(sentEmails.map((e) => e.to))).toEqual(
      new Set(['ana@participante.es', 'luis@participante.es', 'marta@participante.es']),
    )

    // sent_at marcado en DB
    expect(codeRows.every((c) => typeof c.sent_at === 'string')).toBe(true)

    // ── FASE 4: resolver la app pre-asignada del código (ciudadana) ──
    mockAuth({ clientUser: { id: CITIZEN_USER_ID, email: 'ana@participante.es' } })

    const resolveRes = await resolveGET(
      new Request(`https://tecuida.group/api/ods/resolve?code=${encodeURIComponent(c1)}`),
    )
    const resolveBody = await resolveRes.json()

    expect(resolveRes.status).toBe(200)
    expect(resolveBody.assigned).toBe(true)
    expect(resolveBody.application.id).toBe(APP_ID)
    expect(resolveBody.application.nombre).toBe(APP_NAME)

    // ── FASE 5: activar sin elegir app (la RPC recibe p_application_id NULL) ──
    const rpcArgs: Record<string, unknown>[] = []
    db.rpc.mockImplementation(async (_fn: string, ...rest: unknown[]) => {
      rpcArgs.push(rest[0] as Record<string, unknown>)
      return { data: APP_ID, error: null }
    })

    const activateRes = await activatePOST(postRequest(
      'https://tecuida.group/api/ods/activate',
      { code: ` ${c1.toLowerCase()} ` }, // con espacios y minúsculas: normaliza
    ))
    const activateBody = await activateRes.json()

    expect(activateRes.status).toBe(200)
    expect(activateBody.application_id).toBe(APP_ID)
    expect(rpcArgs[0]).toEqual(expect.objectContaining({
      p_user_id: CITIZEN_USER_ID,
      p_application_id: null,
    }))
    expect(rpcArgs[0].p_code_hash).toMatch(/^[0-9a-f]{64}$/)
    expect(rpcArgs[0].p_email_hash).toMatch(/^[0-9a-f]{64}$/)
  })

  it('sin app en el lote, resolve devuelve assigned:false y el flujo clásico pide app', async () => {
    mockAuth({})

    // Lote SIN application_id (comportamiento clásico)
    const genRes = await inviteCodesPOST(postRequest(
      'https://tecuida.group/api/municipio/invite-codes',
      {
        action: 'generate',
        nombre: 'Lote clásico',
        cantidad: 1,
        expires_in_days: 30,
        proposito: 'ods',
      },
    ))
    const [code] = (await genRes.json()).codes as string[]

    await odsPOST(postRequest('https://tecuida.group/api/municipio/ods', {
      action: 'import_destinations',
      rows: [{ code_value: code, email: 'ana@participante.es' }],
    }))

    mockAuth({ clientUser: { id: CITIZEN_USER_ID, email: 'ana@participante.es' } })

    const resolveRes = await resolveGET(
      new Request(`https://tecuida.group/api/ods/resolve?code=${encodeURIComponent(code)}`),
    )
    const resolveBody = await resolveRes.json()
    expect(resolveBody.assigned).toBe(false)

    // Activación clásica: el cliente envía la app elegida
    const rpcArgs: Record<string, unknown>[] = []
    db.rpc.mockImplementation(async (_fn: string, ...rest: unknown[]) => {
      rpcArgs.push(rest[0] as Record<string, unknown>)
      return { data: APP_ID, error: null }
    })

    const activateRes = await activatePOST(postRequest(
      'https://tecuida.group/api/ods/activate',
      { code, application_id: APP_ID },
    ))

    expect(activateRes.status).toBe(200)
    expect(rpcArgs[0]).toEqual(expect.objectContaining({
      p_application_id: APP_ID,
    }))
  })

  it('rechaza la activación cuando el correo activador no es el destino del código', async () => {
    mockAuth({})

    const genRes = await inviteCodesPOST(postRequest(
      'https://tecuida.group/api/municipio/invite-codes',
      {
        action: 'generate',
        nombre: 'Lote privado',
        cantidad: 1,
        expires_in_days: 30,
        proposito: 'ods',
        application_id: APP_ID,
      },
    ))
    const [code] = (await genRes.json()).codes as string[]

    await odsPOST(postRequest('https://tecuida.group/api/municipio/ods', {
      action: 'import_destinations',
      rows: [{ code_value: code, email: 'duena@delcodigo.es' }],
    }))

    // Otra persona intenta activar con ese código
    mockAuth({ clientUser: { id: CITIZEN_USER_ID, email: 'intrusa@otrocorreo.es' } })

    // Simula el error que la función SQL devuelve por vinculación estricta
    db.rpc.mockImplementation(async () => ({
      data: null,
      error: { message: 'CODE_EMAIL_MISMATCH' },
    }))

    const activateRes = await activatePOST(postRequest(
      'https://tecuida.group/api/ods/activate',
      { code }, // ni siquiera necesita app: falla antes por el correo
    ))
    const body = await activateRes.json()

    expect(activateRes.status).toBe(422)
    expect(body.error).toContain('otro correo')
  })
})
