export type LoginRole = 'ciudadano' | 'admin_municipio' | 'superadmin'

export function getRoleHome(role: LoginRole): string {
  if (role === 'superadmin') return '/admin'
  if (role === 'admin_municipio') return '/municipio/estadisticas'
  return '/dashboard'
}

export function getRoleAwareRedirect(raw: string | null, role: LoginRole): string {
  const fallback = getRoleHome(role)
  if (
    !raw ||
    !raw.startsWith('/') ||
    raw.includes('//') ||
    raw.includes('\\') ||
    raw.length > 500
  ) {
    return fallback
  }

  if (role !== 'superadmin' && (raw === '/admin' || raw.startsWith('/admin/'))) {
    return fallback
  }
  if (role === 'ciudadano' && (raw === '/municipio' || raw.startsWith('/municipio/'))) {
    return fallback
  }

  return raw
}
