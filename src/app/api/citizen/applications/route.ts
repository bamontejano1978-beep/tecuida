import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { checkRateLimitAsync } from '@/lib/admin/rate-limit'

const schema = z.discriminatedUnion('action', [
  z.object({ application_id: z.string().uuid(), action: z.literal('open') }),
  z.object({ application_id: z.string().uuid(), action: z.literal('favorite'), favorite: z.boolean() }),
])

export async function POST(request: Request) {
  const limited = await checkRateLimitAsync(request, { namespace: 'citizen:applications', limit: 120, windowMs: 60_000 })
  if (limited) return limited
  const { data: { user } } = await createClient().auth.getUser()
  if (!user) return NextResponse.json({ error: 'Inicia sesión para guardar tus aplicaciones.' }, { status: 401 })
  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Datos inválidos.' }, { status: 422 })
  const admin = createAdminClient()
  const { data: profile } = await admin.from('users').select('municipality_id').eq('id', user.id).maybeSingle()
  if (!profile?.municipality_id) return NextResponse.json({ error: 'Municipio no disponible.' }, { status: 403 })
  const { data: assignment } = await admin.from('municipality_applications')
    .select('application_id, application:applications!inner(activa), municipality:municipalities!inner(estado_suscripcion)')
    .eq('municipality_id', profile.municipality_id).eq('application_id', parsed.data.application_id)
    .eq('activa', true).eq('publication_status', 'publicada').eq('application.activa', true)
    .not('municipality.estado_suscripcion', 'in', '(suspendida,cancelada)').maybeSingle()
  if (!assignment) return NextResponse.json({ error: 'Aplicación no disponible en tu municipio.' }, { status: 403 })
  const args = { p_user: user.id, p_application: parsed.data.application_id }
  const { error } = parsed.data.action === 'open'
    ? await admin.rpc('record_application_open', args)
    : await admin.rpc('set_application_favorite', { ...args, p_favorite: parsed.data.favorite })
  if (error) return NextResponse.json({ error: 'No se pudo guardar. Inténtalo de nuevo.' }, { status: 503 })
  return new NextResponse(null, { status: 204 })
}
