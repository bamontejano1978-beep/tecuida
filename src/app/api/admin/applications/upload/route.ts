/**
 * POST /api/admin/applications/upload
 *
 * Sube una aplicación web empaquetada (ZIP) al catálogo:
 *  1. Recibe multipart/form-data: `zip` (File) + `metadata` (JSON string)
 *  2. Extrae el ZIP con adm-zip
 *  3. Valida que contenga index.html en la raíz
 *  4. Sube todos los archivos a Supabase Storage → bucket `apps/<slug>/`
 *  5. Crea el registro en `public.applications` con url_acceso = /a/<slug>
 *
 * Límite: ZIP ≤ 10 MB (Vercel serverless body limit ~4.5 MB;
 * para archivos mayores usar alojamiento externo con url_acceso manual).
 *
 * Seguridad: verifyAdminAccess() — solo superadmins autenticados.
 */

import { createAdminClient } from '@/lib/supabase/server'
import { verifyAdminAccess } from '@/lib/admin/auth'
import { checkRateLimitAsync } from '@/lib/admin/rate-limit'
import { getContentType } from '@/lib/mime-types'
import { NextResponse, type NextRequest } from 'next/server'
import AdmZip from 'adm-zip'
import type { IZipEntry } from 'adm-zip'

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------

const MAX_ZIP_SIZE = 4 * 1024 * 1024 // 4 MB (Vercel serverless body limit ~4.5 MB)
const VALID_SLUG_RE = /^[a-z0-9-]+$/
const VALID_TYPES = ['programa', 'herramienta', 'encuesta', 'recurso'] as const
const VALID_HEX_RE = /^#[0-9a-fA-F]{6}$/

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Asegura que el bucket público `apps` existe en Supabase Storage.
 * Idempotente: si ya existe, no hace nada.
 */
async function ensureAppsBucket(
  client: ReturnType<typeof createAdminClient>,
): Promise<{ error?: string }> {
  const { data: buckets, error: listError } = await client.storage.listBuckets()

  if (listError) {
    console.error('[upload-app] Error listing buckets:', listError.message)
    return { error: 'No se pudo verificar el almacenamiento.' }
  }

  if (buckets?.some((b: { name: string }) => b.name === 'apps')) {
    return {} // ya existe
  }

  console.log('[upload-app] Creating bucket "apps"...')
  const { error: createError } = await client.storage.createBucket('apps', {
    public: true,
    fileSizeLimit: 50 * 1024 * 1024, // 50 MB por archivo
  })

  if (createError) {
    console.error('[upload-app] Error creating bucket:', createError.message)
    return { error: 'No se pudo crear el bucket de almacenamiento.' }
  }

  console.log('[upload-app] Bucket "apps" created.')
  return {}
}

// ---------------------------------------------------------------------------
// POST handler
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest): Promise<Response> {
  // 0. Rate limiting
  const rateLimit = await checkRateLimitAsync(request)
  if (rateLimit) return rateLimit

  // 1. Verificar acceso de superadmin
  const adminUser = await verifyAdminAccess()
  if (adminUser instanceof NextResponse) return adminUser

  // 2. Parsear FormData
  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json(
      { error: 'La petición debe ser multipart/form-data con los campos zip y metadata.' },
      { status: 400 },
    )
  }

  const zipFile = formData.get('zip')
  const metadataRaw = formData.get('metadata')

  // 3. Validar presencia de campos
  if (!zipFile || !(zipFile instanceof File)) {
    return NextResponse.json(
      { error: 'El campo "zip" es obligatorio y debe ser un archivo.' },
      { status: 400 },
    )
  }

  if (typeof metadataRaw !== 'string' || !metadataRaw.trim()) {
    return NextResponse.json(
      { error: 'El campo "metadata" es obligatorio (JSON string).' },
      { status: 400 },
    )
  }

  // 4. Validar que es un ZIP
  const isZipName = zipFile.name.toLowerCase().endsWith('.zip')
  const isZipMime = zipFile.type === 'application/zip' || zipFile.type === 'application/x-zip-compressed'
  if (!isZipName && !isZipMime) {
    return NextResponse.json(
      { error: 'El archivo debe ser un ZIP (.zip).' },
      { status: 400 },
    )
  }

  // 5. Validar tamaño
  if (zipFile.size > MAX_ZIP_SIZE) {
    return NextResponse.json(
      {
        error: `El ZIP pesa ${(zipFile.size / (1024 * 1024)).toFixed(1)} MB. El límite es ${MAX_ZIP_SIZE / (1024 * 1024)} MB por restricciones de Vercel.`,
        suggestion: 'Para apps más grandes, aloja los archivos en Vercel/Netlify y usa la opción "URL externa" en el formulario.',
      },
      { status: 413 },
    )
  }

  // 6. Parsear metadata JSON
  let metadata: {
    nombre: string
    descripcion: string
    category_id: string
    tipo: string
    app_slug: string
    brand_color?: string
    thumbnail_url?: string
    instrucciones?: string
    activa?: boolean
  }
  try {
    metadata = JSON.parse(metadataRaw)
  } catch {
    return NextResponse.json(
      { error: 'El campo "metadata" debe ser un JSON válido.' },
      { status: 400 },
    )
  }

  // 7. Validar campos de metadata
  const errors: string[] = []

  if (!metadata.nombre || typeof metadata.nombre !== 'string' || metadata.nombre.trim().length === 0) {
    errors.push('El nombre es obligatorio.')
  } else if (metadata.nombre.length > 120) {
    errors.push('El nombre no puede superar los 120 caracteres.')
  }

  if (!metadata.descripcion || typeof metadata.descripcion !== 'string' || metadata.descripcion.trim().length === 0) {
    errors.push('La descripción es obligatoria.')
  } else if (metadata.descripcion.length > 1000) {
    errors.push('La descripción no puede superar los 1000 caracteres.')
  }

  if (!metadata.category_id || typeof metadata.category_id !== 'string') {
    errors.push('La categoría es obligatoria.')
  }

  if (!metadata.tipo || !VALID_TYPES.includes(metadata.tipo as typeof VALID_TYPES[number])) {
    errors.push('El tipo debe ser: programa, herramienta, encuesta o recurso.')
  }

  const slug = metadata.app_slug?.trim().toLowerCase()
  if (!slug || !VALID_SLUG_RE.test(slug)) {
    errors.push('El slug es obligatorio (solo minúsculas, números y guiones).')
  } else if (slug.length > 64) {
    errors.push('El slug no puede superar los 64 caracteres.')
  }

  if (metadata.brand_color && !VALID_HEX_RE.test(metadata.brand_color)) {
    errors.push('El color de marca debe ser un hex válido (#RRGGBB).')
  }

  if (metadata.thumbnail_url && typeof metadata.thumbnail_url === 'string') {
    try {
      new URL(metadata.thumbnail_url)
    } catch {
      errors.push('La URL de miniatura no es válida.')
    }
  }

  if (errors.length > 0) {
    return NextResponse.json({ error: 'Datos inválidos', details: errors }, { status: 422 })
  }

  // 8. Extraer ZIP
  let zip: AdmZip
  try {
    const buffer = Buffer.from(await zipFile.arrayBuffer())
    zip = new AdmZip(buffer)
  } catch {
    return NextResponse.json(
      { error: 'El archivo ZIP está corrupto o no se puede leer.' },
      { status: 400 },
    )
  }

  const entries = zip.getEntries()

  // 9. Validar que contiene index.html en la raíz
  const hasIndexHtml = entries.some(
    (e: IZipEntry) => !e.isDirectory && e.entryName === 'index.html',
  )
  if (!hasIndexHtml) {
    return NextResponse.json(
      { error: 'El ZIP debe contener un archivo index.html en la raíz.' },
      { status: 400 },
    )
  }

  // 10. Limitar número de archivos (máx. 200)
  const fileEntries = entries.filter((e: IZipEntry) => !e.isDirectory)
  if (fileEntries.length > 200) {
    return NextResponse.json(
      { error: `El ZIP contiene demasiados archivos (${fileEntries.length}). Máximo: 200.` },
      { status: 400 },
    )
  }

  // 11. Asegurar que el bucket `apps` existe
  const supabase = createAdminClient()
  const bucketResult = await ensureAppsBucket(supabase)
  if (bucketResult.error) {
    return NextResponse.json({ error: bucketResult.error }, { status: 500 })
  }

  // 12. Subir todos los archivos a Supabase Storage
  const uploadedFiles: string[] = []
  const failedFiles: string[] = []

  for (const entry of fileEntries) {
    const storagePath = `${slug}/${entry.entryName}`
    const content = entry.getData()
    const contentType = getContentType(entry.entryName)

    const { error: uploadError } = await supabase.storage
      .from('apps')
      .upload(storagePath, content, {
        contentType,
        upsert: true,
      })

    if (uploadError) {
      console.error(`[upload-app] Error uploading ${storagePath}:`, uploadError.message)
      failedFiles.push(entry.entryName)
    } else {
      uploadedFiles.push(storagePath)
    }
  }

  if (failedFiles.length > 0 && uploadedFiles.length === 0) {
    return NextResponse.json(
      { error: `No se pudo subir ningún archivo. Fallos: ${failedFiles.join(', ')}` },
      { status: 500 },
    )
  }

  // 13. Verificar que la categoría existe
  const { data: category, error: catError } = await supabase
    .from('categories')
    .select('id')
    .eq('id', metadata.category_id)
    .single()

  if (catError || !category) {
    return NextResponse.json(
      { error: 'La categoría seleccionada no existe.' },
      { status: 422 },
    )
  }

  // 14. Crear registro en la BD
  const { data: app, error: dbError } = await supabase
    .from('applications')
    .insert({
      nombre: metadata.nombre.trim(),
      descripcion: metadata.descripcion.trim(),
      category_id: metadata.category_id,
      tipo: metadata.tipo,
      app_slug: slug,
      url_acceso: `/a/${slug}`,
      instrucciones: metadata.instrucciones?.trim() || null,
      thumbnail_url: metadata.thumbnail_url || null,
      brand_color: metadata.brand_color || null,
      activa: metadata.activa ?? true,
    })
    .select()
    .single()

  if (dbError) {
    console.error('[upload-app] DB insert error:', dbError.message)

    // Limpiar archivos subidos si falla el registro en BD
    if (uploadedFiles.length > 0) {
      console.log(`[upload-app] Cleaning up ${uploadedFiles.length} orphaned files...`)
      const pathsToDelete = uploadedFiles
      await supabase.storage.from('apps').remove(pathsToDelete)
    }

    if (dbError.code === '23503') {
      return NextResponse.json(
        { error: 'La categoría seleccionada ya no existe.' },
        { status: 422 },
      )
    }
    return NextResponse.json(
      { error: 'Error al registrar la aplicación en la base de datos.' },
      { status: 500 },
    )
  }

  // 15. Respuesta exitosa
  return NextResponse.json(
    {
      data: app,
      files: uploadedFiles.length,
      warnings:
        failedFiles.length > 0
          ? [`${failedFiles.length} archivo(s) no se pudieron subir: ${failedFiles.join(', ')}`]
          : undefined,
    },
    { status: 201 },
  )
}
