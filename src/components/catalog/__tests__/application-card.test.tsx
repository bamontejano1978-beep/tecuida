/**
 * Tests unitarios para ApplicationCard
 *
 * Verifica:
 *   - Renderizado del nombre, descripción, tipo, nivel, categoría
 *   - Enlace correcto a /app/:id
 *   - Fallback de descripción cuando no se proporciona
 *   - Renderizado condicional de categoría
 *   - CTA "Acceder →" siempre presente
 *   - Comportamiento con tipos y niveles desconocidos (fallback)
 */

import { render, screen } from '@testing-library/react'
import ApplicationCard from '../application-card'
import type { Application } from '@/types'

// ---------------------------------------------------------------------------
// Factories
// ---------------------------------------------------------------------------

/** Crea un Application válido de ejemplo (programa básico) */
function createApp(overrides: Partial<Application> = {}): Application {
  return {
    id: 'aaaaaaaa-0000-0000-0000-000000000001',
    nombre: 'Mindful30 Adultos',
    descripcion: 'Programa de 30 días de mindfulness.',
    categoria_id: '11111111-0000-0000-0000-000000000001',
    thumbnail_url: '',
    tipo: 'programa',
    activa: true,
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ApplicationCard', () => {
  // ─── Renderizado básico ───────────────────────────────────────

  it('renderiza el nombre de la aplicación', () => {
    const app = createApp({ nombre: 'Gestión del estrés' })
    render(<ApplicationCard application={app} />)

    expect(screen.getByRole('heading', { name: 'Gestión del estrés' })).toBeInTheDocument()
  })

  it('renderiza la descripción cuando existe', () => {
    const app = createApp({ descripcion: 'Aprende a gestionar el estrés diario.' })
    render(<ApplicationCard application={app} />)

    expect(screen.getByText('Aprende a gestionar el estrés diario.')).toBeInTheDocument()
  })

  it('muestra texto de fallback cuando la descripción está vacía', () => {
    const app = createApp({ descripcion: '' })
    render(<ApplicationCard application={app} />)

    expect(screen.getByText('Sin descripción disponible.')).toBeInTheDocument()
  })

  // ─── Enlace ───────────────────────────────────────────────────

  it('el enlace apunta a /app/:id', () => {
    const app = createApp({ id: 'bbbbbbbb-0000-0000-0000-000000000002' })
    render(<ApplicationCard application={app} />)

    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', '/app/bbbbbbbb-0000-0000-0000-000000000002')
  })

  // ─── Badges de tipo ────────────────────────────────────────

  it.each([
    ['programa', 'Programa'],
    ['herramienta', 'Herramienta'],
    ['encuesta', 'Encuesta'],
    ['recurso', 'Recurso'],
  ] as const)('muestra el badge de tipo "%s" como "%s"', (tipo, expectedLabel) => {
    const app = createApp({ tipo })
    render(<ApplicationCard application={app} />)

    // Hay 2 elementos con el mismo texto (badge + type label)
    expect(screen.getAllByText(expectedLabel).length).toBeGreaterThanOrEqual(1)
  })

  it('usa fallback "Programa" para un tipo desconocido', () => {
    const app = createApp({ tipo: 'otro' as Application['tipo'] })
    render(<ApplicationCard application={app} />)

    expect(screen.getByText('Programa')).toBeInTheDocument()
  })

  // ─── Tipos de aplicación ──────────────────────────────────────

  it.each([
    ['programa', 'Programa'],
    ['herramienta', 'Herramienta'],
    ['encuesta', 'Encuesta'],
    ['recurso', 'Recurso'],
  ] as const)('muestra la etiqueta de tipo "%s" como "%s" y renderiza un SVG', (tipo, expectedLabel) => {
    const app = createApp({ tipo })
    const { container } = render(<ApplicationCard application={app} />)

    // Hay 2 elementos con el mismo texto (badge + type label)
    expect(screen.getAllByText(expectedLabel).length).toBeGreaterThanOrEqual(1)
    // Verificar que el icono SVG se renderiza dentro del contenedor de icono
    const iconContainer = container.querySelector('.h-10.w-10')
    expect(iconContainer).toBeInTheDocument()
    expect(iconContainer!.querySelector('svg')).toBeInTheDocument()
  })

  it('muestra el texto raw como fallback para un tipo desconocido', () => {
    const app = createApp({ tipo: 'otro' as Application['tipo'] })
    render(<ApplicationCard application={app} />)

    expect(screen.getByText('otro')).toBeInTheDocument()
  })

  // ─── Categoría ────────────────────────────────────────────────

  it('muestra el nombre de categoría cuando se proporciona', () => {
    const app = createApp()
    render(<ApplicationCard application={app} categoryName="Bienestar emocional" />)

    expect(screen.getByText('Bienestar emocional')).toBeInTheDocument()
  })

  it('no muestra ninguna categoría cuando no se proporciona', () => {
    const app = createApp()
    render(<ApplicationCard application={app} />)

    // La categoría es opcional: solo deben verse el nombre, desc, tipo, nivel y CTA
    const footerTexts = screen.queryByText('Bienestar emocional')
    expect(footerTexts).not.toBeInTheDocument()
  })

  // ─── CTA ──────────────────────────────────────────────────────

  it('siempre muestra el CTA "Acceder →"', () => {
    const app = createApp()
    render(<ApplicationCard application={app} />)

    expect(screen.getByText('Acceder →')).toBeInTheDocument()
  })

  // ─── Varios elementos en la misma card ────────────────────────

  it('renderiza todos los elementos simultáneamente en una herramienta', () => {
    const app = createApp({
      id: 'cccccccc-0000-0000-0000-000000000003',
      nombre: 'Alimentación equilibrada',
      descripcion: 'Planes de alimentación y recetas saludables.',
      tipo: 'herramienta',
    })
    render(<ApplicationCard application={app} categoryName="Salud comunitaria" />)

    expect(screen.getByRole('heading', { name: 'Alimentación equilibrada' })).toBeInTheDocument()
    expect(screen.getByText('Planes de alimentación y recetas saludables.')).toBeInTheDocument()
    expect(screen.getAllByText('Herramienta')).toHaveLength(2)
    expect(screen.getByText('Salud comunitaria')).toBeInTheDocument()
    expect(screen.getByText('Acceder →')).toBeInTheDocument()

    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', '/app/cccccccc-0000-0000-0000-000000000003')
  })

  // ─── Snapshot ─────────────────────────────────────────────────

  it('coincide con el snapshot (estructura estable)', () => {
    const app = createApp()
    const { container } = render(
      <ApplicationCard application={app} categoryName="Bienestar emocional" />,
    )
    // Excluir SVGs del snapshot: son largos y cambian raramente
    container.querySelectorAll('svg').forEach((s) => s.remove())
    expect(container.firstChild).toMatchSnapshot()
  })
})
