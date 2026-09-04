import { NextResponse } from 'next/server'
import { revalidatePath, revalidateTag } from 'next/cache'
import { z } from 'zod'
import { checkRateLimitAsync } from '@/lib/admin/rate-limit'
import { getAdminAccess } from '@/lib/admin/activities'
import { createAdminClient } from '@/lib/supabase/server'
import { MUNICIPALITY_APPS_TAG } from '@/lib/tenant/municipality-apps-cache'

const RequestSchema = z.object({
  application_id: z.string().uuid(),
  status: z.enum(['publicada', 'oculta']).optional(),
  thumbnail_url_override: z.string().url().max(2048).nullable().optional(),
}).refine(
  (data) =>
    data.status !== undefined ||
    Object.prototype.hasOwnProperty.call(data, 'thumbnail_url_override'),
  { message: 'No hay cambios para guardar.' },
)

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
  const updateData: Record<string, unknown> = {
    publication_updated_at: now,
    publication_updated_by: access.user_id,
  }

  const nextStatus = parsed.data.status
  if (nextStatus === 'publicada') {
    updateData.publication_status = nextStatus
    updateData.published_at = now
    updateData.hidden_at = null
  } else if (nextStatus === 'oculta') {
    updateData.publication_status = nextStatus
    updateData.hidden_at = now
  }

  if (Object.prototype.hasOwnProperty.call(parsed.data, 'thumbnail_url_override')) {
    updateData.thumbnail_url_override = parsed.data.thumbnail_url_override || null
  }

  const { data, error } = await supabase
    .from('municipality_applications')
    .update(updateData)
    .eq('municipality_id', municipalityId)
    .eq('application_id', parsed.data.application_id)
    .select('application_id, publication_status, published_at, hidden_at, thumbnail_url_override')
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
  revalidatePath('/dashboard')
  revalidatePath('/dashboard/aplicaciones')

  return NextResponse.json({ data })
}
