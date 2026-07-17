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
  /** Subtítulo institucional (h2). */
  subtitle?: string
  /** Presentación principal de la plataforma. */
  intro?: string
  /** Descripción de los servicios y su propósito. */
  body?: string
}

export default function EditorialHero({
  tenant,
  previewTags,
  subtitle,
  intro,
  body,
}: EditorialHeroProps) {
  const fallbackSubtitle = subtitle || 'Sostenibilidad Social'
  const fallbackIntro =
    intro ||
    'Primera plataforma integral de sostenibilidad social centrada en el cuidado de las personas'
  const fallbackBody =
    body ||
    'Programas, recursos y herramientas para promover el bienestar, la salud, la prevención y la calidad de vida en todas las etapas'

  const tagList =
    previewTags ?? ['BIENESTAR', 'SOSTENIBILIDAD SOCIAL', 'FUTURO']

  return (
    <section id="inicio" className={styles.hero}>
      <div className={styles.heroCopy}>
        <h1>{tenant.nombre_municipio} TE CUIDA</h1>
        <h2>{fallbackSubtitle}</h2>

        <p>{fallbackIntro}</p>
        <p>{fallbackBody}</p>

        <div className={styles.tags} aria-label="Principios del portal">
          {tagList.map((tag, i) => (
            <span key={i} className={styles.tag}>
              {tag}
            </span>
          ))}
        </div>

        <div className={styles.actions}>
          <a href="#programas" className={`${styles.btn} ${styles.btnPrimary}`}>
            Ver programas
            <span className={styles.arrow} aria-hidden="true">
              →
            </span>
          </a>
          <a href="#ods" className={styles.btn}>
            Conocer la plataforma
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
