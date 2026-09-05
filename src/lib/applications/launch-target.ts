const INTEGRATED_ORIGINS = new Set([
  'https://organizatron-nine.vercel.app',
  'https://salud-adolescentes.vercel.app',
])

export function safeLaunchTarget(raw: string, origin: string): URL | null {
  try {
    if (raw.startsWith('//') || raw.includes('\\')) return null
    const target = new URL(raw, origin)
    if (target.username || target.password) return null
    if (target.protocol !== 'https:' && !(target.origin === origin && target.protocol === 'http:')) return null
    return target
  } catch { return null }
}

export function isIntegratedExternalApp(raw: string): boolean {
  try { return INTEGRATED_ORIGINS.has(new URL(raw).origin) } catch { return false }
}
