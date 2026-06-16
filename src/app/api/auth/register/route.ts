/**
 * POST /api/auth/register — Registro de nuevo ciudadano en el tenant actual.
 *
 * Mismo patrón que /api/auth/login: Route Handler (no Server Action)
 * para evitar el bug de cookies perdidas con `useFormState` + `redirect()`.
 *
 *   - Success path: 303 redirect + `response.cookies.set()` con las cookies
 *     que Supabase escriba para la nueva sesión.
 *   - Auto-confirmado por Supabase: redirect a `/dashboard`.
 *   - Requiere confirmation de email: redirect a `/register/confirmation`.
 *   - Errors: JSON 400/422 con field `error` que el cliente parsea.
 *
 * Requisitos: 11.5, 12.1, 12.2
 */

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'

import { createAuthCookiesAdapter } from '@/lib/supabase/cookies'

// ---------------------------------------------------------------------------
// Validación
// ---------------------------------------------------------------------------

const registerSchema = z.object({
  email: z.string().email('Correo electrónico inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  nombre: z.string().min(1, 'El nombre es obligatorio'),
  apellidos: z.string().min(1, 'Los apellidos son obligatorios'),
  telefono: z.string().optional(),
  fecha_nacimiento: z.string().optional(),
})

// ---------------------------------------------------------------------------
// POST handler
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest): Promise<Response> {
  // 1. Parse + validate payload
  let payload: z.infer<typeof registerSchema>
  try {
    const json = (await request.json()) as unknown
    payload = registerSchema.parse(json)
  } catch {
    return NextResponse.json(
      { success: false, error: 'Datos inválidos' },
      { status: 422 },
    )
  }

  // 2. Tenant slug de los headers del middleware (sigue siendo necesario
  //    para construir el emailRedirectTo y los metadata del signUp)
  const tenantSlug = request.headers.get('x-tenant-slug')

  // 3. Cookie store + pre-crear el response redirect.
  //    El response se construye AQUÍ (Location placeholder) para que
  //    el helper pueda escribir cookies de sesión directamente al
  //    response vía `writeThrough`. Location se muta al target real
  //    en el paso 7 una vez conocemos si el usuario está auto-confirmado.
  const cookieStore = cookies()
  const response = NextResponse.redirect(
    new URL('/register/confirmation', request.url),
    { status: 303 },
  )

  // 4. Cliente Supabase con adapter compartido. Las escrituras van
  //    al cookieStore (mantiene coherencia con el flujo SSR) Y al
  //    response.cookies (para que viajen al navegador con el redirect).
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: createAuthCookiesAdapter(cookieStore, {
        writeThrough: [response.cookies],
      }),
    },
  )

  // 5. Construcción del callback URL (PKCE)
  const host = request.headers.get('host') || 'localhost:3000'
  const protocol = host.startsWith('localhost') ? 'http' : 'https'
  const emailRedirectTo = `${protocol}://${host}/auth/callback`

  // 6. signUp
  const { error } = await supabase.auth.signUp({
    email: payload.email,
    password: payload.password,
    options: {
      emailRedirectTo,
      data: {
        municipality_slug: tenantSlug,
        nombre: payload.nombre,
        apellidos: payload.apellidos,
        telefono: payload.telefono || null,
        fecha_nacimiento: payload.fecha_nacimiento || null,
      },
    },
  })

  if (error) {
    if (error.message.includes('already registered')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Ya existe una cuenta con este correo electrónico',
        },
        { status: 409 },
      )
    }
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 400 },
    )
  }

  // 7. ¿Está el usuario ya autenticado (auto-confirm) o necesita verificación?
  //    Envuelto en try/catch: si getUser() lanza después de haber
  //    pre-creado el response redirect (paso 3), devolvemos JSON 500
  //    en lugar de enviar un redirect 303 con Location placeholder.
  let user: { aud: string } | null = null
  try {
    const { data } = await supabase.auth.getUser()
    user = data.user
  } catch (err) {
    console.error(
      '[register-handler] Error inesperado al obtener usuario tras signUp:',
      err,
    )
    return NextResponse.json(
      { success: false, error: 'session_error' },
      { status: 500 },
    )
  }

  const targetPath = user?.aud === 'authenticated'
    ? '/dashboard'
    : '/register/confirmation'
  // Preservar el tenant en el redirect: si el server lee `x-tenant-slug`
  // header (inyectado por middleware), lo añadimos como query string
  // para que la siguiente request a /dashboard mantenga el contexto.
  const targetSearch = tenantSlug
    ? (targetPath.includes('?') ? '&' : '?') + 'tenant=' + encodeURIComponent(tenantSlug)
    : ''
  const targetUrl = new URL(`${targetPath}${targetSearch}`, request.url)

  // 8. Mutamos el `Location` del response pre-creado en paso 3.
  //    Las cookies de sesión ya están aplicadas vía `writeThrough`
  //    del helper (paso 4), no necesitamos captura manual.
  response.headers.set('Location', targetUrl.toString())

  return response
}
