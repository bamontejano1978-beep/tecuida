/**
 * Tests de la cabecera editorial (Villafranca de los Barros).
 *
 * La cabecera es sticky y en móvil (≤700 px) oculta el nav completo y el
 * enlace «Área ciudadana»; hasta ahora eso dejaba la portada sin ninguna
 * entrada al registro más allá del pie de página.
 */

import { render, screen } from '@testing-library/react'
import type { MunicipalityConfig } from '@/types'
import EditorialTopbar from '../editorial-topbar'

const tenant = {
  nombre_municipio: 'Villafranca de los Barros',
  nombre_ayuntamiento: 'Ayuntamiento de Villafranca de los Barros',
  logo_url: '',
  escudo_url: '',
} as MunicipalityConfig

describe('EditorialTopbar', () => {
  it('incluye un botón de alta en la cabecera', () => {
    render(<EditorialTopbar tenant={tenant} />)

    const register = screen.getByRole('link', { name: 'Crear cuenta' })
    expect(register).toHaveAttribute('href', '/register')
  })

  it('mantiene el acceso al área ciudadana', () => {
    render(<EditorialTopbar tenant={tenant} />)

    expect(screen.getByRole('link', { name: 'Área ciudadana' })).toHaveAttribute(
      'href',
      '/login',
    )
  })
})
