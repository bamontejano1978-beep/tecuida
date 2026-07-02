/**
 * PATCH /api/admin/municipalities/[id]/users/role
 *
 * Actualiza el rol de un usuario dentro de un municipio específico.
 * Solo el superadmin puede cambiar roles.
 *
 * Body: { userId: string, rol: 'ciudadano' | 'admin_municipio' }
 *
 * Validaciones:
 *   - El usuario debe pertenecer al municipio indicado en la URL
 *   - Solo se permite cambiar entre 'ciudadano' y 'admin_municipio'
 *   - No se puede degradar a un superadmin ni promocionar a superadmin
 */

import { createAdminClient } from '@/lib/supabase/server'
import { verifyAdminAccess } from '@/lib/admin/auth'
import { NextResponse, type NextRequest } from 'next/server'

// ---------------------------------------------------------------------------
// GET handler — Listar usuarios del municipio con su rol
// ---------------------------------------------------------------------------

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } },
): Promise<Response> {
  const adminUser = await verifyAdminAccess()
  if (adminUser instanceof NextResponse) return adminUser

  const supabase = createAdminClient()

  const { data: users, error } = await supabase
    .from('users')
    .select('id, email, alias, nombre, rol, created_at')
    .eq('municipality_id', params.id)
    .order('created_at', { ascending: false })
    .limit(500)

  if (error) {
    console.error('[users/role] Error listando usuarios:', error.message)
    return NextResponse.json(
      { error: 'Error al cargar los usuarios.' },
      { status: 500 },
    )
  }

  return NextResponse.json({ users: users || [] })
}

// ---------------------------------------------------------------------------
// PATCH handler — Cambiar rol de un usuario
// ---------------------------------------------------------------------------

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
): Promise<Response> {
  const adminUser = await verifyAdminAccess()
  if (adminUser instanceof NextResponse) return adminUser

  const municipioId = params.id

  // 1. Parsear body
  let body: { userId?: string; rol?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: 'El body debe ser JSON válido con userId y rol.' },
      { status: 400 },
    )
  }

  const { userId, rol } = body

  if (!userId || typeof userId !== 'string') {
    return NextResponse.json(
      { error: 'El campo "userId" es obligatorio.' },
      { status: 400 },
    )
  }

  if (rol !== 'ciudadano' && rol !== 'admin_municipio') {
    return NextResponse.json(
      { error: 'El rol debe ser "ciudadano" o "admin_municipio".' },
      { status: 400 },
    )
  }

  // 2. Verificar que el usuario existe y pertenece al municipio
  const supabase = createAdminClient()

  const { data: targetUser, error: userError } = await supabase
    .from('users')
    .select('id, email, rol, municipality_id')
    .eq('id', userId)
    .single()

  if (userError || !targetUser) {
    return NextResponse.json(
      { error: 'Usuario no encontrado.' },
      { status: 404 },
    )
  }

  if (targetUser.municipality_id !== municipioId) {
    return NextResponse.json(
      { error: 'El usuario no pertenece a este municipio.' },
      { status: 403 },
    )
  }

  if (targetUser.rol === 'superadmin') {
    return NextResponse.json(
      { error: 'No se puede cambiar el rol de un superadministrador.' },
      { status: 403 },
    )
  }

  // 3. Actualizar rol
  const { error: updateError } = await supabase
    .from('users')
    .update({ rol })
    .eq('id', userId)

  if (updateError) {
    console.error('[users/role] Error actualizando rol:', updateError.message)
    return NextResponse.json(
      { error: 'Error al actualizar el rol.' },
      { status: 500 },
    )
  }

  // 4. Responder
  const newRolLabel =
    rol === 'admin_municipio' ? 'Gestor municipal' : 'Ciudadano'

  return NextResponse.json(
    {
      message: `Rol actualizado a "${newRolLabel}" correctamente.`,
      userId,
      rol,
    },
    { status: 200 },
  )
}
