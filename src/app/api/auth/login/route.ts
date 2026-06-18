/**
 * API Route Handler — POST /api/auth/login
 *
 * Endpoint de login que reemplaza la Server Action signIn().
 *
 * Usa el mismo patrón que el auth callback (GET /auth/callback):
 *   - Cliente Supabase con adapter de cookies + writeThrough
 *   - Las cookies de sesión se propagan manualmente a la respuesta
 *     de redirect, garantizando que lleguen al navegador.
 *
 * Por qué: redirect() en Server Actions de Next.js 14.2.35 no siempre
 * incluye los Set-Cookie headers generados por cookies().set(), causando
 * que el middleware no encuentre la sesión tras el redirect.
 */

import { createServerClient } from '@supabase/ssr'
import { type NextRequest, NextResponse } from 'next/server'
import { createAuthCookiesAdapter } from '@/lib/supabase/cookies'
import { z } from 'zod'

const signInSchema = z.object({
  email: z.string().email('Correo electrónico inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
})

function getValidRedirect(raw: string | null): string {
  if (!raw || !raw.startsWith('/') || raw.includes('//') || raw.includes('\\\\') || raw.length > 500) {
    return '/dashboard'
  }
  return raw
}

export async function POST(request: NextRequest) {
  const origin = request.nextUrl.origin

  try {
    const formData = await request.formData()
    const email = formData.get('email')
    const password = formData.get('password')
    const redirectParam = formData.get('redirect')

    const parsed = signInSchema.safeParse({ email, password })

    if (!parsed.success) {
      const msg = parsed.error.errors[0]?.message || 'Datos inválidos'
      return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(msg)}`)
    }

    // 1. Crear respuesta mutable para que setAll pueda escribir cookies
    const response = NextResponse.redirect(`${origin}/login?error=unknown`)

    // 2. Cliente Supabase con adapter de cookies + writeThrough
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: createAuthCookiesAdapter(request.cookies, {
          writeThrough: [response.cookies],
        }),
      },
    )

    // 3. Iniciar sesión
    const { error } = await supabase.auth.signInWithPassword({
      email: parsed.data.email,
      password: parsed.data.password,
    })

    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent('Correo o contraseña incorrectos')}`)
      }
      if (error.message.includes('Email not confirmed')) {
        return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent('Debes confirmar tu correo electrónico antes de iniciar sesión')}&emailNotConfirmed=1`)
      }
      return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error.message)}`)
    }

    // 4. Éxito — redirigir preservando cookies de sesión
    const redirectTo = getValidRedirect(redirectParam as string | null)
    const finalResponse = NextResponse.redirect(`${origin}${redirectTo}`)

    // Propagar manualmente las cookies de sesión al response de redirect
    response.cookies.getAll().forEach((cookie) => {
      finalResponse.cookies.set(cookie.name, cookie.value, cookie)
    })

    return finalResponse
  } catch (err) {
    console.error('[POST /api/auth/login] Unexpected:', err)
    const msg = err instanceof Error ? err.message : 'Error inesperado'
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(msg)}`)
  }
}
