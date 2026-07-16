/**
 * EditorialProgramsGrid — Cuadrícula plana de aplicaciones activas del municipio.
 *
 * Reemplaza el<CategoryBanners> (acordeón de categorías) en el layout editorial.
 * Muestra todos los programas activos como tarjetas de cuadrícula 3 columnas con
 * icono emoji, nombre y descripción, sin estados expandibles.
 *
 * Server Component. Datos: las mismas `validApps` ya calculadas en page.tsx
 * (sin hacer una segunda query).
 */

import Link from 'next/link'
import type { ApplicationType } from '@/types'
import styles from './editorial.module.css'

const ICON_BY_TYPE: Record<ApplicationType, string> = {
  programa: '🌿',
  herramienta: '🔧',
  encuesta: '📋',
  recurso: '📖',
}

export interface EditorialApp {
  id: string
  nombre: string
  descripcion: string | null
  thumbnail_url: string | null
  tipo: ApplicationType
  /** Slug externo de la app (mindful30.tecuida.group). Si existe, prefiere esa URL. */
  app_slug?: string | null
  /** URL externa directa (modo "URL externa" en create-form). */
  url_acceso?: string | null
}

export interface EditorialProgramsGridProps {
  apps: EditorialApp[]
  /** Color de acento fallido si no hay icono por tipo. */
  accent?: string
}

/**
 * Resuelve la URL final de cada card de programa.
 * Prioridad (idéntica al resto del repo, ver catalog-client.tsx / page.tsx
 * hacia /apps/[slug]):
 *   1. app_slug      → subdominio propio p. ej. "mindful30" → /apps/mindful30
 *   2. url_acceso    → URL externa cuando la app es externa (no rompe el
 *                      subdominio aunque venga informada por error humano)
 *   3. /app/<id>     → página interna genérica
 *
 * Importante: el orden correcto (slug primero) es lo que evita el bug histórico
 * de apps tipo='programa' huérfanas (ver migrations 029/031).
 */
function resolveHref(app: EditorialApp): string {
  if (app.app_slug) return `/apps/${app.app_slug}`
  if (app.url_acceso) return app.url_acceso
  return `/app/${app.id}`
}

/**
 * Acepta cualquier URL http(s) sin rechazar HTTPS por bug histórico.
 * Antes hacía `startsWith('http')` que era correcto, pero dejamos
 * explícito http:// | https:// para mayor seguridad tipográfica.
 */
function isAbsoluteHttpUrl(s: string | null): boolean {
  if (!s) return false
  return s.startsWith('http://') || s.startsWith('https://')
}

export default function EditorialProgramsGrid({
  apps,
  accent,
}: EditorialProgramsGridProps) {
  if (apps.length === 0) {
    return (
      <section id="programas" className={styles.programsGrid}>
        <p
          style={{
            gridColumn: '1 / -1',
            textAlign: 'center',
            color: '#3a4438',
            fontFamily: '"Segoe UI", Arial, sans-serif',
          }}
        >
          Aún no hay programas activos configurados para este municipio.
        </p>
      </section>
    )
  }

  return (
    <section id="programas" className={styles.programsGrid} aria-label="Programas del municipio">
      {apps.map((app) => {
        // isAbsoluteHttpUrl(null) → false, así que cuando entramos al img
          // sabemos que thumbnail_url es un string http(s) válido. Lo casteamos
          // a string para satisfacer el tipo React HTMLImageElement.src
          // (acepta `string | undefined`, no `string | null`).
          const icon = isAbsoluteHttpUrl(app.thumbnail_url) && app.thumbnail_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={app.thumbnail_url}
              alt={app.nombre}
              style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 12 }}
              loading="lazy"
            />
          ) : (
            <span aria-hidden="true">{ICON_BY_TYPE[app.tipo] || '📖'}</span>
          )

        return (
          <Link
            key={app.id}
            href={resolveHref(app)}
            className={styles.programCard}
            style={accent ? { borderLeft: `3px solid ${accent}` } : undefined}
          >
            <div className={styles.programIcon}>{icon}</div>
            <h3>{app.nombre}</h3>
            <p>{app.descripcion || 'Sin descripción disponible.'}</p>
          </Link>
        )
      })}
    </section>
  )
}
