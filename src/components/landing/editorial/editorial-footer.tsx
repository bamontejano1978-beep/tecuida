/**
 * EditorialFooter — Footer de la landing editorial (Villafranca)
 *
 * Versión editorial del pie: fondo `--text` (#15251e), tipografía Georgia
 * para el nombre del municipio y sans-serif para enlaces. Email y teléfono
 * se inyectan desde tenant (campos email_contacto / telefono_contacto,
 * añadidos en migración 035).
 *
 * Server Component. Estilos: editorial.module.css.
 */

import Link from 'next/link'
import type { MunicipalityConfig } from '@/types'
import styles from './editorial.module.css'

export interface EditorialFooterProps {
  tenant: MunicipalityConfig
}

function inferContactEmail(slug: string): string {
  return `info@${slug.replace(/-/g, '')}.es`
}

export default function EditorialFooter({ tenant }: EditorialFooterProps) {
  const email = tenant.email_contacto || inferContactEmail(tenant.slug)

  return (
    <footer id="contacto" className={styles.footer}>
      <div className={styles.footerInner}>
        {/* Columna identidad */}
        <div>
          <p className={styles.footerTitle}>
            {tenant.nombre_municipio} te cuida
          </p>
          <p>
            {tenant.textos_institucionales.pie_pagina ||
              `Una iniciativa del ${tenant.nombre_ayuntamiento} para el bienestar de la ciudadanía.`}
          </p>
        </div>

        {/* Columna navegación */}
        <div>
          <p className={styles.footerTitle} style={{ fontSize: 16 }}>
            Portal
          </p>
          <Link href="/login" className={styles.footerLink} style={{ display: 'block', marginTop: 4 }}>
            Iniciar sesión
          </Link>
          <Link href="/register" className={styles.footerLink} style={{ display: 'block', marginTop: 4 }}>
            Registrarse
          </Link>
          <Link href="/dashboard" className={styles.footerLink} style={{ display: 'block', marginTop: 4 }}>
            Mi panel
          </Link>
          <Link href="/privacidad" className={styles.footerLink} style={{ display: 'block', marginTop: 4 }}>
            Política de privacidad
          </Link>
        </div>

        {/* Columna contacto */}
        <div>
          <p className={styles.footerTitle} style={{ fontSize: 16 }}>
            {tenant.nombre_ayuntamiento}
          </p>
          <a href={`mailto:${email}`} className={styles.footerLink} style={{ display: 'block' }}>
            {email}
          </a>
          {tenant.telefono_contacto && (
            <span style={{ display: 'block', marginTop: 4 }}>{tenant.telefono_contacto}</span>
          )}
          <Link href="#inicio" className={styles.footerLink} style={{ display: 'block', marginTop: 4 }}>
            ↑ Volver arriba
          </Link>
        </div>
      </div>

      <div
        style={{
          maxWidth: 1120,
          margin: '24px auto 0',
          paddingTop: 18,
          borderTop: '1px solid rgba(255,255,255,0.08)',
          textAlign: 'center',
          fontSize: 13,
          color: 'rgba(255,255,255,0.5)',
        }}
      >
        © {new Date().getFullYear()} {tenant.nombre_ayuntamiento} — TE CUIDA
      </div>
    </footer>
  )
}
