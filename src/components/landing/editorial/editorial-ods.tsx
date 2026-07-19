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
  /** Selección configurable de ODS (1–17). */
  odsNumbers?: number[]
}

const ODS_COLORS: Record<number, string> = {
  1: '#e5243b', 2: '#dda63a', 3: '#4c9f38', 4: '#c5192d', 5: '#ff3a21',
  6: '#26bde2', 7: '#fcc30b', 8: '#a21942', 9: '#fd6925', 10: '#dd1367',
  11: '#fd9d24', 12: '#bf8b2e', 13: '#3f7e44', 14: '#0a97d9', 15: '#56c02b',
  16: '#00689d', 17: '#19486a',
}

export default function EditorialOds({ nombreMunicipio, odsNumbers }: EditorialOdsProps) {
  const selectedOds = (odsNumbers?.length ? odsNumbers : ODS.map((item) => item.number))
    .filter((number, index, values) => number >= 1 && number <= 17 && values.indexOf(number) === index)
    .map((number) => ({ number, color: ODS_COLORS[number] }))

  return (
    <section id="ods" className={styles.panels} aria-label="Agenda 2030 y compromiso institucional">
      <div className={styles.panelsGrid}>
        <article id="agenda" className={styles.panel}>
          <h2>Agenda 2030</h2>
          <div className={styles.odsRow} aria-label="Objetivos de Desarrollo Sostenible prioritarios">
            {selectedOds.map((ods) => (
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
