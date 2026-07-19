/**
 * GET /apps/[appSlug]/manifest.json — Web App Manifest dinámico
 *
 * Genera el manifest.json para cada app en su subdominio.
 * Esto permite que el navegador ofrezca "Instalar" como PWA.
 *
 * Leído desde el Service Worker (public/sw.js) para el scope de la app.
 */

import { NextResponse, type NextRequest } from 'next/server'
import { getPublicApplication } from '@/lib/applications/public-application'

export async function GET(
  _request: NextRequest,
  { params }: { params: { appSlug: string } },
) {
  const data = await getPublicApplication(params.appSlug)

  if (!data) {
    return new NextResponse('App no encontrada', { status: 404 })
  }

  const nombre = data.nombre || 'TE CUIDA'
  const shortName = nombre.length > 12 ? nombre.slice(0, 10) + '…' : nombre

  const manifest = {
    name: nombre,
    short_name: shortName,
    description: `${nombre} — Aplicación de bienestar ciudadano de TE CUIDA`,
    start_url: `/apps/${params.appSlug}`,
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: data.brand_color || '#4f46e5',
    orientation: 'portrait-primary',
    scope: `/apps/${params.appSlug}`,
    icons: data.thumbnail_url
      ? [
          {
            src: data.thumbnail_url,
            sizes: '192x192',
            type: 'image/png',
          },
        ]
      : [
          {
            src: '/favicon.ico',
            sizes: '48x48',
            type: 'image/x-icon',
          },
        ],
  }

  return NextResponse.json(manifest, {
    headers: {
      'Content-Type': 'application/manifest+json',
    },
  })
}
