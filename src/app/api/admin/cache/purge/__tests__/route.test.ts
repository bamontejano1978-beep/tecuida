/**
 * @jest-environment node
 *
 * Contrato de invalidación — `POST /api/admin/cache/purge`.
 *
 * Endpoint que dispara `revalidateTag(MUNICIPALITY_APPS_TAG)` +
 * `revalidatePath('/')` desde el panel admin para limpiar el Data Cache
 * de Vercel sin necesidad de abrir terminal ni Vercel CLI.
 *
 * Lo que este test verifica:
 *   • Tras un POST con sesión admin válida se llama
 *     revalidateTag(MUNICIPALITY_APPS_TAG) y revalidatePath('/') en ese orden.
 *   • La respuesta 200 incluye los detalles de qué se invalidó + actor + timestamp.
 *   • Si verifyAdminAccess falla (sin sesión) NO se ejecuta la invalidación.
 *   • Si el rate limit se dispara NO se ejecuta la invalidación.
 *   • Errores inesperados devuelven 500 sin tocar cache.
 *
 * Por qué este test importa:
 *   • Cierra el eslabón DX: el panel admin puede pedir la purga sin
 *     requerir acceso al Vercel CLI ni deployar un redeploy.
 *   • Garantiza que el contrato de invalidación del cache helper
 *     (`src/lib/tenant/municipality-apps-cache.ts`) tiene una vía
 *     alternativa al flujo de mutaciones admin por endpoint.
 */

jest.mock('next/cache', () => {
  // Pasamos la implementación real para preservar APIs como `unstable_cache`
  // que los helpers @/lib/tenant/* importan, y reemplazamos SOLO las que
  // queremos espiar.
  const actual = jest.requireActual('next/cache')
  return {
    ...actual,
    revalidateTag: jest.fn(),
    revalidatePath: jest.fn(),
  }
})

jest.mock('@/lib/admin/auth', () => ({
  verifyAdminAccess: jest.fn(),
}))
jest.mock('@/lib/admin/rate-limit', () => ({
  checkRateLimitAsync: jest.fn(),
}))

import { NextResponse } from 'next/server'
import { POST } from '../route'
import { MUNICIPALITY_APPS_TAG } from '@/lib/tenant/municipality-apps-cache'

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

function makePostRequest(url: string = 'http://localhost/api/admin/cache/purge') {
  return new Request(url, {
    method: 'POST',
  })
}

beforeEach(() => {
  jest.clearAllMocks()
  setupAuth()
})

describe('POST /api/admin/cache/purge — invalidación manual desde el panel admin', () => {
  it('llama revalidateTag(MUNICIPALITY_APPS_TAG) + revalidatePath("/") tras éxito', async () => {
    const response = await POST(makePostRequest())

    expect(response).toBeInstanceOf(NextResponse)
    expect(response.status).toBe(200)

    expect(cacheMock.revalidateTag).toHaveBeenCalledTimes(1)
    expect(cacheMock.revalidateTag).toHaveBeenCalledWith(MUNICIPALITY_APPS_TAG)

    expect(cacheMock.revalidatePath).toHaveBeenCalledTimes(1)
    expect(cacheMock.revalidatePath).toHaveBeenCalledWith('/')

    const body = await response.json()
    expect(body.message).toMatch(/purgado correctamente/i)
    expect(body.invalidated).toEqual({
      tag: MUNICIPALITY_APPS_TAG,
      path: '/',
    })
    // El actor NO se devuelve en el response (evitamos exponer admin id/email a
    // través de response-logging externo); se emite a logs server-side via
    // console.info en el handler — ese aspecto lo cubre la suite E2E/browser.
    expect(body.actor).toBeUndefined()
    expect(body.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  })

  it('llama revalidateTag antes que revalidatePath (tag purga antes, path es red de seguridad)', async () => {
    await POST(makePostRequest())

    const tagOrder = cacheMock.revalidateTag.mock.invocationCallOrder[0]
    const pathOrder = cacheMock.revalidatePath.mock.invocationCallOrder[0]
    expect(tagOrder).toBeLessThan(pathOrder)
  })

  it('NO llama revalidate cuando el rate limit se dispara (429)', async () => {
    ;(checkRateLimitAsync as jest.Mock).mockReturnValueOnce(
      NextResponse.json({ error: 'rate limited' }, { status: 429 }),
    )

    const response = await POST(makePostRequest())

    expect(response.status).toBe(429)
    expect(cacheMock.revalidateTag).not.toHaveBeenCalled()
    expect(cacheMock.revalidatePath).not.toHaveBeenCalled()
  })

  it('NO llama revalidate cuando verifyAdminAccess falla (401)', async () => {
    ;(verifyAdminAccess as jest.Mock).mockReturnValueOnce(
      NextResponse.json({ error: 'No autorizado' }, { status: 401 }),
    )

    const response = await POST(makePostRequest())

    expect(response.status).toBe(401)
    expect(cacheMock.revalidateTag).not.toHaveBeenCalled()
    expect(cacheMock.revalidatePath).not.toHaveBeenCalled()
  })

  it('devuelve 401 sin tocar cache cuando verifyAdminAccess devuelve un usuario nulo/falsy', async () => {
    // Belt-and-suspenders: si verifyAdminAccess cambiara su contrato y
    // devolviera null/undefined o cualquier valor no-objeto (no envuelto en
    // NextResponse), el handler debe cortar con 401 EXPLÍCITO en lugar de
    // propagar un NRE al acceder a adminUser.id/email.
    ;(verifyAdminAccess as jest.Mock).mockResolvedValueOnce(null)

    const response = await POST(makePostRequest())

    expect(response.status).toBe(401)
    const body = await response.json()
    expect(body.error).toMatch(/no autorizado/i)
    // Ninguna invalidación ejecutada — la BD no cambió, no hay nada que purgar.
    expect(cacheMock.revalidateTag).not.toHaveBeenCalled()
    expect(cacheMock.revalidatePath).not.toHaveBeenCalled()
  })

  it('devuelve 401 sin tocar cache cuando verifyAdminAccess devuelve un string (tipo no-objeto)', async () => {
    // Mismo guard, distinto input patológico. Aunque verifyAdminAccess no
    // debería devolver un string, este test blinda contra cualquier rama
    // exótica del contrato (e.g., futuros retornos de un wrapper que
    // olvidó envolver el error en NextResponse).
    ;(verifyAdminAccess as jest.Mock).mockResolvedValueOnce('not-an-object')

    const response = await POST(makePostRequest())

    expect(response.status).toBe(401)
    expect(cacheMock.revalidateTag).not.toHaveBeenCalled()
    expect(cacheMock.revalidatePath).not.toHaveBeenCalled()
  })

  it('devuelve 500 cuando una excepción inesperada ocurre durante la invalidación', async () => {
    // Forzamos un error dentro de revalidateTag para verificar que el
    // try/catch del handler responde con 500 sin propagar al cliente.
    ;(cacheMock.revalidateTag as jest.Mock).mockImplementationOnce(() => {
      throw new Error('boom')
    })

    const response = await POST(makePostRequest())

    expect(response.status).toBe(500)
    const body = await response.json()
    expect(body.error).toBe('Error interno del servidor')
    // revalidatePath NUNCA se invoca (tag lanzó antes)
    expect(cacheMock.revalidatePath).not.toHaveBeenCalled()
  })

  it('es idempotente: 2 llamadas consecutivas producen 2 invalidaciones sin error', async () => {
    const r1 = await POST(makePostRequest())
    const r2 = await POST(makePostRequest())

    expect(r1.status).toBe(200)
    expect(r2.status).toBe(200)
    expect(cacheMock.revalidateTag).toHaveBeenCalledTimes(2)
    expect(cacheMock.revalidateTag).toHaveBeenNthCalledWith(1, MUNICIPALITY_APPS_TAG)
    expect(cacheMock.revalidateTag).toHaveBeenNthCalledWith(2, MUNICIPALITY_APPS_TAG)
    expect(cacheMock.revalidatePath).toHaveBeenCalledTimes(2)
  })

  // ─────────────────────────────────────────────────────────────────────────
  // ?slug=X — Variante per-tenant (USADA POR TenantDiagnosticPanel)
  // ─────────────────────────────────────────────────────────────────────────
  //
  // Por qué: el panel admin necesita invalidar cache desde una sola pantalla
  // sin tener que abrir terminal ni Vercel CLI. El param ?slug=X es puramente
  // informativo en el audit log (el tag purga TODOS los tenants de un
  // golpe); el response shape sí lo refleja para que el panel pueda mostrar
  // feedback correcto.
  //
  // Verifica:
  //   • 200 + invalidated.slug = X
  //   • message cambia según presencia del slug
  //   • 400 sin tocar cache si el slug no pasa el regex kebab-case
  //   • audit log server-side discrimina byTenant=true slug=X

  describe('?slug=X (per-tenant scope)', () => {
    it('acepta slug válido y devuelve response con invalidated.slug=X', async () => {
      const consoleInfoSpy = jest.spyOn(console, 'info').mockImplementation()

      const response = await POST(
        makePostRequest('http://localhost/api/admin/cache/purge?slug=zafra'),
      )

      expect(response.status).toBe(200)
      // Tag purga TODOS los tenants independientemente del slug (es global).
      expect(cacheMock.revalidateTag).toHaveBeenCalledWith(MUNICIPALITY_APPS_TAG)
      // revalidatePath safety net mantiene comportamiento global.
      expect(cacheMock.revalidatePath).toHaveBeenCalledWith('/')

      const body = await response.json()
      expect(body.message).toMatch(/invalidado para el tenant "zafra"/i)
      expect(body.invalidated).toEqual({
        tag: MUNICIPALITY_APPS_TAG,
        path: '/',
        slug: 'zafra',
      })

      // Audit log emite discriminante byTenant=true slug=zafra en una sola línea.
      expect(consoleInfoSpy).toHaveBeenCalledTimes(1)
      const logged = String(consoleInfoSpy.mock.calls[0][0])
      expect(logged).toMatch(/byTenant=true/)
      expect(logged).toMatch(/slug=zafra/)

      consoleInfoSpy.mockRestore()
    })

    it('mantiene compat hacia atrás: invocar sin query param omite `slug` del response', async () => {
      const response = await POST(makePostRequest())

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.message).toMatch(/purgado correctamente/i)
      expect(body.invalidated).toEqual({
        tag: MUNICIPALITY_APPS_TAG,
        path: '/',
      })
      expect(body.invalidated.slug).toBeUndefined()
    })

    it.each([
      ['uppercase', 'ZAFRA'],
      ['caracteres especiales', 'a@b'],
      ['path traversal', '..'],
      ['vacío', ''],
      ['url-encoded inválido (slash)', 'a%2Fb'],
      ['demasiado largo (101 chars)', 'a' + 'b'.repeat(99) + 'c'],
    ])('rechaza slug inválido "%s" → 400 sin tocar cache', async (_label, badSlug) => {
      const response = await POST(
        makePostRequest(
          `http://localhost/api/admin/cache/purge?slug=${badSlug}`,
        ),
      )

      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.error).toMatch(/slug inválido/i)

      // Ninguna invalidación ejecutada — la BD no cambió, no hay nada que purgar.
      expect(cacheMock.revalidateTag).not.toHaveBeenCalled()
      expect(cacheMock.revalidatePath).not.toHaveBeenCalled()
    })

    it('401 sin tocar cache gana precedencia sobre validación de slug', async () => {
      // Si no hay sesión admin, NO deberíamos llegar a la validación de slug;
      // el rate limit / verif guard cortan antes. Esto lockea el orden.
      ;(verifyAdminAccess as jest.Mock).mockResolvedValueOnce(
        NextResponse.json({ error: 'No autorizado' }, { status: 401 }),
      )

      const response = await POST(
        makePostRequest('http://localhost/api/admin/cache/purge?slug=zafra'),
      )

      expect(response.status).toBe(401)
      expect(cacheMock.revalidateTag).not.toHaveBeenCalled()
      expect(cacheMock.revalidatePath).not.toHaveBeenCalled()
    })

    it('429 rate limit gana precedencia sobre validación de slug', async () => {
      ;(checkRateLimitAsync as jest.Mock).mockReturnValueOnce(
        NextResponse.json({ error: 'rate limited' }, { status: 429 }),
      )

      const response = await POST(
        makePostRequest('http://localhost/api/admin/cache/purge?slug=zafra'),
      )

      expect(response.status).toBe(429)
      expect(cacheMock.revalidateTag).not.toHaveBeenCalled()
      expect(cacheMock.revalidatePath).not.toHaveBeenCalled()
    })
  })
})
