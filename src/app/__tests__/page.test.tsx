/**
 * @jest-environment node
 *
 * Contrato de integración page-level — src/app/page.tsx (landing pública).
 *
 * Decisión de diseño:
 *   • React 18 prod `renderToString` (react-dom/server) NO soporta async
 *     Server Components sin el protocolo Flight que Next.js aplica sobre
 *     `next/standalone`. Si lo invocaramos directamente, `<TenantPage>`
 *     (async function) recibiría `undefined` como props y el destructuring
 *     interno fallaría antes incluso de llegar al contrato cache/render.
 *
 *   • Sustituimos el render por una verificación DIRECTA del data path que
 *     `src/app/page.tsx` ejecuta dentro de `HomePage`:
 *       HomePage → getMunicipalityAppsForLanding(tenant.id) → _fetchMunicipalityApps (DB)
 *
 *     Si una llamada posterior al helper cacheado (post-PUT + revalidateTag)
 *     devuelve las N apps esperadas, queda demostrado que:
 *       1. el endpoint PUT muta correctamente `municipality_applications`,
 *       2. el endpoint llama `revalidateTag(MUNICIPALITY_APPS_TAG)`,
 *       3. la cache invalidada sirve datos frescos en la próxima lectura,
 *       4. `TenantPage` recibe esos datos vía el post-PUT render dinámico.
 *
 *     Los pasos 4.2 y 4.4 los cubren los unit tests existentes en los
 *     `__tests__/route.test.ts` de cada admin endpoint (verifican el
 *     contrato `revalidateTag`). El nuevo test cierra el eslabón que
 *     faltaba entre PUT y render público.
 *
 * Si en el futuro se quiere un render literal HTML sobre `TenantPage`,
 * la opción correcta es ejecutar el test con `@playwright/test` sobre
 * el dev server (`next dev` + `playwright.config.ts`), NO este test unit.
 */

// ────────────────────────────────────────────────────────────────────────────
// 1. Estado "vivo" de la DB simulada (single source of truth)
// ────────────────────────────────────────────────────────────────────────────

const ZAFRA_ID = 'e0000001-0000-0000-0000-000000000006'
const APP_BIENESTAR_1 = '22222222-0000-0000-0000-000000000001'
const APP_BIENESTAR_2 = '22222222-0000-0000-0000-000000000003'
const APP_FAMILIA_1 = '22222222-0000-0000-0000-000000000007'

interface MockApp {
  id: string
  category_id: string
  nombre: string
  descripcion: string
  thumbnail_url: string | null
  tipo: string
  activa: boolean
  app_slug: string | null
  url_acceso: string | null
  /**
   * Post-migration 039, `created_at` está garantizado en
   * `public.applications` (NOT NULL DEFAULT NOW() con backfill desde
   * `municipality_applications.fecha_activacion`). El test espeja el
   * shape real del helper para no enmascarar regresiones futuras
   * (e.g. si alguien vuelve a quitar `created_at` del SELECT, el mock
   * seguirá retornándolo y el filter `recentCategoryIds` funcionará
   * de forma engañosa).
   */
  created_at: string
}

interface MockCategory {
  id: string
  nombre: string
  descripcion: string | null
  icono_url: string | null
  orden: number
}

interface MockAssignment {
  municipality_id: string
  application_id: string
  activa: boolean
  fecha_activacion: string
}

const dbCategories: MockCategory[] = [
  {
    id: 'cat-bienestar',
    nombre: 'Bienestar emocional',
    descripcion: 'Programas de mindfulness',
    icono_url: null,
    orden: 1,
  },
  {
    id: 'cat-familia',
    nombre: 'Familia y crianza',
    descripcion: 'Apoyo familiar',
    icono_url: null,
    orden: 2,
  },
]

const dbApps: MockApp[] = [
  {
    id: APP_BIENESTAR_1,
    category_id: 'cat-bienestar',
    nombre: 'Mindful30 Adultos',
    descripcion: 'Mindfulness 30 días',
    thumbnail_url: null,
    tipo: 'programa',
    activa: true,
  app_slug: null,
  url_acceso: null,
  created_at: '2025-01-01T00:00:00Z',
},
  {
    id: APP_BIENESTAR_2,
    category_id: 'cat-bienestar',
    nombre: 'Mindful30 Infantil',
    descripcion: 'Mindfulness niños',
    thumbnail_url: null,
    tipo: 'programa',
    activa: true,
  app_slug: null,
  url_acceso: null,
  created_at: '2025-01-01T00:00:00Z',
},
  {
    id: APP_FAMILIA_1,
    category_id: 'cat-familia',
    nombre: 'Crianza positiva',
    descripcion: 'Herramienta de apoyo',
    thumbnail_url: null,
    tipo: 'herramienta',
    activa: true,
  app_slug: null,
  url_acceso: null,
  created_at: '2025-01-01T00:00:00Z',
},
]

const dbAssignments: MockAssignment[] = []

const zafraTenant = {
  id: ZAFRA_ID,
  slug: 'zafra',
  nombre_municipio: 'Zafra',
  nombre_ayuntamiento: 'Ayuntamiento de Zafra',
  dominio: 'zafra.tecuida.group',
  estado_suscripcion: 'activa',
  escudo_url: '',
  logo_url: '',
  hero_image_url: '',
  colores_corporativos: {
    primary: '#142c19',
    secondary: '#38633e',
    accent: '#d79a35',
    background: '#f7f1e7',
    text: '#20231f',
  },
  imagenes_municipio: [],
  textos_institucionales: {
    bienvenida: 'Bienvenido a Zafra te cuida',
    descripcion: 'Programas y recursos para Zafra',
    pie_pagina: 'pie de pagina',
    stats_titulo: 'Resumen',
    programas_titulo: 'Nuestros programas',
    programas_subtitulo: '¿En qué podemos ayudarte?',
    cta_titulo: 'Acceso directo',
    cta_texto: '',
  },
  modulos_activos: [],
  email_contacto: null,
  telefono_contacto: null,
}

// ────────────────────────────────────────────────────────────────────────────
// 2. Fake `next/cache`
// ────────────────────────────────────────────────────────────────────────────
// `unstable_cache` wrapper que:
//   • En MISS ejecuta el callback y cachea el resultado con sus tags.
//   • En HIT devuelve el valor cacheado.
//   • `revalidateTag(tag)` borra TODAS las entradas con ese tag.

const fakeCache = {
  entries: new Map<string, { value: unknown; tags: string[] }>(),
  revalidateTagCalls: [] as string[],
  reset() {
    this.entries.clear()
    this.revalidateTagCalls.length = 0
  },
}

jest.mock('next/cache', () => {
  return {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    unstable_cache: (fn: any, keyParts: any, options: any) => {
      return async (...args: unknown[]) => {
        const key = JSON.stringify([fn.name, keyParts, args])
        const entry = fakeCache.entries.get(key)
        if (entry) return entry.value
        const value = await fn(...args)
        fakeCache.entries.set(key, {
          value,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          tags: (options?.tags ?? []) as string[],
        })
        return value
      }
    },
    revalidateTag: (tag: string) => {
      fakeCache.revalidateTagCalls.push(tag)
      for (const [key, entry] of [...fakeCache.entries]) {
        if (entry.tags.includes(tag)) fakeCache.entries.delete(key)
      }
    },
    revalidatePath: jest.fn(),
  }
})

// ────────────────────────────────────────────────────────────────────────────
// 3. Mock `@/lib/supabase/server` — admin client con estado shared
// ────────────────────────────────────────────────────────────────────────────
// IMPORTANTE: `createAdminClient` se invoca en CADA query del cache +
// del PUT handler. Cada llamada devuelve un Proxy NUEVO con closure state
// fresco (`table`, `eqFilters`, `pendingInsert`, …). Así el handler y el
// helper cacheado leen/escriben del MISMO estado `dbAssignments` sin que
// se pisen entre sí.

function joinedAssignment(row: MockAssignment) {
  const app = dbApps.find((a) => a.id === row.application_id)
  return {
    application_id: row.application_id,
    application: app ?? null,
  }
}

function adminSupabase() {
  let table: string | null = null
  let eqFilters: Array<{ col: string; val: unknown }> = []
  let inFilter: { col: string; vals: unknown[] } | null = null
  let orderBy: { col: string; asc: boolean } | null = null
  let pendingInsert: unknown = null
  let pendingDelete = false

  const make = () => {
    const builder = {
      from: (t: string) => {
        // Reset de chain state al iniciar nueva query — equivalente al ciclo
        // "nueva query = estado limpio" del cliente Supabase real. Garantiza
        // que filtros/orden/flags de la chain anterior no contaminen la
        // siguiente (caso PUT admin: DELETE → INSERT → SELECT en mismo proxy).
        table = t
        eqFilters = []
        inFilter = null
        orderBy = null
        pendingInsert = null
        pendingDelete = false
        return make()
      },
      select: () => make(),
      eq: (col: string, val: unknown) => {
        eqFilters.push({ col, val })
        return make()
      },
      in: (col: string, vals: unknown[]) => {
        inFilter = { col, vals }
        return make()
      },
      order: (col: string, opts?: { ascending?: boolean }) => {
        orderBy = { col, asc: opts?.ascending ?? true }
        return make()
      },
      delete: () => {
        pendingDelete = true
        return make()
      },
      insert: (rows: unknown) => {
        pendingInsert = rows
        return make()
      },
      single: async () => consume('single'),
      maybeSingle: async () => consume('maybeSingle'),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      then: (onFulfilled: any) => consume('then').then(onFulfilled),
    }
    return builder
  }

  function consume(
    terminal: 'single' | 'maybeSingle' | 'then',
  ): Promise<{ data: unknown; error: unknown | null }> {
    if (table === 'municipalities') {
      const slugFilter = eqFilters.find((f) => f.col === 'slug')
      if (slugFilter) {
        return Promise.resolve({
          data: slugFilter.val === zafraTenant.slug ? zafraTenant : null,
          error: null,
        })
      }
      const idFilter = eqFilters.find((f) => f.col === 'id')
      if (idFilter) {
        return Promise.resolve({
          data: idFilter.val === zafraTenant.id ? { id: zafraTenant.id } : null,
          error: null,
        })
      }
      return Promise.resolve({ data: [], error: null })
    }

    if (table === 'applications') {
      if (terminal === 'single' && eqFilters.length > 0) {
        return Promise.resolve({ data: { id: APP_BIENESTAR_1 }, error: null })
      }
      if (inFilter) {
        const ids = new Set<string>(inFilter.vals as string[])
        const valid = dbApps.filter((a) => ids.has(a.id)).map((a) => ({ id: a.id }))
        return Promise.resolve({ data: valid, error: null })
      }
      return Promise.resolve({ data: [], error: null })
    }

    if (table === 'municipality_applications') {
      const munFilter = eqFilters.find((f) => f.col === 'municipality_id')
      const activaFilter = eqFilters.find((f) => f.col === 'activa')
      const idFilter = eqFilters.find((f) => f.col === 'id')

      if (terminal === 'single' && idFilter) {
        const exists = dbAssignments.some((a) => a.application_id === idFilter.val)
        return Promise.resolve({
          data: exists ? { id: idFilter.val } : null,
          error: null,
        })
      }

      if (pendingDelete) {
        if (munFilter) {
          for (let i = dbAssignments.length - 1; i >= 0; i--) {
            if (dbAssignments[i].municipality_id === munFilter.val) {
              dbAssignments.splice(i, 1)
            }
          }
        }
        return Promise.resolve({ data: null, error: null })
      }

      if (pendingInsert) {
        const rows = pendingInsert as Array<{
          municipality_id: string
          application_id: string
          activa: boolean
        }>
        for (const r of rows) {
          dbAssignments.push({
            municipality_id: r.municipality_id,
            application_id: r.application_id,
            activa: r.activa ?? true,
            fecha_activacion: new Date().toISOString(),
          })
        }
        return Promise.resolve({ data: null, error: null })
      }

      if (munFilter) {
        const rows = dbAssignments
          .filter((a) => a.municipality_id === munFilter.val)
          .filter((a) => (activaFilter ? a.activa === activaFilter.val : true))
          .map(joinedAssignment)
        return Promise.resolve({ data: rows, error: null })
      }
    }

    if (table === 'categories') {
      if (orderBy && orderBy.col === 'orden') {
        const desc = orderBy.asc === false
        const sorted = [...dbCategories].sort((a, b) =>
          desc ? b.orden - a.orden : a.orden - b.orden,
        )
        return Promise.resolve({ data: sorted, error: null })
      }
      return Promise.resolve({ data: dbCategories, error: null })
    }

    return Promise.resolve({ data: [], error: null })
  }

  return make()
}

jest.mock('@/lib/supabase/server', () => ({
  createAdminClient: jest.fn(() => adminSupabase()),
}))

// ────────────────────────────────────────────────────────────────────────────
// 4. Mocks de auth, rate-limit y tenant cache
// ────────────────────────────────────────────────────────────────────────────

jest.mock('@/lib/admin/auth', () => ({
  verifyAdminAccess: jest.fn(async () => ({
    id: 'admin-test',
    email: 'admin@test',
    nombre: 'Admin',
    apellidos: 'Test',
    rol: 'superadmin',
  })),
}))

jest.mock('@/lib/admin/rate-limit', () => ({
  checkRateLimitAsync: jest.fn(async () => null),
}))

jest.mock('@/lib/tenant/cache', () => ({
  tenantCache: {
    get: jest.fn(async () => zafraTenant),
    set: jest.fn(async () => {}),
    delete: jest.fn(async () => {}),
  },
}))

// ────────────────────────────────────────────────────────────────────────────
// 5. Imports DESPUÉS de mocks (Jest los hoists)
// ────────────────────────────────────────────────────────────────────────────

import { PUT } from '@/app/api/admin/municipalities/[id]/applications/route'
import {
  MUNICIPALITY_APPS_TAG,
  getMunicipalityAppsForLanding,
} from '@/lib/tenant/municipality-apps-cache'

// ────────────────────────────────────────────────────────────────────────────
// 6. Helpers
// ────────────────────────────────────────────────────────────────────────────

function makePutRequest(body: unknown) {
  return new Request(
    `http://localhost/api/admin/municipalities/${ZAFRA_ID}/applications`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
  )
}

// ────────────────────────────────────────────────────────────────────────────
// 7. Tests
// ────────────────────────────────────────────────────────────────────────────

beforeEach(() => {
  dbAssignments.length = 0
  fakeCache.reset()
  jest.clearAllMocks()
  // Re-implementaciones estables (clearAllMocks las borra):
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const adminMod = require('@/lib/supabase/server') as {
    createAdminClient: jest.Mock
  }
  adminMod.createAdminClient.mockImplementation(() => adminSupabase())

  const tenantMod = require('@/lib/tenant/cache') as {
    tenantCache: { get: jest.Mock; set: jest.Mock; delete: jest.Mock }
  }
  tenantMod.tenantCache.get.mockResolvedValue(zafraTenant)

  const authMod = require('@/lib/admin/auth') as {
    verifyAdminAccess: jest.Mock
  }
  authMod.verifyAdminAccess.mockResolvedValue({
    id: 'admin-test',
    email: 'admin@test',
    nombre: 'Admin',
    apellidos: 'Test',
    rol: 'superadmin',
  })

  const rlMod = require('@/lib/admin/rate-limit') as {
    checkRateLimitAsync: jest.Mock
  }
  rlMod.checkRateLimitAsync.mockResolvedValue(null)
})

describe('Contrato de integración page-level: PUT admin → invalidación → datos frescos', () => {
  it('Pre-PUT (cache miss): getMunicipalityAppsForLanding devuelve []', async () => {
    const apps = await getMunicipalityAppsForLanding(ZAFRA_ID)
    expect(apps).toEqual([])
    // Primera llamada cachea; size = 1
    expect(fakeCache.entries.size).toBe(1)
  })

  it('Pre-PUT (cache hit): 2ª llamada sin tocar DB → mismo resultado cacheado', async () => {
    await getMunicipalityAppsForLanding(ZAFRA_ID) // MISS → []
    const apps2 = await getMunicipalityAppsForLanding(ZAFRA_ID) // HIT → []
    expect(apps2).toEqual([])
    expect(fakeCache.entries.size).toBe(1)
  })

  it('PUT 3 apps + revalidateTag → post-call MISS sirven las 3 apps con nombre correcto', async () => {
    // 1. Pre-call MISS
    const appsPre = await getMunicipalityAppsForLanding(ZAFRA_ID)
    expect(appsPre).toEqual([])

    // 2. PUT admin
    const response = await PUT(
      makePutRequest({
        municipality_id: ZAFRA_ID,
        application_ids: [APP_BIENESTAR_1, APP_BIENESTAR_2, APP_FAMILIA_1],
      }),
      { params: { id: ZAFRA_ID } },
    )
    expect(response.status).toBe(200)

    // 3. Endpoint llamó revalidateTag con el tag correcto
    expect(fakeCache.revalidateTagCalls).toContain(MUNICIPALITY_APPS_TAG)

    // 4. Cache purgada (size=0 antes del siguiente render)
    expect(fakeCache.entries.size).toBe(0)

    // 5. dbAssignments tiene 3 rows
    expect(dbAssignments).toHaveLength(3)
    expect(dbAssignments.map((a) => a.application_id).sort()).toEqual(
      [APP_BIENESTAR_1, APP_BIENESTAR_2, APP_FAMILIA_1].sort(),
    )

    // 6. Post-call → cache MISS de nuevo → JOIN con apps devuelve 3
    const appsPost = await getMunicipalityAppsForLanding(ZAFRA_ID)
    expect(appsPost).toHaveLength(3)
    const nombres = appsPost
      .map((a) => a.application?.nombre)
      .filter(Boolean)
      .sort()
    expect(nombres).toEqual(['Crianza positiva', 'Mindful30 Adultos', 'Mindful30 Infantil'])

    // 7. Cache repopulada
    expect(fakeCache.entries.size).toBe(1)
  })

  it('PUT con array vacío → purga assignments + revalidate + post-call devuelve []', async () => {
    // Sembramos 2 assignments directamente al estado
    dbAssignments.push(
      {
        municipality_id: ZAFRA_ID,
        application_id: APP_BIENESTAR_1,
        activa: true,
        fecha_activacion: '2025-01-01T00:00:00Z',
      },
      {
        municipality_id: ZAFRA_ID,
        application_id: APP_BIENESTAR_2,
        activa: true,
        fecha_activacion: '2025-01-01T00:00:00Z',
      },
    )
    // Pre-call → cache llena con [2 apps]
    const appsMid = await getMunicipalityAppsForLanding(ZAFRA_ID)
    expect(appsMid).toHaveLength(2)

    // PUT con array vacío
    const response = await PUT(
      makePutRequest({ municipality_id: ZAFRA_ID, application_ids: [] }),
      { params: { id: ZAFRA_ID } },
    )
    expect(response.status).toBe(200)
    expect(fakeCache.revalidateTagCalls).toContain(MUNICIPALITY_APPS_TAG)
    expect(dbAssignments).toHaveLength(0)
    expect(fakeCache.entries.size).toBe(0)

    // Post-call → []
    const appsAfterClear = await getMunicipalityAppsForLanding(ZAFRA_ID)
    expect(appsAfterClear).toEqual([])
  })
})
