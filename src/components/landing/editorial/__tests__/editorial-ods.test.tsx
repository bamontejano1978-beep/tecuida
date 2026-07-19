import { render, screen } from '@testing-library/react'
import EditorialOds from '../editorial-ods'

describe('EditorialOds', () => {
  it('muestra únicamente los ODS aprobados por Villafranca', () => {
    render(<EditorialOds nombreMunicipio="Villafranca de los Barros" />)

    expect(screen.getAllByText(/^ODS \d+$/).map((node) => node.textContent)).toEqual([
      'ODS 3',
      'ODS 4',
      'ODS 5',
      'ODS 10',
      'ODS 11',
      'ODS 16',
      'ODS 17',
    ])
  })

  it('conserva el compromiso institucional solicitado', () => {
    const { container } = render(
      <EditorialOds nombreMunicipio="Villafranca de los Barros" />,
    )

    expect(container).toHaveTextContent(
      'Cuidar a las personas es construir el futuro de Villafranca de los Barros.',
    )
    expect(container).toHaveTextContent(
      'Alineada con la salud, la igualdad, la educación, la inclusión y un municipio más sostenible.',
    )
  })

  it('permite seleccionar los ODS desde la configuración municipal', () => {
    render(<EditorialOds nombreMunicipio="Zafra" odsNumbers={[1, 8, 13]} />)

    expect(screen.getAllByText(/^ODS \d+$/).map((node) => node.textContent)).toEqual([
      'ODS 1',
      'ODS 8',
      'ODS 13',
    ])
  })
})
