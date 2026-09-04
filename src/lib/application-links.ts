/** Datos mínimos necesarios para construir la entrada estable de una app. */
export interface ApplicationEntryRef {
  id: string
  app_slug?: string | null
}

const DEFAULT_PUBLIC_ORIGIN = 'https://tecuida.group'

/** Devuelve el identificador publico estable de una aplicacion. */
export function getApplicationEntryIdentifier(app: ApplicationEntryRef): string {
  return app.app_slug?.trim() || app.id.trim()
}

/**
 * Devuelve la URL pública canónica de una aplicación dentro de Te Cuida.
 *
 * El catálogo nunca enlaza directamente al alojamiento final. La ruta
 * /apps/[identificador] actúa como registro estable y decide cómo presentar
 * o abrir la aplicación, aunque su proveedor o URL cambien más adelante.
 */
export function getApplicationEntryPath(app: ApplicationEntryRef): string {
  return `/apps/${encodeURIComponent(getApplicationEntryIdentifier(app))}`
}

/** Devuelve la URL publica absoluta que se puede compartir fuera del panel. */
export function getApplicationPublicUrl(
  app: ApplicationEntryRef,
  origin = DEFAULT_PUBLIC_ORIGIN,
): string {
  const cleanOrigin = origin.replace(/\/+$/, '')
  return `${cleanOrigin}${getApplicationEntryPath(app)}`
}

/** Permite que la ruta canónica use el UUID como respaldo cuando no hay slug. */
export function isApplicationId(value: string): boolean {
  return /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(value)
}
