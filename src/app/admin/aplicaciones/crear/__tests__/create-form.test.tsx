/**
 * Tests unitarios para `CreateApplicationForm` — Auto-switch de `tipo`.
 *
 * Bug origin: El formulario tenía `tipo='programa'` por defecto. Si el admin
 * elegía "URL externa" o "Subir ZIP" sin cambiar el tipo, la app quedaba
 * registrada como `programa` sin fila asociada en `programs` → 404 al hacer
 * click desde el dashboard.
 *
 * Fix UX (defensa en profundidad): `handleModeSwitch` ahora cambia el tipo
 * de `'programa'` a `'herramienta'` cuando se entra en modos de URL/ZIP.
 * Si el admin había puesto otro tipo a mano, NO cambia.
 *
 * Estos tests cubren los caminos críticos de ese helper.
 */

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import CreateApplicationForm from '../create-form'

// ─────────────────────────────────────────────────────────────────────────
// Mocks
// ─────────────────────────────────────────────────────────────────────────

// next/navigation: el componente llama a useRouter().push tras éxito.
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), refresh: jest.fn() }),
  redirect: jest.fn(),
}))

// next/link: pasar por alto para evitar warnings en jsdom.
jest.mock('next/link', () => {
  const MockLink = ({
    children,
    href,
    ...rest
  }: {
    children: React.ReactNode
    href: string
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  )
  MockLink.displayName = 'MockLink'
  return MockLink
})

// ─────────────────────────────────────────────────────────────────────────
// Fixtures
// ─────────────────────────────────────────────────────────────────────────

const categories = [
  { id: '11111111-0000-0000-0000-000000000001', nombre: 'Bienestar emocional' },
  { id: '22222222-0000-0000-0000-000000000002', nombre: 'Salud comunitaria' },
]

// ─────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────

describe('CreateApplicationForm — auto-switch de tipo al cambiar el modo de landing', () => {
  it("al pulsar 'URL externa' con tipo='programa' (default problemático) → cambia a 'herramienta' y muestra la nota ámbar", async () => {
    const user = userEvent.setup()
    render(<CreateApplicationForm categories={categories} />)

    // Estado inicial: tipo='programa' (default vulnerable al 404)
    const tipoSelect = screen.getByLabelText(/tipo/i) as HTMLSelectElement
    expect(tipoSelect.value).toBe('programa')
    expect(screen.queryByRole('status')).toBeNull()

    // El admin entra en modo 'URL externa' (default, pero simulamos el click)
    await user.click(screen.getByRole('button', { name: /URL externa/i }))

    // FIX aplicado: tipo pasa automáticamente a 'herramienta'
    expect(tipoSelect.value).toBe('herramienta')

    // Aparece la nota informativa con role=status para accesibilidad
    const note = screen.getByRole('status')
    expect(note).toHaveTextContent(/Ajustado a.+herramienta/i)
    expect(note).toHaveClass('bg-amber-50')
    expect(note).toHaveAttribute('aria-live', 'polite')
  })

  it("al pulsar 'Subir ZIP' con tipo='programa' (default problemático) → también cambia a 'herramienta'", async () => {
    const user = userEvent.setup()
    render(<CreateApplicationForm categories={categories} />)

    const tipoSelect = screen.getByLabelText(/tipo/i) as HTMLSelectElement
    expect(tipoSelect.value).toBe('programa')

    await user.click(screen.getByRole('button', { name: /Subir ZIP/i }))

    expect(tipoSelect.value).toBe('herramienta')
    expect(screen.getByRole('status')).toHaveTextContent(/Ajustado a.+herramienta/i)
  })

  it("con tipo='recurso' puesto manualmente, pulsar 'URL externa' → NO cambia el tipo y NO muestra nota", async () => {
    const user = userEvent.setup()
    render(<CreateApplicationForm categories={categories} />)

    const tipoSelect = screen.getByLabelText(/tipo/i) as HTMLSelectElement

    // El admin elige explícitamente 'recurso'
    await user.selectOptions(tipoSelect, 'recurso')
    expect(tipoSelect.value).toBe('recurso')
    expect(screen.queryByRole('status')).toBeNull()

    // Pulsa 'URL externa' — el helper debe respetar la elección manual
    await user.click(screen.getByRole('button', { name: /URL externa/i }))

    // El tipo NO debe haber cambiado
    expect(tipoSelect.value).toBe('recurso')

    // No debe haber nota de auto-ajuste
    expect(screen.queryByRole('status')).toBeNull()
  })

  it("cambiar manualmente el tipo después del auto-switch limpia la nota", async () => {
    const user = userEvent.setup()
    render(<CreateApplicationForm categories={categories} />)

    const tipoSelect = screen.getByLabelText(/tipo/i) as HTMLSelectElement

    // 1. Dispara el auto-switch pulsando 'URL externa' (default programa → herramienta)
    await user.click(screen.getByRole('button', { name: /URL externa/i }))
    expect(tipoSelect.value).toBe('herramienta')
    expect(screen.getByRole('status')).toBeInTheDocument()

    // 2. El admin decide usar 'encuesta' en lugar del tipo auto-asignado
    await user.selectOptions(tipoSelect, 'encuesta')
    expect(tipoSelect.value).toBe('encuesta')

    // 3. La nota debe haber desaparecido
    expect(screen.queryByRole('status')).toBeNull()
  })
})
