import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { verifyAdminAccess } from '@/lib/admin/auth'
import { checkRateLimitAsync } from '@/lib/admin/rate-limit'
import { getTrustedOrigin } from '@/lib/request-origin'
import { createAdminClient } from '@/lib/supabase/server'

const ManagerActionSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('invite'),
    email: z.string().trim().email().max(254),
  }),
  z.object({
    action: z.literal('resend'),
    invitation_id: z.string().uuid(),
  }),
  z.object({
    action: z.literal('cancel'),
    invitation_id: z.string().uuid(),
  }),
])

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const rateLimit = await checkRateLimitAsync(request, {
    limit: 30,
    windowMs: 60_000,
    namespace: 'admin:municipal-managers',
  })
  if (rateLimit) return rateLimit

  const adminUser = await verifyAdminAccess()
  if (adminUser instanceof NextResponse) return adminUser

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('municipal_manager_invitations')
    .select('id, email, estado, created_at, last_sent_at, accepted_at')
    .eq('municipality_id', params.id)
    .neq('estado', 'cancelada')
    .order('created_at', { ascending: false })
    .limit(200)

  if (error) {
    console.error('[municipal-managers] Error listando invitaciones:', error.message)
    return NextResponse.json({ error: 'No se pudieron cargar las invitaciones.' }, { status: 500 })
  }

  return NextResponse.json({ invitations: data || [] })
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const rateLimit = await checkRateLimitAsync(request, {
    limit: 12,
    windowMs: 60_000,
    namespace: 'admin:municipal-manager-actions',
  })
  if (rateLimit) return rateLimit

  const adminUser = await verifyAdminAccess()
  if (adminUser instanceof NextResponse) return adminUser

  const parsed = ManagerActionSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos de invitación inválidos.' }, { status: 422 })
  }

  const supabase = createAdminClient()
  const { data: municipality, error: municipalityError } = await supabase
    .from('municipalities')
    .select('id, slug, nombre_municipio')
    .eq('id', params.id)
    .eq('oculto_admin', false)
    .single()

  if (municipalityError || !municipality) {
    return NextResponse.json({ error: 'Municipio no encontrado.' }, { status: 404 })
  }

  const redirectTo = `${getTrustedOrigin(request)}/auth/accept-invite`

  if (parsed.data.action === 'invite') {
    const email = parsed.data.email.toLowerCase()
    const { data: existingProfiles, error: existingError } = await supabase
      .from('users')
      .select('id, municipality_id, rol')
      .ilike('email', email)
      .limit(1)

    if (existingError) {
      return NextResponse.json({ error: 'No se pudo comprobar el correo.' }, { status: 500 })
    }
    if (existingProfiles?.length) {
      const existing = existingProfiles[0]
      const message = existing.municipality_id === municipality.id
        ? 'Este correo ya pertenece a un usuario del municipio. Utiliza “Hacer gestor” en la lista de ciudadanos.'
        : 'Este correo ya está vinculado a otro municipio.'
      return NextResponse.json({ error: message }, { status: 409 })
    }

    const { data: pending } = await supabase
      .from('municipal_manager_invitations')
      .select('id')
      .ilike('email', email)
      .eq('estado', 'pendiente')
      .limit(1)
    if (pending?.length) {
      return NextResponse.json({ error: 'Ya existe una invitación pendiente para este correo.' }, { status: 409 })
    }

    const { data: invited, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(
      email,
      {
        redirectTo,
        data: {
          municipality_slug: municipality.slug,
          invitation_kind: 'municipal_manager',
        },
      },
    )

    if (inviteError || !invited.user) {
      console.error('[municipal-managers] Error enviando invitación:', inviteError?.message)
      return NextResponse.json(
        { error: 'No se pudo enviar la invitación. Comprueba que el correo no tenga ya una cuenta.' },
        { status: 422 },
      )
    }

    const authUserId = invited.user.id
    const { error: profileError } = await supabase.from('users').insert({
      id: authUserId,
      municipality_id: municipality.id,
      email,
      nombre: null,
      apellidos: null,
      alias: null,
      rol: 'admin_municipio',
      residency_status: 'open_registration',
      residency_method: 'municipal_manager_invite',
    })

    if (profileError) {
      await supabase.auth.admin.deleteUser(authUserId)
      console.error('[municipal-managers] Error creando perfil:', profileError.message)
      return NextResponse.json({ error: 'No se pudo crear el perfil del gestor.' }, { status: 500 })
    }

    const { data: invitation, error: invitationError } = await supabase
      .from('municipal_manager_invitations')
      .insert({
        municipality_id: municipality.id,
        email,
        auth_user_id: authUserId,
        invited_by: adminUser.id,
      })
      .select('id, email, estado, created_at, last_sent_at, accepted_at')
      .single()

    if (invitationError || !invitation) {
      await supabase.auth.admin.deleteUser(authUserId)
      console.error('[municipal-managers] Error registrando invitación:', invitationError?.message)
      return NextResponse.json({ error: 'No se pudo registrar la invitación.' }, { status: 500 })
    }

    return NextResponse.json(
      { invitation, message: `Invitación enviada a ${email}.` },
      { status: 201 },
    )
  }

  const { data: invitation, error: invitationError } = await supabase
    .from('municipal_manager_invitations')
    .select('id, email, auth_user_id, estado')
    .eq('id', parsed.data.invitation_id)
    .eq('municipality_id', municipality.id)
    .single()

  if (invitationError || !invitation) {
    return NextResponse.json({ error: 'Invitación no encontrada.' }, { status: 404 })
  }
  if (invitation.estado !== 'pendiente') {
    return NextResponse.json({ error: 'La invitación ya no está pendiente.' }, { status: 409 })
  }

  if (parsed.data.action === 'resend') {
    const { error } = await supabase.auth.resetPasswordForEmail(invitation.email, {
      redirectTo,
    })
    if (error) {
      console.error('[municipal-managers] Error reenviando acceso:', error.message)
      return NextResponse.json({ error: 'No se pudo reenviar el enlace de acceso.' }, { status: 502 })
    }

    const sentAt = new Date().toISOString()
    await supabase
      .from('municipal_manager_invitations')
      .update({ last_sent_at: sentAt })
      .eq('id', invitation.id)

    return NextResponse.json({ message: `Nuevo enlace enviado a ${invitation.email}.`, last_sent_at: sentAt })
  }

  const cancelledAt = new Date().toISOString()
  const { error: cancelError } = await supabase
    .from('municipal_manager_invitations')
    .update({ estado: 'cancelada', cancelled_at: cancelledAt })
    .eq('id', invitation.id)
    .eq('estado', 'pendiente')

  if (cancelError) {
    return NextResponse.json({ error: 'No se pudo cancelar la invitación.' }, { status: 500 })
  }

  if (invitation.auth_user_id) {
    const { error: deleteError } = await supabase.auth.admin.deleteUser(invitation.auth_user_id)
    if (deleteError) {
      await supabase
        .from('municipal_manager_invitations')
        .update({ estado: 'pendiente', cancelled_at: null })
        .eq('id', invitation.id)
      console.error('[municipal-managers] Error eliminando usuario invitado:', deleteError.message)
      return NextResponse.json({ error: 'No se pudo cancelar completamente la invitación.' }, { status: 500 })
    }
  }

  return NextResponse.json({ message: 'Invitación cancelada.' })
}
