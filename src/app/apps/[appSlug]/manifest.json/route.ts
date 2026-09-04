import { NextResponse, type NextRequest } from 'next/server'
import { getPublicApplication } from '@/lib/applications/public-application'

export async function GET(
  _request: NextRequest,
  { params }: { params: { appSlug: string } },
) {
  const data = await getPublicApplication(params.appSlug)

  if (!data) return new NextResponse('App no encontrada', { status: 404 })

  const nombre = data.nombre || 'TE CUIDA'
  const slug = data.app_slug || params.appSlug
  const isReto30 = slug === 'reto30'
  const isMindful30 = slug === 'mindful30'
  const isCaregivers = slug === 'mindful30-cuidadores'
  const isAdolescents = slug === 'mindful30-adolescentes'
  const isInfancia = slug === 'mindful30-infancia'
  const isFamilyGamification = slug === 'family-gamification'
  const isOrganizatron = slug === 'organizatron'
  const isSaludAdolescentes = slug === 'salud-adolescentes'
  const appPath = `/apps/${params.appSlug}/`

  const pwaIdentity = isReto30
    ? {
        name: 'Reto30 - Tu bienestar diario',
        shortName: 'Reto30',
        description: '30 dias para cuidar tu mente, tu cuerpo y tus relaciones.',
        background: '#0f172a',
        theme: '#0f172a',
        icon: 'reto30-icon',
      }
    : isMindful30
      ? {
          name: 'Mindful30',
          shortName: 'Mindful30',
          description: '30 dias para cuidar tu mente, tu cuerpo y tus relaciones.',
          background: '#0f172a',
          theme: '#0f172a',
          icon: 'mindful30-icon',
        }
    : isCaregivers
      ? {
          name: 'Mindful30 Cuidadores',
          shortName: 'M30 Cuidadores',
          description: '30 dias de autocuidado para quienes cuidan de otras personas.',
          background: '#faf7ff',
          theme: '#7c3aed',
          icon: 'mindful30-caregivers-icon',
        }
      : isAdolescents
        ? {
            name: 'Mindful30 Adolescentes',
            shortName: 'M30 Teens',
            description: '30 dias de calma, autoestima y bienestar digital para adolescentes.',
            background: '#111827',
            theme: '#7c3aed',
            icon: 'mindful30-icon',
          }
        : isInfancia
          ? {
              name: 'Mindful30 Infancia',
              shortName: 'M30 Infancia',
              description: '30 dias de calma, vinculo y crianza consciente para familias.',
              background: '#ffffff',
              theme: '#0090ff',
              icon: 'mindful30-infancia-icon',
            }
          : isFamilyGamification
            ? {
                name: 'Economia Familiar',
                shortName: 'Economia Fam.',
                description: 'Misiones, monedas y recompensas para fomentar habitos familiares.',
                background: '#f7f4ff',
                theme: '#8b5cf6',
                icon: 'family-gamification-icon',
              }
            : isOrganizatron
              ? {
                  name: 'Focus Family',
                  shortName: 'Focus Family',
                  description: 'Pomodoro, planner y recompensas local-first para adolescentes y familias.',
                  background: '#111827',
                  theme: '#7c3aed',
                  icon: 'organizatron-icon',
                }
              : isSaludAdolescentes
                ? {
                    name: 'Salud Adolescente',
                    shortName: 'Salud Joven',
                    description: '30 dias de habilidades para la vida, bienestar digital y habitos saludables para adolescentes.',
                    background: '#090d16',
                    theme: '#090d16',
                    icon: 'salud-adolescentes-icon',
                  }
      : null

  const manifest = {
    name: pwaIdentity?.name || nombre,
    short_name: pwaIdentity?.shortName || (nombre.length > 12 ? `${nombre.slice(0, 10)}...` : nombre),
    description: pwaIdentity?.description || `${nombre} - Aplicacion de bienestar ciudadano de TE CUIDA`,
    id: appPath,
    start_url: appPath,
    scope: appPath,
    display: 'standalone',
    display_override: ['window-controls-overlay', 'standalone'],
    background_color: pwaIdentity?.background || '#ffffff',
    theme_color: pwaIdentity?.theme || data.brand_color || '#4f46e5',
    orientation: 'portrait-primary',
    lang: 'es',
    categories: ['health', 'lifestyle'],
    icons: pwaIdentity
      ? [
          { src: `/${pwaIdentity.icon}-192.png`, sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: `/${pwaIdentity.icon}-512.png`, sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: `/${pwaIdentity.icon}-maskable-512.png`, sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ]
      : data.thumbnail_url
        ? [{ src: data.thumbnail_url, sizes: '192x192', type: 'image/png' }]
        : [{ src: '/favicon.ico', sizes: '48x48', type: 'image/x-icon' }],
  }

  return NextResponse.json(manifest, {
    headers: {
      'Content-Type': 'application/manifest+json',
      'Cache-Control': 'public, max-age=0, must-revalidate',
    },
  })
}
