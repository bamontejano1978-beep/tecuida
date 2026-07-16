/**
 * EditorialHero — Hero editorial (Villafranca) con grid 35/65
 *
 * Render del contraste con el hero clásico (full-cover 100svh):
 *   - Layout grid con texto a la izquierda y foto a la derecha.
 *   - h1 33 px Georgia verde, h2 subtitle 25 px, p descriptivo 16.5 px.
 *   - Tags separadas por "•" (lo más fiel al HTML convertido).
 *   - Dos CTAs: uno outlined verde y otro filled verde-2.
 *   - Créditos CC-BY-SA de la foto (manteniendo el requisito legal
 *     que el AssetAttribution ya cubre en el hero clásico).
 *
 * Server Component. Estilos en editorial.module.css.
 */

import type { MunicipalityConfig } from '@/types'
import { AssetAttribution } from '../asset-attribution'
import styles from './editorial.module.css'

export interface EditorialHeroProps {
  tenant: MunicipalityConfig
  /** Mantenemos la firma coherente con la decisión del scope (header editorial) */
  previewTags?: string[]
  /** Subtítulo (h2). Default = textos_institucionales.bienvenida del tenant. */
  subtitle?: string
  /** Descripción (p). Default = textos_institucionales.descripcion del tenant. */
  body?: string
}

export default function EditorialHero({
  tenant,
  previewTags,
  subtitle,
  body,
}: EditorialHeroProps) {
  const fallbackSubtitle = subtitle || 'Bienestar, comunidad y participación'
  const fallbackBody =
    body ||
    tenant.textos_institucionales.descripcion ||
    `Programas y recursos para cuidar de las personas en ${tenant.nombre_municipio}.`

  const tagList =
    previewTags ?? ['Salud emocional', 'Comunidad', 'Familia', 'Cultura', 'Deporte']

  return (
    <section id="inicio" className={styles.hero}>
      <div className={styles.heroCopy}>
        <h1>{tenant.nombre_municipio}</h1>
        <h2>{fallbackSubtitle}</h2>

        <div className={styles.tags} aria-label="Áreas del portal">
          {tagList.map((tag, i) => (
            <span key={i} className={styles.tag}>
              {tag}
            </span>
          ))}
        </div>

        <p>{fallbackBody}</p>

        <div className={styles.actions}>
          <a href="#programas" className={styles.btn}>
            Conoce los programas
            <span className={styles.arrow} aria-hidden="true">
              →
            </span>
          </a>
          <a href="/register" className={`${styles.btn} ${styles.btnPrimary}`}>
            Únete al portal
            <span className={styles.arrow} aria-hidden="true">
              →
            </span>
          </a>
        </div>

        {/* Mantenemos la atribución CC-BY-SA si hay foto de hero cargada */}
        {tenant.hero_image_url && (
          <div style={{ marginTop: 16 }}>
            <AssetAttribution municipalityId={tenant.id} kind="hero" />
          </div>
        )}
      </div>

      <div
        className={styles.heroImg}
        style={{
          backgroundImage: tenant.hero_image_url
            ? `url(${tenant.hero_image_url})`
            : undefined,
        }}
        role="img"
        aria-label={`Vista de ${tenant.nombre_municipio}`}
      />
    </section>
  )
}
