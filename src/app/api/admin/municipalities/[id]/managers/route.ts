import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { verifyAdminAccess } from '@/lib/admin/auth'
import { checkRateLimitAsync } from '@/lib/admin/rate-limit'
import { getTrustedOrigin } from '@/lib/request-origin'
import { createAdminClient } from '@/lib/supabase/server'

const MANAGER_EMAIL_FROM =
  process.env.RESEND_FROM_EMAIL || 'TE CUIDA <no-reply@tecuida.group>'

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

type ManagerEmailResult =
  | { channel: 'resend'; actionLink?: never }
  | { channel: 'manual'; actionLink: string }

type GeneratedManagerLink = {
  properties?: {
    action_link?: string
    hashed_token?: string
    verification_type?: string
  } | null
}

function buildManagerInviteLink(origin: string, generated: GeneratedManagerLink) {
  const tokenHash = generated.properties?.hashed_token
  const type = generated.properties?.verification_type

  if (tokenHash && type) {
    const url = new URL('/auth/accept-invite', origin)
    url.searchParams.set('token_hash', tokenHash)
    url.searchParams.set('type', type)
    return url.toString()
  }

  return generated.properties?.action_link || ''
}

async function sendManagerEmail({
  email,
  actionLink,
  municipalityName,
  mode,
}: {
  email: string
  actionLink: string
  municipalityName: string
  mode: 'invite' | 'resend'
}): Promise<ManagerEmailResult> {
  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) {
    console.warn(
      `[municipal-managers] RESEND_API_KEY no configurada; ` +
        `devolviendo enlace manual para ${email}.`,
    )
    return { channel: 'manual', actionLink }
  }

  const subject =
    mode === 'invite'
      ? `Invitacion para gestionar ${municipalityName} en TE CUIDA`
      : 'Nuevo enlace de acceso a TE CUIDA'

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${resendKey}`,
    },
    body: JSON.stringify({
      from: MANAGER_EMAIL_FROM,
      to: email,
      subject,
      html: managerEmailHtml({
        email,
        actionLink,
        municipalityName,
        mode,
      }),
    }),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Resend API error: ${res.status} ${body}`)
  }

  return { channel: 'resend' }
}

function managerEmailHtml({
  email,
  actionLink,
  municipalityName,
  mode,
}: {
  email: string
  actionLink: string
  municipalityName: string
  mode: 'invite' | 'resend'
}) {
  const title =
    mode === 'invite'
      ? 'Activa tu acceso de gestor municipal'
      : 'Tu nuevo enlace de acceso'

  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"></head>
<body style="margin:0; background:#f8fafc; padding:32px 16px; font-family:Arial, Helvetica, sans-serif; color:#111827;">
  <div style="max-width:560px; margin:0 auto; background:#ffffff; border:1px solid #e5e7eb; border-radius:16px; padding:32px;">
    <div style="font-size:24px; font-weight:800; color:#047857; margin-bottom:20px;">TE CUIDA</div>
    <h1 style="margin:0 0 12px; font-size:22px; line-height:1.25; color:#111827;">${title}</h1>
    <p style="margin:0 0 16px; color:#4b5563; line-height:1.6;">
      Has sido invitado/a a gestionar <strong>${municipalityName}</strong> en la plataforma TE CUIDA con el correo <strong>${email}</strong>.
    </p>
    <p style="margin:0 0 24px; color:#4b5563; line-height:1.6;">
      Usa este enlace para crear tu contrasena y completar el acceso. No necesitaras ningun codigo ciudadano.
    </p>
    <a href="${actionLink}" style="display:inline-block; background:#059669; color:#ffffff; text-decoration:none; font-weight:700; border-radius:10px; padding:12px 18px;">
      Activar acceso
    </a>
    <p style="margin:24px 0 0; color:#6b7280; font-size:13px; line-height:1.5;">
      Si el boton no funciona, copia y pega este enlace en tu navegador:<br>
      <span style="word-break:break-all; color:#374151;">${actionLink}</span>
    </p>
  </div>
</body>
</html>`
}

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
    return NextResponse.json(
      { error: 'No se pudieron cargar las invitaciones.' },
      { status: 500 },
    )
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
    return NextResponse.json({ error: 'Datos de invitacion invalidos.' }, { status: 422 })
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

  const origin = getTrustedOrigin(request)
  const redirectTo = `${origin}/auth/accept-invite`

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
      const message =
        existing.municipality_id === municipality.id
          ? 'Este correo ya pertenece a un usuario del municipio. Utiliza "Hacer gestor" en la lista de ciudadanos.'
          : 'Este correo ya esta vinculado a otro municipio.'
      return NextResponse.json({ error: message }, { status: 409 })
    }

    const { data: pending } = await supabase
      .from('municipal_manager_invitations')
      .select('id')
      .ilike('email', email)
      .eq('estado', 'pendiente')
      .limit(1)
    if (pending?.length) {
      return NextResponse.json(
        { error: 'Ya existe una invitacion pendiente para este correo.' },
        { status: 409 },
      )
    }

    const { data: invited, error: inviteError } = await supabase.auth.admin.generateLink({
      type: 'invite',
      email,
      options: {
        redirectTo,
        data: {
          municipality_slug: municipality.slug,
          invitation_kind: 'municipal_manager',
        },
      },
    })

    const actionLink = buildManagerInviteLink(origin, invited)

    if (inviteError || !invited.user || !actionLink) {
      console.error('[municipal-managers] Error generando invitacion:', inviteError?.message)
      return NextResponse.json(
        { error: 'No se pudo generar el enlace de acceso para este correo.' },
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
      console.error('[municipal-managers] Error registrando invitacion:', invitationError?.message)
      return NextResponse.json({ error: 'No se pudo registrar la invitacion.' }, { status: 500 })
    }

    let emailResult: ManagerEmailResult
    try {
      emailResult = await sendManagerEmail({
        email,
        actionLink,
        municipalityName: municipality.nombre_municipio,
        mode: 'invite',
      })
    } catch (emailError) {
      await supabase
        .from('municipal_manager_invitations')
        .update({ estado: 'cancelada', cancelled_at: new Date().toISOString() })
        .eq('id', invitation.id)
      await supabase.auth.admin.deleteUser(authUserId)
      console.error(
        '[municipal-managers] Error enviando correo por Resend:',
        emailError instanceof Error ? emailError.message : emailError,
      )
      return NextResponse.json({ error: 'No se pudo enviar el correo de invitacion.' }, { status: 502 })
    }

    const message =
      emailResult.channel === 'resend'
        ? `Invitacion enviada a ${email}.`
        : `Invitacion creada para ${email}. Copia el enlace y enviaselo manualmente.`

    return NextResponse.json(
      {
        invitation,
        message,
        delivery: emailResult.channel,
        manual_link: emailResult.channel === 'manual' ? emailResult.actionLink : undefined,
      },
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
    return NextResponse.json({ error: 'Invitacion no encontrada.' }, { status: 404 })
  }
  if (invitation.estado !== 'pendiente') {
    return NextResponse.json({ error: 'La invitacion ya no esta pendiente.' }, { status: 409 })
  }

  if (parsed.data.action === 'resend') {
    const { data: linkData, error } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: invitation.email,
      options: {
        redirectTo,
      },
    })

    const actionLink = buildManagerInviteLink(origin, linkData)

    if (error || !actionLink) {
      console.error('[municipal-managers] Error generando nuevo acceso:', error?.message)
      return NextResponse.json({ error: 'No se pudo reenviar el enlace de acceso.' }, { status: 502 })
    }

    let emailResult: ManagerEmailResult
    try {
      emailResult = await sendManagerEmail({
        email: invitation.email,
        actionLink,
        municipalityName: municipality.nombre_municipio,
        mode: 'resend',
      })
    } catch (emailError) {
      console.error(
        '[municipal-managers] Error reenviando correo por Resend:',
        emailError instanceof Error ? emailError.message : emailError,
      )
      return NextResponse.json({ error: 'No se pudo reenviar el enlace de acceso.' }, { status: 502 })
    }

    const sentAt = new Date().toISOString()
    await supabase
      .from('municipal_manager_invitations')
      .update({ last_sent_at: sentAt })
      .eq('id', invitation.id)

    const message =
      emailResult.channel === 'resend'
        ? `Nuevo enlace enviado a ${invitation.email}.`
        : `Nuevo enlace generado para ${invitation.email}. Copia el enlace y enviaselo manualmente.`

    return NextResponse.json({
      message,
      last_sent_at: sentAt,
      delivery: emailResult.channel,
      manual_link: emailResult.channel === 'manual' ? emailResult.actionLink : undefined,
    })
  }

  const cancelledAt = new Date().toISOString()
  const { error: cancelError } = await supabase
    .from('municipal_manager_invitations')
    .update({ estado: 'cancelada', cancelled_at: cancelledAt })
    .eq('id', invitation.id)
    .eq('estado', 'pendiente')

  if (cancelError) {
    return NextResponse.json({ error: 'No se pudo cancelar la invitacion.' }, { status: 500 })
  }

  if (invitation.auth_user_id) {
    const { error: deleteError } = await supabase.auth.admin.deleteUser(invitation.auth_user_id)
    if (deleteError) {
      await supabase
        .from('municipal_manager_invitations')
        .update({ estado: 'pendiente', cancelled_at: null })
        .eq('id', invitation.id)
      console.error('[municipal-managers] Error eliminando usuario invitado:', deleteError.message)
      return NextResponse.json({ error: 'No se pudo cancelar completamente la invitacion.' }, { status: 500 })
    }
  }

  return NextResponse.json({ message: 'Invitacion cancelada.' })
}
