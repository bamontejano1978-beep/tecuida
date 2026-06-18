/**
 * Admin Auth Helper — Verificación de acceso al panel superadmin
 *
 * Flujo:
 *   1. Obtiene el usuario autenticado de la sesión actual
 *   2. Consulta public.users para verificar que rol === 'superadmin'
 *   3. Si no está autorizado, devuelve un NextResponse con 401/403
 *
 * Uso en API Routes:
 * ```ts
 * const adminUser = await verifyAdminAccess()
 * if (adminUser instanceof NextResponse) return adminUser
 * // adminUser está autorizado — continuar con la lógica
 * ```
 *
 * Requisitos: 10.5, 13.4
 */

import { createAdminClient, createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export interface AdminUser {
  id: string
  email: string
  nombre: string
  apellidos: string
  rol: 'superadmin'
}

/**
 * Verifica que el usuario autenticado actual tiene rol de superadmin.
 *
 * @returns El AdminUser autorizado, o un NextResponse de error (401/403).
 */
export async function verifyAdminAccess(): Promise<AdminUser | NextResponse> {
  const supabase = createClient()

  // 1. Verificar que hay sesión activa
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json(
      { error: 'No autorizado. Inicia sesión para acceder.' },
      { status: 401 },
    )
  }

  // 2. Verificar rol en public.users
  //    Usamos createAdminClient() (service_role_key) para bypasear RLS.
  //    La política RLS de public.users usa una subconsulta autorreferente
  //    que causa un deadlock si el usuario aún no tiene fila en la tabla.
  const adminClient = createAdminClient()
  const { data: userRow, error: dbError } = await adminClient
    .from('users')
    .select('id, email, nombre, apellidos, rol')
    .eq('id', user.id)
    .single()

  if (dbError || !userRow) {
    return NextResponse.json(
      { error: 'Perfil de usuario no encontrado.' },
      { status: 403 },
    )
  }

  if (userRow.rol !== 'superadmin') {
    return NextResponse.json(
      { error: 'Acceso denegado. Se requiere rol de superadministrador.' },
      { status: 403 },
    )
  }

  return {
    id: userRow.id as string,
    email: userRow.email as string,
    nombre: userRow.nombre as string,
    apellidos: userRow.apellidos as string,
    rol: 'superadmin',
  }
}
