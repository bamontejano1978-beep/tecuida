/** Datos mínimos necesarios para construir la entrada estable de una app. */
export interface ApplicationEntryRef {
  id: string
  app_slug?: string | null
}

/**
 * Devuelve la URL pública canónica de una aplicación dentro de Te Cuida.
 *
 * El catálogo nunca enlaza directamente al alojamiento final. La ruta
 * /apps/[identificador] actúa como registro estable y decide cómo presentar
 * o abrir la aplicación, aunque su proveedor o URL cambien más adelante.
 */
export function getApplicationEntryPath(app: ApplicationEntryRef): string {
  const identifier = app.app_slug?.trim() || app.id.trim()
  return `/apps/${encodeURIComponent(identifier)}`
}

/** Permite que la ruta canónica use el UUID como respaldo cuando no hay slug. */
export function isApplicationId(value: string): boolean {
  return /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(value)
}
