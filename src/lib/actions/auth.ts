/**
 * Server Actions de autenticación — TE CUIDA
 *
 * Solo contiene signOut (cierre de sesión), que sigue siendo
 * un Server Action porque no necesita establecer cookies nuevas
 * (solo limpiarlas).
 *
 * Login y registro migraron a Route Handlers (/api/auth/login,
 * /api/auth/register) para control total sobre la propagación
 * de cookies de sesión (mismo patrón probado de /auth/callback).
 *
 * Requisitos: 5.1, 5.2
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
