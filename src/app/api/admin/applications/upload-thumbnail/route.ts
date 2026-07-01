/**
 * POST /api/admin/applications/upload-thumbnail
 *
 * Sube una imagen de miniatura para una aplicación al bucket `apps` de
 * Supabase Storage. La imagen se almacena en:
 *   apps/<appSlug>/thumbnail.<ext>
 *
 * Body: multipart/form-data
 *   - file: imagen (JPEG, PNG, SVG, WebP, máx 5 MB)
 *   - appSlug: slug de la aplicación (para la ruta en storage)
 *
 * Respuesta: { publicUrl: string }
 *
 * Se usa tanto desde el formulario de creación como desde el de edición.
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
  const appSlug = formData.get('appSlug')

  // 2. Validar campos
  if (!file || !(file instanceof File)) {
    return NextResponse.json(
      { error: 'El campo "file" es obligatorio y debe ser un archivo.' },
      { status: 400 },
    )
  }

  if (typeof appSlug !== 'string' || !appSlug.trim()) {
    return NextResponse.json(
      { error: 'El campo "appSlug" es obligatorio.' },
      { status: 400 },
    )
  }

  const slug = appSlug.trim().toLowerCase()

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
    const storagePath = `${slug}/thumbnail.${ext}`

    const buffer = Buffer.from(await file.arrayBuffer())

    const { error: uploadError } = await supabase.storage
      .from('apps')
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: true,
      })

    if (uploadError) {
      // Si el bucket no existe, intentar crearlo
      if (uploadError.message?.includes('not found') || uploadError.message?.includes('exist')) {
        console.log('[upload-thumbnail] Creando bucket "apps"...')
        await supabase.storage.createBucket('apps', {
          public: true,
          fileSizeLimit: 50 * 1024 * 1024,
        })

        // Reintentar subida
        const { error: retryError } = await supabase.storage
          .from('apps')
          .upload(storagePath, buffer, {
            contentType: file.type,
            upsert: true,
          })

        if (retryError) {
          console.error('[upload-thumbnail] Error tras crear bucket:', retryError.message)
          return NextResponse.json(
            { error: 'Error al subir la imagen.' },
            { status: 500 },
          )
        }
      } else {
        console.error('[upload-thumbnail] Error subiendo:', uploadError.message)
        return NextResponse.json(
          { error: 'Error al subir la imagen.' },
          { status: 500 },
        )
      }
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
    console.error('[upload-thumbnail] Error inesperado:', err)
    return NextResponse.json(
      { error: 'Error interno al procesar la imagen.' },
      { status: 500 },
    )
  }
}
