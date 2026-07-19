import type { NextRequest } from 'next/server'
import { GET } from '../route'
import { getPublicApplication } from '@/lib/applications/public-application'

jest.mock('@/lib/applications/public-application', () => ({
  getPublicApplication: jest.fn(),
}))

const mockedGetPublicApplication = getPublicApplication as jest.MockedFunction<typeof getPublicApplication>

describe('manifest público de aplicación', () => {
  it('usa el resolvedor compartido y funciona con un UUID', async () => {
    mockedGetPublicApplication.mockResolvedValue({
      id: 'bbbbbbbb-0000-0000-0000-000000000002',
      app_slug: null,
      nombre: 'Herramienta municipal',
      tipo: 'herramienta',
      descripcion: 'Descripción',
      thumbnail_url: null,
      brand_color: '#123456',
      instrucciones: null,
      url_acceso: 'https://example.com',
      categoria_nombre: 'Bienestar',
    })

    const response = await GET(
      new Request('https://tecuida.group/apps/bbbbbbbb-0000-0000-0000-000000000002/manifest.json') as NextRequest,
      { params: { appSlug: 'bbbbbbbb-0000-0000-0000-000000000002' } },
    )
    const manifest = await response.json()

    expect(response.status).toBe(200)
    expect(mockedGetPublicApplication).toHaveBeenCalledWith('bbbbbbbb-0000-0000-0000-000000000002')
    expect(manifest.name).toBe('Herramienta municipal')
    expect(manifest.theme_color).toBe('#123456')
    expect(manifest.start_url).toContain('/apps/bbbbbbbb-')
  })

  it('devuelve 404 cuando el registro no existe', async () => {
    mockedGetPublicApplication.mockResolvedValue(null)
    const response = await GET(
      new Request('https://tecuida.group/apps/no-existe/manifest.json') as NextRequest,
      { params: { appSlug: 'no-existe' } },
    )
    expect(response.status).toBe(404)
  })
})
