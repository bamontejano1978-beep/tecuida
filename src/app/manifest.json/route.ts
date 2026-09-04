import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET() {
  const headersList = headers()
  const tenantName = headersList.get('x-tenant-name') || 'TE CUIDA'
  const tenantSlug = headersList.get('x-tenant-slug') || 'tecuida'
  const tenantPrimary = headersList.get('x-tenant-primary') || '#1e40af'

  const name = `${tenantName} - Aplicaciones municipales`
  const startUrl = '/dashboard/aplicaciones'

  return NextResponse.json(
    {
      id: `/launcher/${tenantSlug}`,
      name,
      short_name: tenantName.length > 18 ? tenantName.slice(0, 18) : tenantName,
      description:
        'Lanzadera de aplicaciones, programas y recursos municipales de TE CUIDA.',
      start_url: startUrl,
      scope: '/',
      display: 'standalone',
      display_override: ['window-controls-overlay', 'standalone', 'browser'],
      orientation: 'portrait-primary',
      background_color: '#f6f7fb',
      theme_color: tenantPrimary,
      categories: ['health', 'lifestyle', 'education'],
      lang: 'es',
      icons: [
        {
          src: '/reto30-icon-192.png',
          sizes: '192x192',
          type: 'image/png',
          purpose: 'any',
        },
        {
          src: '/reto30-icon-512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'any',
        },
        {
          src: '/reto30-icon-maskable-512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'maskable',
        },
      ],
      shortcuts: [
        {
          name: 'Mis aplicaciones',
          short_name: 'Apps',
          url: '/dashboard/aplicaciones',
        },
        {
          name: 'Actividades',
          short_name: 'Actividades',
          url: '/actividades',
        },
      ],
    },
    {
      headers: {
        'Content-Type': 'application/manifest+json',
        'Cache-Control': 'no-store',
      },
    },
  )
}
