/**
 * POST /api/admin/categories/upload-icon
 *
 * Sube una imagen de icono para una categoría al bucket `apps` de
 * Supabase Storage. La imagen se almacena en:
 *   apps/categories/<categoryId>/icon.<ext>
 *
 * Body: multipart/form-data
 *   - file: imagen (JPEG, PNG, SVG, WebP, máx 5 MB)
 *   - categoryId: ID de la categoría (para la ruta en storage)
 *
 * Respuesta: { publicUrl: string }
 */

import { createAdminClient } from '@/lib/supabase/server'
import { verifyAdminAccess } from '@/lib/admin/auth'
import { checkRateLimitAsync } from '@/lib/admin/rate-limit'
import { NextResponse, type NextRequest } from 'next/server'

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/svg+xml', 'image/webp']
const MAX_SIZE = 5 * 1024 * 1024 // 5 MB

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getExtension(filename: string): string {
  const dot = filename.lastIndexOf('.')
  if (dot === -1) return 'png'
  return filename.slice(dot + 1).toLowerCase()
}

// ---------------------------------------------------------------------------
// POST handler
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest): Promise<Response> {
  const rateLimit = await checkRateLimitAsync(request)
  if (rateLimit) return rateLimit

  const adminUser = await verifyAdminAccess()
  if (adminUser instanceof NextResponse) return adminUser

  // 1. Parsear FormData
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
  const categoryId = formData.get('categoryId')

  // 2. Validar campos
  if (!file || !(file instanceof File)) {
    return NextResponse.json(
      { error: 'El campo "file" es obligatorio y debe ser un archivo.' },
      { status: 400 },
    )
  }

  if (typeof categoryId !== 'string' || !categoryId.trim()) {
    return NextResponse.json(
      { error: 'El campo "categoryId" es obligatorio.' },
      { status: 400 },
    )
  }

  // 3. Validar tipo de imagen
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: 'Formato no permitido. Usa JPEG, PNG, SVG o WebP.' },
      { status: 400 },
    )
  }

  // 4. Validar tamaño
  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      {
        error: `La imagen pesa ${(file.size / (1024 * 1024)).toFixed(1)} MB. El límite es 5 MB.`,
      },
      { status: 413 },
    )
  }

  // 5. Subir a Supabase Storage
  try {
    const supabase = createAdminClient()
    const ext = getExtension(file.name)
    const storagePath = `categories/${categoryId}/icon.${ext}`

    const buffer = Buffer.from(await file.arrayBuffer())

    const { error: uploadError } = await supabase.storage
      .from('apps')
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: true,
      })

    if (uploadError) {
      console.error(
        '[upload-icon] Error subiendo:',
        uploadError.message,
      )
      return NextResponse.json(
        { error: 'Error al subir la imagen.' },
        { status: 500 },
      )
    }

    // 6. Obtener URL pública
    const { data: publicUrlData } = supabase.storage
      .from('apps')
      .getPublicUrl(storagePath)

    return NextResponse.json(
      { publicUrl: publicUrlData.publicUrl },
      { status: 201 },
    )
  } catch (err) {
    console.error('[upload-icon] Error inesperado:', err)
    return NextResponse.json(
      { error: 'Error interno al procesar la imagen.' },
      { status: 500 },
    )
  }
}
