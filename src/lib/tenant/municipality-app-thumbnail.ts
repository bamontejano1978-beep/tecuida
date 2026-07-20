/**
 * Resuelve la miniatura visible en superficies municipales.
 *
 * Este helper solo debe utilizarse en la landing y el catálogo del municipio.
 * La aplicación, su manifest y el resto de superficies siguen leyendo
 * `applications.thumbnail_url` directamente.
 */
export function getMunicipalityApplicationThumbnail(
  overrideUrl: string | null | undefined,
  globalUrl: string | null | undefined,
): string {
  return overrideUrl?.trim() || globalUrl?.trim() || ''
}
