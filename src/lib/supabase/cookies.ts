/**
 * Helpers para propagación de cookies de Supabase en Route Handlers.
 *
 * `pickSupportedCookieOptions` filtra el subset de options que
 * `NextResponse.cookies.set` acepta, descartando atributos exóticos
 * (priority, partitioned, etc.) que algunas versiones de
 * @supabase/ssr incluyen en `setAll` y que Next.js 14 + Vercel
 * no propagan al wire HTTP correctamente.
 *
 * Maneja expires tanto como:
 *   - `number` (Unix seconds)
 *   - `Date` (instancia)
 *   - `string` ISO date (restauración defensiva)
 *
 * Antes vivía inline en cada route handler (login/register). Al extraerlo
 * aquí evitamos drift entre handlers si Next.js o @supabase/ssr añaden
 * nuevas opciones soportadas.
 */

export type SupabaseCookieOptions = Record<string, unknown>

/**
 * Devuelve un objeto con solo los campos soportados por
 * NextResponse.cookies.set, normalizando `expires` a Date.
 */
export function pickSupportedCookieOptions(
  options: SupabaseCookieOptions,
): {
  path?: string
  domain?: string
  maxAge?: number
  expires?: Date
  httpOnly?: boolean
  secure?: boolean
  sameSite?: 'strict' | 'lax' | 'none'
} {
  let expires: Date | undefined
  if (typeof options.expires === 'number') {
    expires = new Date(options.expires * 1000)
  } else if (options.expires instanceof Date) {
    expires = options.expires
  } else if (
    typeof options.expires === 'string' &&
    !Number.isNaN(Date.parse(options.expires))
  ) {
    expires = new Date(options.expires)
  }

  return {
    ...(typeof options.path === 'string' && { path: options.path }),
    ...(typeof options.domain === 'string' && { domain: options.domain }),
    ...(typeof options.maxAge === 'number' && { maxAge: options.maxAge }),
    ...(expires !== undefined && { expires }),
    ...(typeof options.httpOnly === 'boolean' && { httpOnly: options.httpOnly }),
    ...(typeof options.secure === 'boolean' && { secure: options.secure }),
    ...(typeof options.sameSite === 'string' && {
      sameSite: options.sameSite as 'strict' | 'lax' | 'none',
    }),
  }
}

// ---------------------------------------------------------------------------
// Adapter compartido para createServerClient
// ---------------------------------------------------------------------------
//
// Cualquier `createServerClient(URL, KEY, { cookies })` que tengamos en el
// codebase (middleware, RSC, route handlers, OAuth callback) usa el mismo
// bloque `get(name) / getAll() / setAll(cookies)`. Antes vivia inline en
// 6 archivos, con drift latente entre handlers (algunos con try/catch,
// otros propagaban a response, otros no).
//
// Aquí centralizamos:
//   - el `get(name)` que `combineChunks` necesita para reconstruir
//     cookies chunked — `@supabase/ssr` v0.3+ lo invoca en cualquier
//     flujo que lea la sesión;
//   - el `getAll()` snapshot;
//   - el `setAll(...)` que filtra opciones no soportadas en Vercel
//     edge via `pickSupportedCookieOptions` y propaga a sinks
//     adicionales (típicamente `response.cookies` en middleware o
//     route handlers) para que las actualizaciones de sesión viajen
//     al navegador en el mismo response.
//
// Si un sink lanza (Server Component de solo lectura, etc.) lo
// omitimos silenciosamente para ese sink — los demás siguen
// recibiendo la escritura. El middleware refrescará la sesión en
// el siguiente pass.

/**
 * Tipo estructural compatible con cualquier cookie store de Next.js:
 *  - `NextRequest.cookies`
 *  - `cookies()` de `next/headers` (route handler + RSC)
 *  - `NextResponse.cookies`
 *
 * Solo declaramos los 3 métodos que necesitamos. La permissividad
 * aquí es deliberada:
 *   - `get(...)` retorna `unknown` porque Next.js tipa el retorno
 *     con `RequestCookie` / `ResponseCookie` (más campos opcionales
 *     que `{ name; value }`).
 *   - `getAll()` retorna el shape mínimo `{ name; value }`.
 *   - `set(...args: any[])` es completamente laxo porque la firma
 *     real de Next.js es un rest-tuple con DOS overloads fusionados
 *     (`[key, value]` posicional + `[options]` objeto). Imponer una
 *     forma 3-arg `(name, value, options?)` falla TS2345 en los
 *     call-sites; `...args: any[]` es la frontera tipo-lax correcta
 *     (la implementación del helper ya ignora el valor de retorno).
 */
export interface CookieStoreLike {
  get(name: string): unknown
  getAll(): Array<{ name: string; value: string }>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  set(...args: any[]): any
}

export interface CookieAdapterOptions {
  /**
   * Sinks adicionales a los que también replicar las escrituras.
   *
   * Caso de uso típico: `response.cookies` en middleware de Supabase
   * o en route handlers — para que las actualizaciones de sesión
   * viajen al navegador sin necesidad de capturar `supabaseWrites`
   * y aplicarlas manualmente al construir el NextResponse.
   *
   * Si un sink lanza (p.ej. un Server Component de solo lectura),
   * el `set` se omite silenciosamente para ESE sink — los demás
   * siguen recibiendo la escritura.
   */
  writeThrough?: ReadonlyArray<CookieStoreLike>
}

/**
 * Construye el adapter que `createServerClient(..., { cookies })`
 * de `@supabase/ssr` espera. Reemplaza los 6 bloques inline del
 * codebase. Cumple los 3 métodos que `combineChunks` / `setAll`
 * invocan:
 *
 *   - `get(name)`   devuelve `string | undefined`.
 *   - `getAll()`    snapshot de todas las cookies.
 *   - `setAll(...)` escribe en cookieStore + cada sink de
 *     `writeThrough`, filtrando opciones no soportadas por Vercel
 *     edge vía `pickSupportedCookieOptions`.
 *
 * @example
 * ```ts
 * // src/lib/supabase/middleware.ts: cookies del request + propagate a response
 * cookies: createAuthCookiesAdapter(request.cookies, {
 *   writeThrough: [supabaseResponse.cookies],
 * })
 * ```
 *
 * @example
 * ```ts
 * // RSC / Server Components — try/catch interno cubre read-only
 * cookies: createAuthCookiesAdapter(cookies())
 * ```
 */
export function createAuthCookiesAdapter(
  cookieStore: CookieStoreLike,
  options: CookieAdapterOptions = {},
) {
  const sinks: ReadonlyArray<CookieStoreLike> = [
    cookieStore,
    ...(options.writeThrough ?? []),
  ]

  return {
    get(name: string) {
      const entry = cookieStore.get(name) as
        | { name: string; value: string }
        | undefined
      return entry?.value
    },
    getAll() {
      return cookieStore.getAll()
    },
    setAll(
      cookiesToSet: Array<{
        name: string
        value: string
        options?: Record<string, unknown>
      }>,
    ) {
      try {
        for (const { name, value, options: rawOptions } of cookiesToSet) {
          const safeOptions = pickSupportedCookieOptions(rawOptions ?? {})
          for (const sink of sinks) {
            try {
              sink.set(name, value, safeOptions)
            } catch {
              // Sink individual de solo lectura (RSC, etc.) — no
              // propagamos el fallo para no romper combineChunks.
            }
          }
        }
      } catch {
        // Defensive outer: nunca dejamos escapar un throw inesperado
        // (p.ej. cookiesToSet con forma rara). combineChunks lo
        // aceptaría igual, pero preferimos blindar el adapter.
      }
    },
  }
}
