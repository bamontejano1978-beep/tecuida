/**
 * Layout PWA — identidad visual propia de cada aplicación
 *
 * Cada app en su subdominio recibe:
 *   - Topbar con su nombre, tipo y color de marca
 *   - CSS variables dinámicas (--app-brand, --app-brand-light, etc.)
 *   - Fondo con gradiente sutil basado en su brand color
 *   - Manifest.json + Service Worker para instalabilidad PWA
 *
 * A diferencia del layout municipal (verde institucional, escudos, sellos),
 * cada app tiene SU propia paleta derivada de brand_color.
 */

import '@/app/globals.css'
import type { Metadata } from 'next'
import PwaRegister from './pwa-register'
import Link from 'next/link'
import { getPublicApplication } from '@/lib/applications/public-application'

// ---------------------------------------------------------------------------
// Helpers: derivar colores del brand_color
// ---------------------------------------------------------------------------

/** Colores por defecto según el tipo de app (cuando brand_color es null) */
const TYPE_COLORS: Record<string, string> = {
  programa: '#4f46e5',
  herramienta: '#2563eb',
  encuesta: '#d97706',
  recurso: '#059669',
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace('#', '')
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  }
}

function getAppColors(brandColor: string | null, appType: string) {
  const base = brandColor || TYPE_COLORS[appType] || '#4f46e5'
  const rgb = hexToRgb(base)

  return {
    '--app-brand': base,
    '--app-brand-rgb': `${rgb.r}, ${rgb.g}, ${rgb.b}`,
    '--app-brand-light': `${base}1a`,
    '--app-brand-medium': `${base}40`,
    '--app-brand-dark': `${base}dd`,
    '--app-brand-gradient-from': `${base}e6`,
    '--app-brand-gradient-to': `${base}99`,
  } as React.CSSProperties
}

// ---------------------------------------------------------------------------
// Metadata (manifest dinámico)
// ---------------------------------------------------------------------------

export async function generateMetadata({
  params,
}: {
  params: { appSlug: string }
}): Promise<Metadata> {
  const app = await getPublicApplication(params.appSlug)
  const slug = app?.app_slug || params.appSlug
  const isReto30 = slug === 'reto30'
  const isMindful30 = slug === 'mindful30'
  const isCaregivers = slug === 'mindful30-cuidadores'
  const isAdolescents = slug === 'mindful30-adolescentes'
  const isInfancia = slug === 'mindful30-infancia'
  const isFamilyGamification = slug === 'family-gamification'
  const isOrganizatron = slug === 'organizatron'
  const isSaludAdolescentes = slug === 'salud-adolescentes'
  const iconName = isReto30
    ? 'reto30-icon'
    : isMindful30 || isAdolescents
      ? 'mindful30-icon'
      : isCaregivers
        ? 'mindful30-caregivers-icon'
        : isInfancia
          ? 'mindful30-infancia-icon'
          : isFamilyGamification
            ? 'family-gamification-icon'
            : isOrganizatron
              ? 'organizatron-icon'
              : isSaludAdolescentes
                ? 'salud-adolescentes-icon'
                : null
  return {
    title: app?.nombre || 'Aplicación — TE CUIDA',
    description: app?.descripcion || 'Aplicación de bienestar ciudadano de TE CUIDA',
    manifest: `/apps/${params.appSlug}/manifest.json`,
    icons: iconName
      ? {
          icon: [
            { url: `/${iconName}-192.png`, sizes: '192x192', type: 'image/png' },
            { url: `/${iconName}-512.png`, sizes: '512x512', type: 'image/png' },
          ],
          apple: [{ url: `/${iconName}-192.png`, sizes: '192x192', type: 'image/png' }],
        }
      : undefined,
    appleWebApp: {
      capable: true,
      title: app?.nombre || 'TE CUIDA',
      statusBarStyle: 'black-translucent',
    },
  }
}

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

export default async function AppLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: { appSlug: string }
}) {
  const app = await getPublicApplication(params.appSlug)
  const appName = app?.nombre || 'Aplicación'
  const appType = app?.tipo || 'programa'
  const brandColor = app?.brand_color || null
  const slug = app?.app_slug || params.appSlug
  const isReto30 = slug === 'reto30'
  const isMindful30 = slug === 'mindful30'
  const isCaregivers = slug === 'mindful30-cuidadores'
  const isAdolescents = slug === 'mindful30-adolescentes'
  const isFamilyGamification = slug === 'family-gamification'

  if (isReto30 || isMindful30 || isCaregivers || isAdolescents || isFamilyGamification) {
    return (
      <div className={`reto30 min-h-screen antialiased ${isCaregivers ? 'bg-[#faf7ff] text-[#241233]' : 'bg-[#0f172a] text-[#f8fafc]'}`}>
        {children}
        <PwaRegister />
      </div>
    )
  }

  const colors = getAppColors(brandColor, appType)

  const typeLabel: Record<string, string> = {
    programa: 'Programa',
    herramienta: 'Herramienta',
    encuesta: 'Encuesta',
    recurso: 'Recurso',
  }

  return (
    <div style={colors} className="min-h-screen antialiased bg-[#fafafa] text-gray-900">
        {/* ── Topbar con identidad de app ── */}
        <header
          className="sticky top-0 z-50 backdrop-blur-xl border-b shadow-sm"
          style={{
            backgroundColor: `rgba(var(--app-brand-rgb), 0.06)`,
            borderColor: `rgba(var(--app-brand-rgb), 0.12)`,
          }}
        >
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 flex items-center justify-between h-14 gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div
                className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-white text-sm font-bold shadow-sm"
                style={{
                  background: `linear-gradient(135deg, var(--app-brand), var(--app-brand-gradient-to))`,
                }}
              >
                {appName.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">
                  {appName}
                </p>
                <p className="text-[11px] text-gray-500 font-medium uppercase tracking-wider">
                  {typeLabel[appType] || appType}
                </p>
              </div>
            </div>

            <Link
              href="/"
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors hover:bg-black/5 text-gray-500 hover:text-gray-700"
            >
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                aria-hidden="true"
                focusable="false"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
              </svg>
              Volver
            </Link>
          </div>
        </header>

        {children}

      <PwaRegister />
    </div>
  )
}
