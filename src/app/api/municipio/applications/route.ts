import { NextResponse } from 'next/server'
import { revalidatePath, revalidateTag } from 'next/cache'
import { z } from 'zod'
import { checkRateLimitAsync } from '@/lib/admin/rate-limit'
import { getAdminAccess } from '@/lib/admin/activities'
import { createAdminClient } from '@/lib/supabase/server'
import { MUNICIPALITY_APPS_TAG } from '@/lib/tenant/municipality-apps-cache'

const RequestSchema = z.object({
  application_id: z.string().uuid(),
  status: z.enum(['publicada', 'oculta']),
})

export async function POST(request: Request) {
  const rateLimit = await checkRateLimitAsync(request, {
    limit: 30,
    windowMs: 60_000,
    namespace: 'municipio:applications',
  })
  if (rateLimit) return rateLimit

  const access = await getAdminAccess()
  if (!access) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })
  }
  if (access.is_superadmin || !access.municipality_id) {
    return NextResponse.json(
      { error: 'Esta ruta está reservada a gestores municipales.' },
      { status: 403 },
    )
  }

  const parsed = RequestSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos inválidos.' }, { status: 422 })
  }

  const municipalityId = access.municipality_id
  const supabase = createAdminClient()

  const { data: assignment, error: assignmentError } = await supabase
    .from('municipality_applications')
    .select('municipality_id, application_id, activa')
    .eq('municipality_id', municipalityId)
    .eq('application_id', parsed.data.application_id)
    .single()

  if (assignmentError || !assignment) {
    return NextResponse.json(
      { error: 'Aplicación no disponible para este municipio.' },
      { status: 404 },
    )
  }

  if (!assignment.activa) {
    return NextResponse.json(
      { error: 'Esta aplicación no está entregada actualmente al municipio.' },
      { status: 422 },
    )
  }

  const now = new Date().toISOString()
  const nextStatus = parsed.data.status
  const updateData =
    nextStatus === 'publicada'
      ? {
          publication_status: nextStatus,
          published_at: now,
          hidden_at: null,
          publication_updated_at: now,
          publication_updated_by: access.user_id,
        }
      : {
          publication_status: nextStatus,
          hidden_at: now,
          publication_updated_at: now,
          publication_updated_by: access.user_id,
        }

  const { data, error } = await supabase
    .from('municipality_applications')
    .update(updateData)
    .eq('municipality_id', municipalityId)
    .eq('application_id', parsed.data.application_id)
    .select('application_id, publication_status, published_at, hidden_at')
    .single()

  if (error) {
    console.error('[municipio/applications]', error.message)
    return NextResponse.json(
      { error: 'No se pudo actualizar la publicación.' },
      { status: 500 },
    )
  }

  revalidateTag(MUNICIPALITY_APPS_TAG)
  revalidatePath('/')
  revalidatePath('/municipio/aplicaciones')

  return NextResponse.json({ data })
}
