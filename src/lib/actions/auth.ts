/**
 * Server Actions de autenticación — TE CUIDA
 *
 * - signOut: cierre de sesión (Server Action usada en sign-out-button)
 *
 * NOTA: signIn y signUp ahora viven en Route Handlers
 * (POST /api/auth/login y POST /api/auth/register) para
 * garantizar la propagación correcta de cookies de sesión.
 *
 * Requisitos: 5.1, 5.2, 11.5, 12.1, 12.2
 */

'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

// ---------------------------------------------------------------------------
// signOut — Cerrar sesión
// ---------------------------------------------------------------------------

export async function signOut(): Promise<void> {
  const supabase = createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
