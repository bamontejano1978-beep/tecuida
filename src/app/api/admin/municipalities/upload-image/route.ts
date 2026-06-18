/**
 * POST /api/admin/municipalities/upload-image
 *
 * Sube una imagen (hero o escudo) al bucket público `municipalities`
 * de Supabase Storage y devuelve la URL pública.
 *
 * Body (multipart/form-data):
 *   - file: File   (JPEG, PNG, SVG o WebP; máx. 5 MB)
 *   - slug: string (slug del municipio; determina la ruta en el bucket)
 *   - kind: "hero" | "escudo"
 *
 * Respuesta 200: { publicUrl: string }
 *
 * Seguridad: verifyAdminAccess() — solo superadmins autenticados.
 */

import { createAdminClient } from '@/lib/supabase/server'
import { verifyAdminAccess } from '@/lib/admin/auth'
import { NextResponse, type NextRequest } from 'next/server'

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/svg+xml',
  'image/webp',
] as const

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5 MB

const VALID_KINDS = ['hero', 'escudo'] as const
type ImageKind = (typeof VALID_KINDS)[number]

/** Extensiones por MIME type para normalizar nombres de archivo en el bucket. */
const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/svg+xml': 'svg',
  'image/webp': 'webp',
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function extForMime(mime: string, fallbackFilename?: string): string {
  if (MIME_TO_EXT[mime]) return MIME_TO_EXT[mime]
  // Fallback: extensión del nombre de archivo original
  if (fallbackFilename) {
    const ext = fallbackFilename.split('.').pop()?.toLowerCase()
    if (ext && ['jpg', 'jpeg', 'png', 'svg', 'webp'].includes(ext)) {
      return ext === 'jpeg' ? 'jpg' : ext
    }
  }
  return 'jpg'
}

/**
 * Asegura que el bucket público `municipalities` existe en Supabase Storage.
 * Si no existe, lo crea con las políticas de acceso y límites adecuados.
 * Idempotente: si el bucket ya existe, no hace nada.
 */
async function ensureMunicipalitiesBucket(client: ReturnType<typeof createAdminClient>): Promise<void> {
  // Verificar si el bucket ya existe
  const { data: buckets, error: listError } = await client.storage.listBuckets()

  if (listError) {
    console.error('[upload-image] Error al listar buckets:', listError.message)
    throw new Error('No se pudo verificar el almacenamiento de imágenes.')
  }

  if (buckets?.some((b: { name: string }) => b.name === 'municipalities')) {
    return // ya existe
  }

  // Crear el bucket
  console.log('[upload-image] Creando bucket "municipalities"...')
  const { error: createError } = await client.storage.createBucket(
    'municipalities',
    {
      public: true,
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/svg+xml', 'image/webp'],
      fileSizeLimit: 5 * 1024 * 1024, // 5 MB
    },
  )

  if (createError) {
    console.error('[upload-image] Error al crear bucket:', createError.message)
    throw new Error('No se pudo crear el bucket de almacenamiento de imágenes.')
  }

  console.log('[upload-image] Bucket "municipalities" creado correctamente.')
}

// ---------------------------------------------------------------------------
// POST handler
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest): Promise<Response> {
  // 1. Verificar acceso de superadmin
  const adminUser = await verifyAdminAccess()
  if (adminUser instanceof NextResponse) return adminUser

  // 2. Parsear FormData
  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json(
      { error: 'La petición debe ser multipart/form-data con los campos file, slug y kind.' },
      { status: 400 },
    )
  }

  const file = formData.get('file')
  const slugRaw = formData.get('slug')
  const kindRaw = formData.get('kind')

  // 3. Validar presencia de campos
  if (!file || !(file instanceof File)) {
    return NextResponse.json(
      { error: 'El campo "file" es obligatorio y debe ser un archivo.' },
      { status: 400 },
    )
  }

  if (typeof slugRaw !== 'string' || !slugRaw.trim()) {
    return NextResponse.json(
      { error: 'El campo "slug" es obligatorio.' },
      { status: 400 },
    )
  }

  if (typeof kindRaw !== 'string' || !VALID_KINDS.includes(kindRaw as ImageKind)) {
    return NextResponse.json(
      { error: `El campo "kind" debe ser "hero" o "escudo".` },
      { status: 400 },
    )
  }

  const slug = slugRaw.trim().toLowerCase()
  const kind = kindRaw as ImageKind

  // 4. Validar tipo de archivo
  if (!ALLOWED_MIME_TYPES.includes(file.type as (typeof ALLOWED_MIME_TYPES)[number])) {
    return NextResponse.json(
      {
        error: `Tipo de archivo no permitido (${file.type}). Formatos aceptados: JPEG, PNG, SVG, WebP.`,
      },
      { status: 400 },
    )
  }

  // 5. Validar tamaño (máx. 5 MB)
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: 'El archivo no puede superar los 5 MB.' },
      { status: 400 },
    )
  }

  // 6. Asegurar que el bucket existe (idempotente)
  const adminClient = createAdminClient()

  try {
    await ensureMunicipalitiesBucket(adminClient)
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error al verificar el almacenamiento.' },
      { status: 500 },
    )
  }

  // 7. Subir a Supabase Storage
  const ext = extForMime(file.type, file.name)
  const bucketPath = `${slug}/${kind}.${ext}`

  try {
    const buffer = Buffer.from(await file.arrayBuffer())

    const { error: uploadError } = await adminClient.storage
      .from('municipalities')
      .upload(bucketPath, buffer, {
        contentType: file.type,
        upsert: true,
      })

    if (uploadError) {
      console.error(
        `[upload-image] Error al subir ${slug}/${kind}: ${uploadError.message}`,
      )
      return NextResponse.json(
        { error: 'Error al subir la imagen al almacenamiento.' },
        { status: 500 },
      )
    }

    // 8. Obtener URL pública
    const { data } = adminClient.storage
      .from('municipalities')
      .getPublicUrl(bucketPath)

    return NextResponse.json({ publicUrl: data.publicUrl })
  } catch (err) {
    console.error(
      `[upload-image] Error inesperado para ${slug}/${kind}:`,
      err,
    )
    return NextResponse.json(
      { error: 'Error interno al procesar la imagen.' },
      { status: 500 },
    )
  }
}
