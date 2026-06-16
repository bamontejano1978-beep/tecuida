/**
 * Helper para obtener la URL pública de la landing de un municipio.
 *
 * Lógica:
 *   - Si el municipio tiene `dominio` almacenado (full hostname de producción),
 *     usarlo directamente. Ej: "calamonte.tecuida.es" → https://calamonte.tecuida.es
 *   - En caso contrario, fallback a ?tenant={slug} sobre el host actual
 *     (soportado por el middleware en localhost/127.0.0.1).
 *
 * Esto permite al admin previsualizar la landing sin tener que navegar
 * manualmente al subdominio o reconstruir la URL desde el slug.
 *
 * Uso:
 * ```ts
 * const url = getMunicipioLandingUrl({ slug, dominio })
 * <a href={url} target="_blank" rel="noopener noreferrer">Ver landing</a>
 * ```
 */

export interface LandingMunicipality {
  slug: string
  dominio: string | null | undefined
}

/** Strip http(s):// (cualquier scheme RFC) y whitespace al principio. */
const SCHEME_RE = /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//i

/**
 * Quita el esquema y whitespace al principio de un valor.
 * Útil para normalizar tanto campos de dominio en DB como
 * comparaciones client-side que reproducen la URL completa.
 */
export function cleanHostname(value: string | null | undefined): string {
  return (value ?? '').replace(SCHEME_RE, '').trim()
}

/**
 * Detecta si un string es un hostname válido (contiene un punto y
 * no contiene caracteres sospechosos de path/query).
 * Ya viene sin esquema (lo quita el caller).
 */
function looksLikeHostname(host: string): boolean {
  if (!host) return false
  if (host.includes('/') || host.includes('?') || host.includes(' ')) return false
  if (!host.includes('.')) return false
  return true
}

/**
 * Determina el protocolo (http/https) según el hostname.
 * localhost / 127.0.0.1 / *.local → http; resto → https.
 */
function protocolFor(host: string): 'http' | 'https' {
  if (
    host.startsWith('localhost') ||
    host.startsWith('127.') ||
    host.endsWith('.local')
  ) {
    return 'http'
  }
  return 'https'
}

/**
 * Computa la URL pública de la landing de un municipio.
 *
 * @param municipio Fila (o subset) de municipalities con al menos slug y dominio
 * @param currentHost Hostname del request actual (para fallback dev)
 * @returns URL absoluta apuntando a la landing pública
 */
export function getMunicipioLandingUrl(
  municipio: LandingMunicipality,
  currentHost?: string | null,
): string {
  const host = cleanHostname(municipio.dominio)

  if (looksLikeHostname(host)) {
    return `${protocolFor(host)}://${host}`
  }

  // Fallback dev: ?tenant=slug sobre el host actual
  if (currentHost && municipio.slug) {
    const base = `${protocolFor(currentHost)}://${currentHost}`
    return `${base}/?tenant=${encodeURIComponent(municipio.slug)}`
  }

  // Último recurso: ruta relativa con query param (el middleware aceptará el slug)
  return `/?tenant=${encodeURIComponent(municipio.slug)}`
}
