import { getApplicationEntryPath, isApplicationId } from '@/lib/application-links'

describe('application-links', () => {
  it('prefiere el slug como identificador público estable', () => {
    expect(getApplicationEntryPath({ id: 'app-id', app_slug: 'mindful30' })).toBe('/apps/mindful30')
  })

  it('usa el id como respaldo cuando la aplicación no tiene slug', () => {
    expect(getApplicationEntryPath({ id: 'bbbbbbbb-0000-4000-8000-000000000002' })).toBe(
      '/apps/bbbbbbbb-0000-4000-8000-000000000002',
    )
  })

  it('limpia y codifica el identificador', () => {
    expect(getApplicationEntryPath({ id: 'app-id', app_slug: ' mi app ' })).toBe('/apps/mi%20app')
  })

  it('distingue UUID válidos de slugs', () => {
    expect(isApplicationId('bbbbbbbb-0000-4000-8000-000000000002')).toBe(true)
    expect(isApplicationId('bbbbbbbb-0000-0000-0000-000000000002')).toBe(true)
    expect(isApplicationId('mindful30')).toBe(false)
  })
})
