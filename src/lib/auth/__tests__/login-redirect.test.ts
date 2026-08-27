import { getRoleAwareRedirect, getRoleHome } from '@/lib/auth/login-redirect'

describe('redirección posterior al login según rol', () => {
  it.each([
    ['ciudadano', '/dashboard'],
    ['admin_municipio', '/municipio/estadisticas'],
    ['superadmin', '/admin'],
  ] as const)('envía %s a su panel por defecto', (role, expected) => {
    expect(getRoleHome(role)).toBe(expected)
    expect(getRoleAwareRedirect(null, role)).toBe(expected)
  })

  it('impide que un gestor use un redirect hacia el panel superadmin', () => {
    expect(getRoleAwareRedirect('/admin/municipios', 'admin_municipio')).toBe(
      '/municipio/estadisticas',
    )
  })

  it('impide que un ciudadano use redirects administrativos', () => {
    expect(getRoleAwareRedirect('/admin', 'ciudadano')).toBe('/dashboard')
    expect(getRoleAwareRedirect('/municipio/codigos', 'ciudadano')).toBe('/dashboard')
  })

  it('conserva un redirect permitido y rechaza URLs externas', () => {
    expect(getRoleAwareRedirect('/dashboard/inscripciones', 'ciudadano')).toBe(
      '/dashboard/inscripciones',
    )
    expect(getRoleAwareRedirect('//evil.example', 'superadmin')).toBe('/admin')
    expect(getRoleAwareRedirect('/\\evil.example', 'superadmin')).toBe('/admin')
  })
})
