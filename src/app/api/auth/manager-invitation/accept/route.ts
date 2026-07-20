import { NextResponse, type NextRequest } from 'next/server'
import { checkRateLimitAsync } from '@/lib/admin/rate-limit'
import { createAdminClient, createClient } from '@/lib/supabase/server'

async function getInvitationForCurrentUser() {
  const supabase = createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return null

  const admin = createAdminClient()
  const { data: invitation } = await admin
    .from('municipal_manager_invitations')
    .select('id, email, estado, municipality_id, municipalities(slug, nombre_municipio)')
    .eq('auth_user_id', user.id)
    .in('estado', ['pendiente', 'aceptada'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!invitation || invitation.email.toLowerCase() !== user.email?.toLowerCase()) {
    return null
  }

  const { data: profile } = await admin
    .from('users')
    .select('id, municipality_id, rol')
    .eq('id', user.id)
    .maybeSingle()

  if (
    !profile ||
    profile.rol !== 'admin_municipio' ||
    profile.municipality_id !== invitation.municipality_id
  ) {
    return null
  }

  return { admin, invitation }
}

export async function GET(request: NextRequest) {
  const rateLimit = await checkRateLimitAsync(request, {
    limit: 30,
    windowMs: 60_000,
    namespace: 'auth:manager-invitation',
  })
  if (rateLimit) return rateLimit

  const result = await getInvitationForCurrentUser()
  if (!result) {
    return NextResponse.json({ error: 'Invitación no válida o cancelada.' }, { status: 404 })
  }

  const municipality = result.invitation.municipalities as unknown as {
    slug: string
    nombre_municipio: string
  } | null

  return NextResponse.json({
    email: result.invitation.email,
    estado: result.invitation.estado,
    municipality_name: municipality?.nombre_municipio || 'tu municipio',
  })
}

export async function POST(request: NextRequest) {
  const rateLimit = await checkRateLimitAsync(request, {
    limit: 10,
    windowMs: 60_000,
    namespace: 'auth:manager-invitation-accept',
  })
  if (rateLimit) return rateLimit

  const result = await getInvitationForCurrentUser()
  if (!result) {
    return NextResponse.json({ error: 'Invitación no válida o cancelada.' }, { status: 404 })
  }

  const municipality = result.invitation.municipalities as unknown as {
    slug: string
    nombre_municipio: string
  } | null

  if (result.invitation.estado === 'pendiente') {
    const { error } = await result.admin
      .from('municipal_manager_invitations')
      .update({ estado: 'aceptada', accepted_at: new Date().toISOString() })
      .eq('id', result.invitation.id)
      .eq('estado', 'pendiente')

    if (error) {
      console.error('[manager-invitation] Error aceptando invitación:', error.message)
      return NextResponse.json({ error: 'No se pudo completar la invitación.' }, { status: 500 })
    }
  }

  return NextResponse.json({
    accepted: true,
    municipality_slug: municipality?.slug || '',
    redirect_to: '/municipio/estadisticas',
  })
}
