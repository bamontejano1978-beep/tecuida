/**
 * EditorialTopbar — Topbar de la landing editorial (Villafranca)
 *
 * Renderiza la barra superior a 132 px con:
 *   - Logo apaisado (375 px) inyectado desde tenant.logo_url.
 *     Si no existe imagen → fallback a wordmark Georgia con la inicial.
 *   - Nav central con serif Georgia (links de scroll interno).
 *   - Escudo del ayuntamiento y hamburger derecho (sin menú desplegado:
 *     el scope del rediseño editorial sólo cubre la landing pública).
 *
 * Server Component. Estilos: editorial.module.css (skin aislado).
 */

import Link from 'next/link'
import type { MunicipalityConfig } from '@/types'
import styles from './editorial.module.css'

export interface EditorialTopbarProps {
  tenant: MunicipalityConfig
}

export default function EditorialTopbar({ tenant }: EditorialTopbarProps) {
  const inicial = tenant.nombre_municipio.charAt(0).toUpperCase()

  return (
    <header className={styles.topbar}>
      <Link href="/" className="no-underline" aria-label={`Inicio · ${tenant.nombre_municipio}`}>
        {tenant.logo_url ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={tenant.logo_url}
            alt={`Marca institucional · ${tenant.nombre_municipio}`}
            className={styles.logo}
            loading="eager"
          />
        ) : (
          <span className={styles.wordmark} aria-hidden="true">
            {inicial}
          </span>
        )}
      </Link>

      <nav className={styles.nav} aria-label="Navegación principal">
        <a href="#inicio" className={styles.navLink}>
          Inicio
        </a>
        <a href="#programas" className={styles.navLink}>
          Programas
        </a>
        <a href="#actividades" className={styles.navLink}>
          Actividades
        </a>
        <a href="#ods" className={styles.navLink}>
          ODS
        </a>
        <a href="#contacto" className={styles.navLink}>
          Contacto
        </a>
      </nav>

      <div className={styles.rightMenu}>
        {tenant.escudo_url && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={tenant.escudo_url}
            alt={`Escudo de ${tenant.nombre_ayuntamiento}`}
            className={styles.crest}
            loading="eager"
          />
        )}
        <Link href="/login" className={`${styles.navLink} ${styles.sansBtn}`}>
          Área ciudadana
        </Link>
        {/*
          El hamburger del mockup es puramente decorativo en este scope:
          el rediseño editorial sólo cubre la landing pública, sin
          drawer lateral. Lo renderizamos como elemento decorativo en
          lugar de un <button> no-op (que sería confuso para usuarios
          de TTS y un anti-patrón de a11y).
        */}
        <span
          className={styles.hamb}
          aria-hidden="true"
          role="presentation"
        >
          <span />
          <span />
          <span />
        </span>
      </div>
    </header>
  )
}
