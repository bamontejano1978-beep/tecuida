import { randomUUID } from 'crypto'
import { NextResponse, type NextRequest } from 'next/server'
import { getAdminAccess } from '@/lib/admin/activities'
import { checkRateLimitAsync } from '@/lib/admin/rate-limit'
import { createAdminClient } from '@/lib/supabase/server'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/svg+xml', 'image/webp']
const MAX_SIZE = 5 * 1024 * 1024

function extensionFor(file: File): string {
  if (file.type === 'image/jpeg') return 'jpg'
  if (file.type === 'image/png') return 'png'
  if (file.type === 'image/svg+xml') return 'svg'
  if (file.type === 'image/webp') return 'webp'
  const ext = file.name.split('.').pop()?.toLowerCase()
  return ext && ['jpg', 'jpeg', 'png', 'svg', 'webp'].includes(ext)
    ? ext.replace('jpeg', 'jpg')
    : 'png'
}

export async function POST(request: NextRequest): Promise<Response> {
  const rateLimit = await checkRateLimitAsync(request, {
    limit: 15,
    windowMs: 60_000,
    namespace: 'municipio:application-icon',
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

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json(
      { error: 'La petición debe ser multipart/form-data.' },
      { status: 400 },
    )
  }

  const file = formData.get('file')
  const applicationId = formData.get('applicationId')
  if (!file || !(file instanceof File)) {
    return NextResponse.json(
      { error: 'El campo "file" es obligatorio y debe ser un archivo.' },
      { status: 400 },
    )
  }
  if (typeof applicationId !== 'string' || !applicationId.trim()) {
    return NextResponse.json(
      { error: 'El campo "applicationId" es obligatorio.' },
      { status: 400 },
    )
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: 'Formato no permitido. Usa JPEG, PNG, SVG o WebP.' },
      { status: 400 },
    )
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      { error: 'La imagen no puede superar 5 MB.' },
      { status: 413 },
    )
  }

  const supabase = createAdminClient()
  const { data: assignment, error: assignmentError } = await supabase
    .from('municipality_applications')
    .select('municipality_id, application_id, activa')
    .eq('municipality_id', access.municipality_id)
    .eq('application_id', applicationId.trim())
    .single()

  if (assignmentError || !assignment?.activa) {
    return NextResponse.json(
      { error: 'Aplicación no disponible para este municipio.' },
      { status: 404 },
    )
  }

  const ext = extensionFor(file)
  const storagePath = `municipal-overrides/${access.municipality_id}/${applicationId.trim()}/thumbnail-${Date.now()}-${randomUUID().slice(0, 8)}.${ext}`
  const buffer = Buffer.from(await file.arrayBuffer())

  const { error: uploadError } = await supabase.storage
    .from('apps')
    .upload(storagePath, buffer, {
      contentType: file.type,
      upsert: false,
    })

  if (uploadError) {
    console.error('[municipio/applications/icon]', uploadError.message)
    return NextResponse.json(
      { error: 'Error al subir el icono personalizado.' },
      { status: 500 },
    )
  }

  const { data: publicUrlData } = supabase.storage
    .from('apps')
    .getPublicUrl(storagePath)

  return NextResponse.json({ publicUrl: publicUrlData.publicUrl }, { status: 201 })
}
