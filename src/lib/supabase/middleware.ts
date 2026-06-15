/**
 * Helper de Supabase para el middleware de Next.js.
 *
 * Gestiona el refresco automático de la sesión del ciudadano en cada petición
 * antes de que el middleware principal resuelva el tenant o proteja rutas.
 *
 * Por qué es necesario:
 *  - Los Server Components no pueden escribir cookies directamente.
 *  - El middleware de Next.js es el único lugar donde se pueden leer Y escribir
 *    cookies en el mismo ciclo de request/response.
 *  - Debe invocarse ANTES de cualquier operación que dependa de la sesión del usuario.
 *
 * Uso en `middleware.ts` de Next.js:
 * ```ts
 * import { updateSession } from '@/lib/supabase/middleware'
 *
 * export async function middleware(request: NextRequest) {
 *   const { response, user } = await updateSession(request)
 *   // response: NextResponse con cookies de sesión actualizadas
 *   // user: User | null — reutilizable para checks de autenticación
 *   return response
 * }
 * ```
 *
 * Requisitos: 5.1, 5.2, 5.3
 */

import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { User } from '@supabase/supabase-js'

/**
 * Actualiza la sesión del ciudadano en las cookies de la respuesta.
 *
 * Si el access token está próximo a expirar, Supabase lo renueva automáticamente
 * usando el refresh token y escribe las nuevas cookies en la respuesta.
 *
 * @param request - La petición entrante de Next.js
 * @returns Un objeto con `response` (NextResponse con cookies actualizadas) y `user` (User | null)
 */
export async function updateSession(
  request: NextRequest,
): Promise<{ response: NextResponse; user: User | null }> {
  // Comenzar con una respuesta que pasa la petición sin modificar.
  // Se irán añadiendo cookies de sesión si es necesario.
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(
          cookiesToSet: { name: string; value: string; options: Record<string, unknown> }[],
        ) {
          // 1. Escribir en el objeto request para que los Server Components
          //    del mismo ciclo puedan leer las cookies actualizadas.
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )

          // 2. Recrear el NextResponse con las cookies actualizadas del request.
          supabaseResponse = NextResponse.next({
            request,
          })

          // 3. Escribir en el objeto response para que el navegador
          //    reciba y persista las nuevas cookies.
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANTE: Llamar a `getUser()` refresca el token si es necesario.
  // Ahora devolvemos el usuario para que el caller no tenga que llamar
  // a getUser() de nuevo.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return { response: supabaseResponse, user }
}
