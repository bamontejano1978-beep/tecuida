import { safeLaunchTarget, isIntegratedExternalApp } from '../launch-target'
import { allowedHealthUrl, inspectApplication, type QualityApplication } from '../library-quality'
import { municipalitySlugFromHost, validMunicipalitySlug } from '@/lib/tenant/entry-context'

describe('Municipal entry and external applications', () => {
  test.each(['//evil.test', '/\\evil.test', 'javascript:alert(1)', 'https://user:pass@site.test', 'http://site.test'])('rejects unsafe launch target %s', (value) => {
    expect(safeLaunchTarget(value, 'https://tecuida.group')).toBeNull()
  })
  test('preserves configured paths without accepting external query credentials', () => {
    expect(safeLaunchTarget('/apps/reto30', 'https://tecuida.group')?.href).toBe('https://tecuida.group/apps/reto30')
    expect(isIntegratedExternalApp('https://organizatron-nine.vercel.app')).toBe(true)
    expect(isIntegratedExternalApp('https://organizatron-nine.vercel.app.evil.test')).toBe(false)
  })
  test.each(['http://127.0.0.1', 'https://127.0.0.1', 'https://169.254.169.254', 'https://tecuida.group.evil.test', 'https://user@tecuida.group'])('health checker rejects %s', (value) => {
    expect(allowedHealthUrl(value)).toBeNull()
  })
  test('resolves only municipal hosts, including www aliases', () => {
    expect(municipalitySlugFromHost('www.calamonte.tecuida.group')).toBe('calamonte')
    expect(municipalitySlugFromHost('tecuida-preview.vercel.app')).toBeNull()
    expect(municipalitySlugFromHost('www.tecuida.group')).toBeNull()
    expect(validMunicipalitySlug('../otro')).toBeNull()
  })
  test('flags missing descriptions and duplicate names or destinations', () => {
    const app: QualityApplication = { id: 'one', nombre: 'Economía Familiar', descripcion: '', thumbnail_url: null, app_slug: 'familia', url_acceso: 'https://tecuida.group/familia/', tipo: 'herramienta', launch_mode: 'redirect' }
    const issues = inspectApplication(app, [app, { ...app, id: 'two', nombre: 'Economia familiar', url_acceso: 'https://tecuida.group/familia' }])
    expect(issues).toContain('Falta la descripción de su función.')
    expect(issues.filter((issue) => issue.includes('duplicado'))).toHaveLength(1)
  })
})
