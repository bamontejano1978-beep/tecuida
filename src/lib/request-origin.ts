/** Construye un origen seguro sin confiar ciegamente en el header Host. */
export function getTrustedOrigin(request: Request): string {
  const baseDomain = (process.env.NEXT_PUBLIC_BASE_DOMAIN || 'tecuida.group')
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .split('/')[0]

  const rawHost = (request.headers.get('host') || new URL(request.url).host)
    .trim()
    .toLowerCase()
  const hostname = rawHost.replace(/:\d+$/, '')
  const isLocal = hostname === 'localhost' || hostname === '127.0.0.1'
  const isPlatformHost =
    hostname === baseDomain || hostname.endsWith(`.${baseDomain}`)

  if (isPlatformHost || (process.env.NODE_ENV !== 'production' && isLocal)) {
    return `${isLocal ? 'http' : 'https'}://${rawHost}`
  }

  const configuredSite = process.env.NEXT_PUBLIC_SITE_URL
  if (configuredSite) {
    try {
      return new URL(configuredSite).origin
    } catch {
      // La configuración inválida cae al dominio canónico.
    }
  }

  return `https://${baseDomain}`
}
