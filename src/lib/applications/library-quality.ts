export interface QualityApplication {
  id: string; nombre: string; descripcion: string | null; thumbnail_url: string | null
  app_slug: string | null; url_acceso: string | null; tipo: string; launch_mode: string | null
}
export const CUSTOM_NATIVE_APPS = new Set(['reto30', 'mindful30-cuidadores', 'family-gamification'])

function normalizedName(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '')
}
function normalizedUrl(value: string | null) {
  if (!value) return null
  try { const url = new URL(value); return `${url.origin}${url.pathname.replace(/\/$/, '')}` } catch { return value }
}
export function inspectApplication(app: QualityApplication, catalog: QualityApplication[]): string[] {
  const issues: string[] = []
  if (!app.descripcion?.trim()) issues.push('Falta la descripción de su función.')
  if (!app.thumbnail_url) issues.push('Falta el icono de la aplicación.')
  if (!app.app_slug) issues.push('Falta una dirección legible para la aplicación.')
  if (['redirect', 'embed'].includes(app.launch_mode || '') && !app.url_acceso) issues.push('Falta el enlace de acceso.')
  for (const other of catalog) {
    if (other.id === app.id) continue
    if (normalizedName(app.nombre) === normalizedName(other.nombre)
      || (app.app_slug && app.app_slug === other.app_slug)
      || (app.url_acceso && normalizedUrl(app.url_acceso) === normalizedUrl(other.url_acceso))) {
      issues.push(`Posible duplicado de «${other.nombre}».`)
    }
  }
  return issues
}

// Explicit origins prevent the health checker from requesting arbitrary/internal services.
export function allowedHealthUrl(raw: string): URL | null {
  try {
    const url = new URL(raw)
    if (url.username || url.password || url.protocol !== 'https:') return null
    return ['https://organizatron-nine.vercel.app', 'https://salud-adolescentes.vercel.app', 'https://tecuida.group'].includes(url.origin) ? url : null
  } catch { return null }
}
