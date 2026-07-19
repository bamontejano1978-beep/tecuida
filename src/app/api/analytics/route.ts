import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { checkRateLimitAsync } from '@/lib/admin/rate-limit'

const EventSchema = z.object({
  evento: z.enum([
    'page_view', 'catalog_search', 'category_filter', 'app_view',
    'lesson_started', 'lesson_completed', 'program_enrolled',
    'program_completed', 'achievement_unlocked', 'login', 'register', 'logout',
    'activity_registered', 'activity_cancelled',
  ]),
  payload: z.record(z.unknown()).default({}),
  municipality_id: z.string().uuid().nullable().optional(),
})

export async function POST(request: Request) {
  const rateLimit = await checkRateLimitAsync(request, {
    namespace: 'public-analytics',
    limit: 120,
    windowMs: 60_000,
  })
  if (rateLimit) return rateLimit

  const parsed = EventSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Evento no válido' }, { status: 422 })
  }

  if (JSON.stringify(parsed.data.payload).length > 4_000) {
    return NextResponse.json({ error: 'Payload demasiado grande' }, { status: 413 })
  }

  let municipalityId = request.headers.get('x-tenant-id') || null

  // Para usuarios autenticados, la pertenencia guardada en BD prevalece sobre
  // cualquier dato enviado por el navegador y evita atribuciones cruzadas.
  const authClient = createClient()
  const { data: { user } } = await authClient.auth.getUser()
  const adminClient = createAdminClient()
  if (user) {
    const { data: profile } = await adminClient
      .from('users')
      .select('municipality_id')
      .eq('id', user.id)
      .maybeSingle()
    municipalityId = (profile?.municipality_id as string | undefined) || municipalityId
  }

  if (!municipalityId) return new NextResponse(null, { status: 204 })

  const { error } = await adminClient.from('analytics_events').insert({
    municipality_id: municipalityId,
    user_id: user?.id || null,
    evento: parsed.data.evento,
    payload: parsed.data.payload,
  })

  if (error) {
    return NextResponse.json({ error: 'No se pudo registrar el evento' }, { status: 400 })
  }

  return new NextResponse(null, { status: 204 })
}
