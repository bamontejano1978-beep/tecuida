/**
 * POST /api/auth/signout — Cierre de sesión.
 *
 * Mismo patrón que /api/auth/login y /api/auth/register: Route Handler
 * (no Server Action) que usa 303 redirect con cookies explícitas.
 *
 *   - Llama `supabase.auth.signOut()` que vacía la sesión.
 *   - El adapter `setAll` recibe cookies con values vacíos y Max-Age=0
 *     (o expires en el pasado) → el browser las borra al recibirlas.
 *   - 303 redirect a /login — el browser navega con cookies ya limpias.
 *
 * Elimina la dependencia del Server Action `signOut()` en
 * src/lib/actions/auth.ts que usaba `redirect()` native dentro de
 * un `<form action={signOut}>` — eso es lo que producía el
 * `failed to forward action response [TypeError: fetch failed]`
 * en producción.
 *
 * Requisitos: 5.2
 */

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse, type NextRequest } from 'next/server'
import { createAuthCookiesAdapter } from '@/lib/supabase/cookies'

// ---------------------------------------------------------------------------
// POST handler
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest): Promise<Response> {
  const cookieStore = cookies()

  // Pre-crear el response redirect a /login. Necesario para que el
  // helper pueda replicar las cookies de borrado (Supabase pone
  // value='' + Max-Age=0 / expires en el pasado) al response.cookies —
  // el browser las borrará al recibirlas.
  const response = NextResponse.redirect(new URL('/login', request.url), { status: 303 })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: createAuthCookiesAdapter(cookieStore, {
        writeThrough: [response.cookies],
      }),
    },
  )

  // signOut() borra internamente la sesión.
  // Si no había sesión, devuelve error pero no bloqueamos al usuario.
  await supabase.auth.signOut()

  return response
}
