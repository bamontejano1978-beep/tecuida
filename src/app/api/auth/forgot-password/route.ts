/**
 * Route Handler de recuperación de contraseña — POST /api/auth/forgot-password
 *
 * Llama a supabase.auth.resetPasswordForEmail() que envía un email
 * con un enlace mágico al usuario. Supabase maneja el envío del email
 * con la plantilla configurada en el dashboard.
 *
 * Redirige a /recuperar?sent=1 (éxito) o /recuperar?error=... (fallo).
 */

import { createServerClient } from '@supabase/ssr'
import { type NextRequest, NextResponse } from 'next/server'
import { createAuthCookiesAdapter } from '@/lib/supabase/cookies'
import { z } from 'zod'

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const forgotPasswordSchema = z.object({
  email: z.string().email('Correo electrónico inválido'),
})

// ---------------------------------------------------------------------------
// POST /api/auth/forgot-password
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  const { origin } = new URL(request.url)

  try {
    const formData = await request.formData()
    const email = formData.get('email')

    const parsed = forgotPasswordSchema.safeParse({ email })
    if (!parsed.success) {
      const msg = parsed.error.errors[0]?.message || 'Datos inválidos'
      return NextResponse.redirect(
        `${origin}/recuperar?error=${encodeURIComponent(msg)}`,
        303,
      )
    }

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: createAuthCookiesAdapter(request.cookies),
      },
    )

    // Enviar email de recuperación. Por seguridad, no revelamos si el email
    // existe o no — siempre redirigimos a ?sent=1.
    const { error } = await supabase.auth.resetPasswordForEmail(
      parsed.data.email,
      {
        redirectTo: `${origin}/auth/callback?next=/perfil`,
      },
    )

    if (error) {
      console.error('[api/auth/forgot-password] Error:', error.message)
      // No revelamos si el email existe — siempre mostramos éxito
    }

    return NextResponse.redirect(`${origin}/recuperar?sent=1`, 303)
  } catch (err) {
    console.error('[api/auth/forgot-password] Error inesperado:', err)
    return NextResponse.redirect(
      `${origin}/recuperar?error=${encodeURIComponent('Error interno. Intenta de nuevo.')}`,
      303,
    )
  }
}
