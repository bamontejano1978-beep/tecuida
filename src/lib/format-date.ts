/**
 * Date formatting helpers — sin locale dependency.
 *
 * `toLocaleDateString` depende de ICU/Node/browsers locales; en
 * serverless o edge runtimes puede dar resultados inconsistentes.
 * Estas funciones son puro JS y producen el mismo string en
 * server-rendering y client-rendering, evitando SSR/CSR mismatches
 * en Next.js sin necesidad de `suppressHydrationWarning`.
 */

const MESES_LARGO = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
]

const MESES_CORTO = [
  'ene', 'feb', 'mar', 'abr', 'may', 'jun',
  'jul', 'ago', 'sep', 'oct', 'nov', 'dic',
]

/**
 * Fecha YYYY-MM-DD → "DD de MMMM de YYYY" en es-ES.
 * Para hero del citizen (la ficha grande de la actividad).
 */
export function formatInlineDate(s: string): string {
  try {
    const d = new Date(s + 'T00:00:00')
    return `${d.getDate()} de ${MESES_LARGO[d.getMonth()]} de ${d.getFullYear()}`
  } catch {
    return s
  }
}

/**
 * ISO timestamp o YYYY-MM-DD → "DD MMM YYYY" (formato corto) en es-ES.
 * Para tablas admin donde el mes completo sería verboso.
 * Locale-independent, funciona edge/serverless.
 */
export function formatShortDate(s: string): string {
  try {
    const d = new Date(s.length === 10 ? s + 'T00:00:00' : s)
    return `${String(d.getDate()).padStart(2, '0')} ${MESES_CORTO[d.getMonth()]} ${d.getFullYear()}`
  } catch {
    return s
  }
}
