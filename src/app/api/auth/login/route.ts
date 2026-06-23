/**
 * Route Handler de login — POST /api/auth/login
 *
 * Construye cookies manualmente porque signInWithPassword() NO
 * llama a setAll() en @supabase/ssr (solo exchangeCodeForSession
 * lo hace). Usa buildAuthCookies() con el formato exacto que
 * @supabase/ssr v0.3+ espera: JSON crudo, chunking con
 * encodeURIComponent/decodeURIComponent cuando excede 3180 chars.
 *
 * Redirect usa 303 See Other (fuerza GET en el navegador;
 * NextResponse.redirect() usa 307 por defecto, que preserva POST
 * y rompe la navegación a páginas que esperan GET).
 */

import { createServerClient } from '@supabase/ssr'
import { type NextRequest, NextResponse } from 'next/server'
import { createAuthCookiesAdapter } from '@/lib/supabase/cookies'
import { buildAuthCookies } from '@/lib/supabase/auth-cookies'
import { z } from 'zod'

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const loginSchema = z.object({
  email: z.string().email('Correo electrónico inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
})

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getValidRedirect(raw: string | null): string {
  if (!raw || !raw.startsWith('/') || raw.includes('//') || raw.includes('\\\\') || raw.length > 500) {
    return '/dashboard'
  }
  return raw
}

// ---------------------------------------------------------------------------
// POST /api/auth/login
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  const { origin } = new URL(request.url)

  try {
    // 1. Parsear form data
    const formData = await request.formData()
    const email = formData.get('email')
    const password = formData.get('password')
    const rawRedirect = formData.get('redirect')

    const parsed = loginSchema.safeParse({ email, password })
    if (!parsed.success) {
      const msg = parsed.error.errors[0]?.message || 'Datos inválidos'
      return NextResponse.redirect(
        `${origin}/login?error=${encodeURIComponent(msg)}`,
        303,
      )
    }

    // 2. Cliente Supabase (solo para autenticar; las cookies las
    //    construimos manualmente con buildAuthCookies).
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: createAuthCookiesAdapter(request.cookies),
      },
    )

    // 3. Autenticar
    const {
      data: signInData,
      error: authError,
    } = await supabase.auth.signInWithPassword({
      email: parsed.data.email,
      password: parsed.data.password,
    })

    if (authError) {
      if (authError.message.includes('Invalid login credentials')) {
        return NextResponse.redirect(
          `${origin}/login?error=${encodeURIComponent('Correo o contraseña incorrectos')}`,
          303,
        )
      }
      if (authError.message.includes('Email not confirmed')) {
        return NextResponse.redirect(
          `${origin}/login?error=${encodeURIComponent('Debes confirmar tu correo electrónico')}&emailNotConfirmed=1`,
          303,
        )
      }
      return NextResponse.redirect(
        `${origin}/login?error=${encodeURIComponent(authError.message)}`,
        303,
      )
    }

    if (!signInData.session) {
      return NextResponse.redirect(
        `${origin}/login?error=${encodeURIComponent('No se pudo crear la sesión')}`,
        303,
      )
    }

    // 4. Construir cookies de sesión con el formato exacto
    //    que @supabase/ssr v0.3+ espera: JSON crudo (no base64).
    //    Las ponemos en un response intermedio y luego las copiamos
    //    al finalResponse (mismo patrón probado de /auth/callback).
    const authCookies = buildAuthCookies(signInData.session)

    const intermediateResponse = NextResponse.redirect(
      `${origin}/login?error=placeholder`,
      303,
    )
    authCookies.forEach(({ name, value, options }) => {
      intermediateResponse.cookies.set(name, value, options)
    })

    // 5. Redirigir con cookies copiadas del intermedio
    const redirectTo = getValidRedirect(
      typeof rawRedirect === 'string' ? rawRedirect : null,
    )
    const finalResponse = NextResponse.redirect(`${origin}${redirectTo}`, 303)

    intermediateResponse.cookies.getAll().forEach((cookie) => {
      finalResponse.cookies.set(cookie.name, cookie.value, cookie)
    })

    return finalResponse
  } catch (err) {
    console.error('[api/auth/login] Error inesperado:', err)
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent('Error interno. Intenta de nuevo.')}`,
      303,
    )
  }
}
