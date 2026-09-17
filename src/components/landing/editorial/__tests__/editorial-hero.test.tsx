import { render, screen } from '@testing-library/react'
import type { MunicipalityConfig } from '@/types'
import EditorialHero from '../editorial-hero'

jest.mock('../../asset-attribution', () => ({
  AssetAttribution: () => null,
}))

const tenant = {
  id: 'municipality-1',
  nombre_municipio: 'Villafranca de los Barros',
  hero_image_url: 'https://example.com/hero.jpg',
} as MunicipalityConfig

describe('EditorialHero', () => {
  it('muestra el contenido institucional aprobado y en el orden correcto', () => {
    const { container } = render(<EditorialHero tenant={tenant} />)

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Villafranca de los Barros TE CUIDA',
    )
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(
      'Sostenibilidad Social',
    )
    expect(container).toHaveTextContent(
      'Primera plataforma integral de sostenibilidad social centrada en el cuidado de las personas',
    )
    expect(container).toHaveTextContent(
      'Programas, recursos y herramientas para promover el bienestar, la salud, la prevención y la calidad de vida en todas las etapas',
    )
    expect(screen.getAllByText(/^(BIENESTAR|SOSTENIBILIDAD SOCIAL|FUTURO)$/)).toHaveLength(3)
  })

  it('ofrece el alta como primera acción del hero', () => {
    render(<EditorialHero tenant={tenant} />)

    const register = screen.getByRole('link', { name: /crear cuenta gratis/i })
    expect(register).toHaveAttribute('href', '/register')
    // Primero en `.actions`: en móvil los botones se apilan a ancho completo,
    // así que el alta queda como la llamada más visible del hero.
    expect(register.parentElement?.children[0]).toBe(register)
  })

  it('acepta contenido editorial configurado desde administración', () => {
    const { container } = render(
      <EditorialHero
        tenant={tenant}
        subtitle="Municipio saludable"
        intro="Una estrategia propia"
        body="Programas adaptados a cada etapa vital"
        previewTags={['SALUD', 'CUIDADOS']}
      />,
    )

    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Municipio saludable')
    expect(container).toHaveTextContent('Una estrategia propia')
    expect(container).toHaveTextContent('Programas adaptados a cada etapa vital')
    expect(screen.getAllByText(/^(SALUD|CUIDADOS)$/)).toHaveLength(2)
  })
})
