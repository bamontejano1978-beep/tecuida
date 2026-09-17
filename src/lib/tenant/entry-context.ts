export const MUNICIPALITY_COOKIE = 'tecuida_municipality'

/**
 * Alias de subdominio → slug canónico (`municipalities.slug`).
 *
 * `municipalities.slug` no siempre coincide con el subdominio que circula en
 * carteles, QR y enlaces compartidos. Villafranca de los Barros se dio de alta
 * como `villafrancadelosbarros`, pero la forma con guiones
 * (`villafranca-de-los-barros`) también está publicada y responde; sin este
 * mapa, quien llegase por el alias veía el portal bien pero el alta fallaba
 * con "Municipio no encontrado." porque los route handlers resuelven el
 * municipio por su cuenta, sin pasar por el middleware.
 */
export const TENANT_SLUG_ALIASES: Record<string, string[]> = {
  'villafranca-de-los-barros': ['villafrancadelosbarros'],
  villafrancadelosbarros: ['villafranca-de-los-barros'],
}

/**
 * Devuelve el slug recibido seguido de sus alias conocidos, en orden de
 * preferencia. El primer candidato es siempre el slug tal cual llegó, para que
 * un municipio real nunca se resuelva como alias de otro.
 */
export function municipalitySlugCandidates(slug: string): string[] {
  return [slug, ...(TENANT_SLUG_ALIASES[slug] || [])]
}

export function validMunicipalitySlug(value: string | null | undefined): string | null {
  return value && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value) && value.length <= 100 ? value : null
}

export function municipalitySlugFromHost(host: string): string | null {
  const hostname = host.toLowerCase().split(':')[0].replace(/^www\./, '')
  if (!hostname.endsWith('.tecuida.group')) return null
  return validMunicipalitySlug(hostname.slice(0, -'.tecuida.group'.length))
}
