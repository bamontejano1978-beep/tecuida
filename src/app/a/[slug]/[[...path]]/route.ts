/**
 * GET /a/[slug]/[[...path]]
 *
 * Sirve aplicaciones web subidas vía ZIP desde Supabase Storage.
 *
 * Comportamiento:
 *  - /a/mi-app          → sirve index.html de la app
 *  - /a/mi-app/about    → SPA fallback: sirve index.html (el router del SPA maneja /about)
 *  - /a/mi-app/app.js   → sirve el archivo estático app.js con Content-Type correcto
 *  - Archivo no encontrado → intenta index.html (SPA fallback), o 404
 *
 * Caché: static assets 24h immutable, HTML 1h.
 * Seguridad: acceso público (bucket público de Supabase Storage).
 */

import { createAdminClient } from '@/lib/supabase/server'
import { getContentType } from '@/lib/mime-types'
import { NextResponse, type NextRequest } from 'next/server'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Determina el Content-Type a partir de la extensión del archivo */
// (usa la utilidad compartida en @/lib/mime-types)

/** Determina si el path tiene extensión de archivo (es un asset estático) */
function isStaticAsset(filePath: string): boolean {
  const ext = filePath.split('.').pop()?.toLowerCase()
  return !!ext && ext !== 'html' && ext !== 'htm'
}

// ---------------------------------------------------------------------------
// GET handler
// ---------------------------------------------------------------------------

export async function GET(
  _request: NextRequest,
  { params }: { params: { slug: string; path?: string[] } },
): Promise<Response> {
  const { slug } = params
  const pathSegments = params.path ?? []
  const filePath = pathSegments.length > 0 ? pathSegments.join('/') : 'index.html'

  const supabase = createAdminClient()

  // 1. Intentar descargar el archivo solicitado
  const { data: fileData, error } = await supabase.storage
    .from('apps')
    .download(`${slug}/${filePath}`)

  if (!error && fileData) {
    // ¡Archivo encontrado! Servir con Content-Type y caché apropiados
    const contentType = getContentType(filePath)
    const isTextual =
      contentType.startsWith('text/') ||
      contentType === 'application/javascript' ||
      contentType === 'application/json' ||
      contentType === 'application/xml'
    const charset = isTextual ? '; charset=utf-8' : ''
    const cacheControl = isStaticAsset(filePath)
      ? 'public, max-age=86400, immutable'
      : 'public, max-age=3600'

    return new NextResponse(await fileData.arrayBuffer(), {
      headers: {
        'Content-Type': contentType + charset,
        'Cache-Control': cacheControl,
      },
    })
  }

  // 2. Archivo no encontrado → intentar servir index.html (SPA fallback)
  //    Esto permite que rutas como /a/mi-app/perfil funcionen en SPAs
  if (filePath !== 'index.html') {
    const { data: indexData, error: indexError } = await supabase.storage
      .from('apps')
      .download(`${slug}/index.html`)

    if (!indexError && indexData) {
      return new NextResponse(await indexData.text(), {
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'public, max-age=3600',
        },
      })
    }
  }

  // 3. Ni el archivo ni index.html existen → 404
  return new NextResponse('App not found', {
    status: 404,
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}
