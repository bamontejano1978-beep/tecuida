/**
 * EditorialOds — Bloque de los 17 Objetivos de Desarrollo Sostenible
 *
 * Decisión de scope: los 17 ODS viven hardcoded dentro del componente editorial
 * (no se modelan en BD para Villafranca-only). Si en el futuro otro municipio
 * quiere el bloque, basta con reusar este componente y/o pasar una lista de
 * ODS activos por props.
 *
 * Colores extraídos de los 17 SDG oficiales de Naciones Unidas:
 * https://www.un.org/sustainabledevelopment/es/news-and-resources/
 *
 * Server Component. Sin estado ni interactividad.
 */

import styles from './editorial.module.css'

interface OdsItem {
  number: number
  label: string
  /** Hex oficial del SDG (Naciones Unidas). */
  color: string
}

const ODS: readonly OdsItem[] = [
  { number: 1, label: 'Fin de la pobreza', color: '#e5243b' },
  { number: 2, label: 'Hambre cero', color: '#dda63a' },
  { number: 3, label: 'Salud y bienestar', color: '#4c9f38' },
  { number: 4, label: 'Educación de calidad', color: '#c5192d' },
  { number: 5, label: 'Igualdad de género', color: '#ff3a21' },
  { number: 6, label: 'Agua limpia', color: '#26bde2' },
  { number: 7, label: 'Energía asequible', color: '#fcc30b' },
  { number: 8, label: 'Trabajo decente', color: '#a21942' },
  { number: 9, label: 'Industria e innovación', color: '#fd6925' },
  { number: 10, label: 'Reducir desigualdades', color: '#dd1367' },
  { number: 11, label: 'Ciudades sostenibles', color: '#fd9d24' },
  { number: 12, label: 'Producción responsable', color: '#bf8b2e' },
  { number: 13, label: 'Acción por el clima', color: '#3f7e44' },
  { number: 14, label: 'Vida submarina', color: '#0a97d9' },
  { number: 15, label: 'Vida de ecosistemas', color: '#56c02b' },
  { number: 16, label: 'Paz y justicia', color: '#00689d' },
  { number: 17, label: 'Alianzas para los ODS', color: '#19486a' },
]

export interface EditorialOdsProps {
  /** Municipio destino (usado para personalizar el copy contextual). */
  nombreMunicipio: string
}

export default function EditorialOds({ nombreMunicipio }: EditorialOdsProps) {
  return (
    <section id="ods" className={styles.panels} aria-labelledby="ods-title">
      <h2 id="ods-title" className={styles.sectionTitle}>
        Alineados con los Objetivos de Desarrollo Sostenible
      </h2>
      <p className={styles.sectionLead}>
        Cada programa, actividad y recurso de {nombreMunicipio} te cuida trabaja sobre uno o varios
        de los 17 ODS de la Agenda 2030 de Naciones Unidas.
      </p>
      <div className={styles.odsRow}>
        {ODS.map((o) => (
          <div
            key={o.number}
            className={styles.ods}
            style={{ backgroundColor: o.color }}
            role="group"
            aria-label={`ODS ${o.number}: ${o.label}`}
          >
            <span className={styles.odsNumber}>{o.number}</span>
            <span className={styles.odsLabel}>{o.label}</span>
          </div>
        ))}
      </div>
    </section>
  )
}
