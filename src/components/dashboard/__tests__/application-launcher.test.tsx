import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ApplicationLauncher, { type LauncherApplication } from '../application-launcher'

function createApp(overrides: Partial<LauncherApplication> = {}): LauncherApplication {
  return {
    id: 'app-1',
    nombre: 'Mindful30 Adultos',
    descripcion: 'Programa para entrenar la atención y gestionar el estrés.',
    tipo: 'programa',
    appSlug: 'mindful30-adultos',
    thumbnailUrl: null,
    opened: false,
    progressPercent: null,
    ...overrides,
  }
}

describe('ApplicationLauncher', () => {
  it('filtra por estado, busca sin acentos y permite limpiar los filtros', async () => {
    const user = userEvent.setup()
    const applications = [
      createApp({
        id: 'app-opened',
        nombre: 'Gestión emocional',
        appSlug: 'gestion-emocional',
        opened: true,
        progressPercent: 40,
      }),
      createApp({
        id: 'app-new',
        nombre: 'Guía de sueño',
        appSlug: 'guia-sueno',
        descripcion: 'Rutinas para dormir mejor.',
        tipo: 'recurso',
      }),
    ]

    render(
      <ApplicationLauncher
        applications={applications}
        municipalityId="municipio-1"
        municipalityName="Zafra"
        primaryColor="#4338ca"
      />,
    )

    expect(screen.getAllByText('2').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByRole('heading', { name: 'Gestión emocional' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Guía de sueño' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /En uso/ }))

    expect(screen.getByRole('heading', { name: 'Gestión emocional' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Guía de sueño' })).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Aplicaciones en uso' })).toBeInTheDocument()

    await user.clear(screen.getByRole('searchbox', { name: 'Buscar una aplicación' }))
    await user.type(screen.getByRole('searchbox', { name: 'Buscar una aplicación' }), 'gestion')

    expect(screen.getByRole('heading', { name: 'Gestión emocional' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Limpiar filtros' }))

    expect(screen.getByRole('heading', { name: 'Aplicaciones disponibles' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Gestión emocional' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Guía de sueño' })).toBeInTheDocument()
  })
})
