/**
 * EditorialOds — Agenda 2030 y compromiso institucional de Villafranca
 *
 * Reproduce la selección aprobada en el diseño municipal: ODS 3, 4, 5,
 * 10, 11, 16 y 17, además del texto institucional solicitado.
 *
 * Colores extraídos de los 17 SDG oficiales de Naciones Unidas:
 * https://www.un.org/sustainabledevelopment/es/news-and-resources/
 *
 * Server Component. Sin estado ni interactividad.
 */

import styles from './editorial.module.css'

interface OdsItem {
  number: number
  /** Hex oficial del SDG (Naciones Unidas). */
  color: string
}

const ODS: readonly OdsItem[] = [
  { number: 3, color: '#4c9f38' },
  { number: 4, color: '#c5192d' },
  { number: 5, color: '#ff3a21' },
  { number: 10, color: '#dd1367' },
  { number: 11, color: '#fd9d24' },
  { number: 16, color: '#00689d' },
  { number: 17, color: '#19486a' },
]

export interface EditorialOdsProps {
  /** Municipio destino (usado para personalizar el copy contextual). */
  nombreMunicipio: string
}

export default function EditorialOds({ nombreMunicipio }: EditorialOdsProps) {
  return (
    <section id="ods" className={styles.panels} aria-label="Agenda 2030 y compromiso institucional">
      <div className={styles.panelsGrid}>
        <article id="agenda" className={styles.panel}>
          <h2>Agenda 2030</h2>
          <div className={styles.odsRow} aria-label="Objetivos de Desarrollo Sostenible prioritarios">
            {ODS.map((ods) => (
              <span
                key={ods.number}
                className={styles.ods}
                style={{ backgroundColor: ods.color }}
              >
                ODS {ods.number}
              </span>
            ))}
          </div>
          <p>
            Alineada con la salud, la igualdad, la educación, la inclusión{' '}
            <br />
            y un municipio más sostenible.
          </p>
        </article>

        <article className={styles.panel}>
          <h2>Nuestro compromiso</h2>
          <p>
            Cuidar a las personas es construir{' '}
            <br />
            el futuro de {nombreMunicipio}.
          </p>
        </article>
      </div>
    </section>
  )
}
