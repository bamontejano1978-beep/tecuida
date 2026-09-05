export const MUNICIPALITY_COOKIE = 'tecuida_municipality'

export function validMunicipalitySlug(value: string | null | undefined): string | null {
  return value && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value) && value.length <= 100 ? value : null
}

export function municipalitySlugFromHost(host: string): string | null {
  const hostname = host.toLowerCase().split(':')[0].replace(/^www\./, '')
  if (!hostname.endsWith('.tecuida.group')) return null
  return validMunicipalitySlug(hostname.slice(0, -'.tecuida.group'.length))
}
