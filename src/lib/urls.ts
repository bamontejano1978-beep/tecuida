/**
 * src/lib/urls.ts
 *
 * Normalización de URLs externas almacenadas en la BD
 * (campo `applications.url_acceso`).
 *
 * ─── Por qué existe ─────────────────────────────────────────────────────
 * En el form de admin de aplicaciones, los operadores suelen introducir
 * el dominio "en limpio" (p. ej. `"bienestar.example.com"` o
 * `"example.com/app"`) presuponiendo que el navegador completará el
 * scheme. La realidad:
 *
 *   · `<a href="example.com">` y `<Link href="example.com">` lo tratan
 *     como URL **RELATIVA**: el navegador resuelve bajo el origen actual
 *     → en nuestro caso la URL se evalúa contra el subdominio del tenant
 *     (`<municipio>.tecuida.group/example.com`) y cae en el flujo de
 *     middleware que termina en `/404`.
 *
 *   · Lo mismo ocurre si Next.js hace `router.push("example.com")` sin
 *     scheme: error de runtime con `Invalid href passed to next/router`.
 *
 * Este helper centraliza la corrección: antepone `https://` a todo lo
 * que parezca un host puro y deja intactos los scheme conocidos
 * (salvo los peligrosos — ver más abajo).
 *
 * ─── Reglas ─────────────────────────────────────────────────────────────
 *   1. null / undefined / sólo whitespace              → retorna `null`.
 *   2. Scheme peligroso (javascript:, data:, vbscript:, file:)
 *      detectado por el regex de scheme                 → retorna `null`
 *      (defensa anti-XSS; ver "Por qué" abajo).
 *   3. Scheme RFC-3986 válido (http, https, mailto, tel,
 *      sms, whatsapp, ftp, ssh, geo, etc.)             → retorna igual.
 *   4. Comienza por "/" o "//" (ruta o proto-relativa) → retorna igual.
 *   5. Comienza por "#" o "?" (anchor o query relativa)→ retorna igual.
 *   6. En otro caso (parece host: contiene ".", "localhost",
 *      IP, etc.)                                       → antepone
 *                                                          "https://".
 *
 * ─── Por qué bloqueamos javascript:/data:/vbscript:/file: ───────────────
 * El caller más habitual es un `<Link target="_blank" rel="noopener
 * noreferrer">` (catálogo y dashboard). `noopener` impide que la nueva
 * pestaña toque `window.opener`, pero NO impide que la propia URL
 * ejecute en su contexto: una `href="javascript:…"` sigue corriendo
 * en la pestaña destino. Si un operador (o un atacante vía SQL
 * injection) escribe `javascript:alert(1)` en `applications.url_acceso`,
 * cada click se la dispara a un visitante. Por seguridad devolvemos
 * `null` y la card cae al fallback `/app/<id>` interno.
 *
 * La división entre 3-4-5 y 6 es deliberada: si el operador decidió
 * escribir explícitamente una ruta relativa o un anchor, NO debemos
 * comernos su intención añadiendo un scheme encima.
 */

// RFC 3986: scheme = ALPHA *( ALPHA / DIGIT / "+" / "-" / "." )
const URI_SCHEME_REGEX = /^[a-z][a-z0-9+.\-]*:/i

/**
 * Schemes que pasan el regex de scheme pero no son apropiados como
 * `href` de navegación. Comparamos en minúsculas para tolerar
 * `JAVASCRIPT:`, `Javascript:`, etc.
 */
const DANGEROUS_SCHEMES: ReadonlySet<string> = new Set([
  'javascript:',
  'data:',
  'vbscript:',
  'file:',
])

/**
 * Devuelve una URL "segura" para usar como `href` externo, o `null` si
 * el valor original era vacío, sólo whitespace o apuntaba a un scheme
 * peligroso. La salida nunca es vacía cuando el input tampoco lo era.
 *
 * @example
 *   normalizeExternalUrl(null)                          // null
 *   normalizeExternalUrl("   ")                         // null
 *   normalizeExternalUrl("https://example.com")         // "https://example.com"
 *   normalizeExternalUrl("example.com")                 // "https://example.com"
 *   normalizeExternalUrl("sub.example.com:8080/x")      // "https://sub.example.com:8080/x"
 *   normalizeExternalUrl("localhost:3000")              // "https://localhost:3000"
 *   normalizeExternalUrl("mailto:a@b.com")              // "mailto:a@b.com"
 *   normalizeExternalUrl("/apps/mindful30")             // "/apps/mindful30"
 *   normalizeExternalUrl("//cdn.example.com/file")      // "//cdn.example.com/file"
 *   normalizeExternalUrl("#onboarding")                 // "#onboarding"
 *   normalizeExternalUrl("javascript:alert(1)")         // null   ← anti-XSS
 *   normalizeExternalUrl("JAVASCRIPT:alert(1)")         // null   ← case-insensitive
 *   normalizeExternalUrl("data:text/html,<script>...")  // null   ← anti-XSS
 */
export function normalizeExternalUrl(
  raw: string | null | undefined,
): string | null {
  if (raw == null) return null

  const trimmed = raw.trim()
  if (trimmed === '') return null

  // 2-3) Scheme presente → revisar primero si es peligroso, luego dejar pasar
  if (URI_SCHEME_REGEX.test(trimmed)) {
    const colonIdx = trimmed.indexOf(':') + 1
    const scheme = trimmed.slice(0, colonIdx).toLowerCase()
    if (DANGEROUS_SCHEMES.has(scheme)) return null
    return trimmed
  }

  // 4) Ruta relativa / proto-relativa / anchor / query relativa → respetar
  if (
    trimmed.startsWith('/') ||
    trimmed.startsWith('//') ||
    trimmed.startsWith('#') ||
    trimmed.startsWith('?')
  ) {
    return trimmed
  }

  // 6) Host puro → anteponer https://
  return `https://${trimmed}`
}
