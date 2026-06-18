/**
 * POST /api/auth/login — Inicio de sesión con email/password.
 *
 * Enfoque 1 — Client-side cookie write (bypass bug Vercel edge):
 *   - En lugar de emitir Set-Cookie en el response (que la edge layer
 *     de Vercel/Next strip'a como hemos visto en 5+ iteraciones previas),
 *     devolvemos la sesión completa en JSON: `{ success, projectRef,
 *     session: { access_token, refresh_token, expires_in, … } }`.
 *   - El cliente (/login) construye `sb-<projectRef>-auth-token`
 *     codificando el session como base64url y la escribe via
 *     document.cookie. Esto bypassea completamente la edge layer.
 *
 * Errores: JSON 400/401 con `error` field — cliente parsea y muestra.
 *
 * Requisitos: 5.1
 */

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'

import { createAuthCookiesAdapter } from '@/lib/supabase/cookies'

// ---------------------------------------------------------------------------
// Validación
// ---------------------------------------------------------------------------

const loginSchema = z.object({
  email: z.string().email('Correo electrónico inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  redirect: z.string().optional(),
})

/**
 * Whitelisting de URLs de redirección (anti open-redirect).
 */
function sanitizeRedirectPath(raw: string | undefined): string {
  if (!raw) return '/dashboard'
  if (!raw.startsWith('/')) return '/dashboard'
  if (raw.includes('//')) return '/dashboard'
  if (raw.includes('\\')) return '/dashboard'
  if (raw.length > 500) return '/dashboard'
  return raw
}

// ---------------------------------------------------------------------------
// POST handler
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest): Promise<Response> {
  // 1. Validar payload
  let payload: z.infer<typeof loginSchema>
  try {
    const json = (await request.json()) as unknown
    payload = loginSchema.parse(json)
  } catch {
    return NextResponse.json(
      { success: false, error: 'Datos inválidos' },
      { status: 400 },
    )
  }

  const redirectTo = sanitizeRedirectPath(payload.redirect)

  // 2. cookies() permite a @supabase/ssr leer sesiones existentes en la
  //    request (para detectar credenciales prefilled). No escribimos al
  //    response aquí: el cliente escribe la cookie via document.cookie
  //    tras recibir el JSON de sesión.
  const cookieStore = cookies()

  // 3. Cliente Supabase. La sesión resultante NO se envía al browser via
  //    Set-Cookie (Vercel edge la strip'aría). En su lugar, devolvemos
  //    access/refresh tokens al cliente que los escribe via
  //    document.cookie sb-<projectRef>-auth-token.
  //    El adapter escribe al cookieStore de la request para coherencia
  //    con el flujo SSR de @supabase/ssr (combineChunks + refresh);
  //    el envío real al browser lo hace el cliente (document.cookie).
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: createAuthCookiesAdapter(cookieStore),
    },
  )

  // 4. Login
  const { data: signInData, error } = await supabase.auth.signInWithPassword({
    email: payload.email,
    password: payload.password,
  })

  if (error) {
    if (error.message.includes('Invalid login credentials')) {
      return NextResponse.json(
        { success: false, error: 'Correo o contraseña incorrectos' },
        { status: 401 },
      )
    }
    if (error.message.includes('Email not confirmed')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Debes confirmar tu correo electrónico antes de iniciar sesión',
        },
        { status: 401 },
      )
    }
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 400 },
    )
  }

  if (!signInData?.session) {
    return NextResponse.json(
      { success: false, error: 'No se pudo iniciar sesión' },
      { status: 500 },
    )
  }

  // Extraer project ref del NEXT_PUBLIC_SUPABASE_URL para que el cliente
  // construya el nombre de cookie correcto (`sb-<ref>-auth-token`).
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  // Formato esperado: https://<project-ref>.supabase.co
  const projectRefMatch = supabaseUrl.match(/\/\/([^.]+)\.supabase\.co/)
  const projectRef = projectRefMatch?.[1]
  if (!projectRef) {
    // Env var mal configurada — fail loudly y log server-side para que
    // el equipo se entere en producción sin esperar reportes de usuario.
    console.error(
      '[login-route] projectRef extraction failed; NEXT_PUBLIC_SUPABASE_URL=',
      supabaseUrl,
    )
    return NextResponse.json(
      { success: false, error: 'Configuración del servidor inválida' },
      { status: 500 },
    )
  }

  // IMPORTANTE: devolvemos `safeSession` íntegro (con `user` completo:
  // aud, role, app_metadata, user_metadata, etc.). Si el `user` está
  // incompleto, la validación de auth.getSession() / auth.getUser() del
  // cliente falla porque requiere el shape completo del User para
  // reconocer la sesión como válida.
  // Spread (en vez de explicit field listing) asegura que nuevos campos
  // que Supabase añada en el futuro se propaguen automáticamente sin
  // drop silencioso. Excluimos solo provider_token + provider_refresh_token
  // por seguridad (son OAuth tokens sensibles).
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { provider_token: _pt, provider_refresh_token: _prt, ...safeSession } =
    signInData.session

  return NextResponse.json({
    success: true,
    redirectTo,
    projectRef,
    session: safeSession,
  })
}
