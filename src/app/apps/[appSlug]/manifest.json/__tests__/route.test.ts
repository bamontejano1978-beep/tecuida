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
      app_provider: 'tecuida',
      launch_mode: 'landing',
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

  it('genera una PWA propia para Mindful30 Cuidadores', async () => {
    mockedGetPublicApplication.mockResolvedValue({
      id: '22222222-0000-0000-0000-000000000055',
      app_slug: 'mindful30-cuidadores',
      nombre: 'Mindful30 Cuidadores',
      tipo: 'programa',
      descripcion: 'Autocuidado para cuidadores',
      thumbnail_url: null,
      brand_color: '#7c3aed',
      instrucciones: null,
      url_acceso: null,
      app_provider: 'tecuida',
      launch_mode: 'native',
      categoria_nombre: 'Bienestar',
    })

    const response = await GET(
      new Request('https://tecuida.group/apps/mindful30-cuidadores/manifest.json') as NextRequest,
      { params: { appSlug: 'mindful30-cuidadores' } },
    )
    const manifest = await response.json()

    expect(manifest.name).toBe('Mindful30 Cuidadores')
    expect(manifest.short_name).toBe('M30 Cuidadores')
    expect(manifest.background_color).toBe('#faf7ff')
    expect(manifest.icons[0].src).toBe('/mindful30-caregivers-icon-192.png')
  })

  it('genera una PWA propia para Reto30 con iconos independientes', async () => {
    mockedGetPublicApplication.mockResolvedValue({
      id: '11111111-0000-0000-0000-000000000030',
      app_slug: 'reto30',
      nombre: 'Reto30',
      tipo: 'programa',
      descripcion: 'Bienestar diario',
      thumbnail_url: null,
      brand_color: '#0f172a',
      instrucciones: null,
      url_acceso: null,
      app_provider: 'tecuida',
      launch_mode: 'native',
      categoria_nombre: 'Bienestar',
    })

    const response = await GET(
      new Request('https://tecuida.group/apps/reto30/manifest.json') as NextRequest,
      { params: { appSlug: 'reto30' } },
    )
    const manifest = await response.json()

    expect(manifest.name).toBe('Reto30 - Tu bienestar diario')
    expect(manifest.short_name).toBe('Reto30')
    expect(manifest.id).toBe('/apps/reto30/')
    expect(manifest.start_url).toBe('/apps/reto30/')
    expect(manifest.scope).toBe('/apps/reto30/')
    expect(manifest.background_color).toBe('#0f172a')
    expect(manifest.icons).toEqual([
      { src: '/reto30-icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/reto30-icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/reto30-icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ])
  })

  it('genera una PWA propia para Mindful30 con iconos independientes', async () => {
    mockedGetPublicApplication.mockResolvedValue({
      id: '11111111-0000-0000-0000-000000000056',
      app_slug: 'mindful30',
      nombre: 'Mindful30',
      tipo: 'programa',
      descripcion: 'Bienestar diario',
      thumbnail_url: null,
      brand_color: '#0f172a',
      instrucciones: null,
      url_acceso: null,
      app_provider: 'tecuida',
      launch_mode: 'native',
      categoria_nombre: 'Bienestar',
    })

    const response = await GET(
      new Request('https://tecuida.group/apps/mindful30/manifest.json') as NextRequest,
      { params: { appSlug: 'mindful30' } },
    )
    const manifest = await response.json()

    expect(manifest.name).toBe('Mindful30')
    expect(manifest.short_name).toBe('Mindful30')
    expect(manifest.id).toBe('/apps/mindful30/')
    expect(manifest.start_url).toBe('/apps/mindful30/')
    expect(manifest.scope).toBe('/apps/mindful30/')
    expect(manifest.icons).toEqual([
      { src: '/mindful30-icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/mindful30-icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/mindful30-icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ])
  })

  it('genera una PWA propia para Mindful30 Adolescentes', async () => {
    mockedGetPublicApplication.mockResolvedValue({
      id: '22222222-0000-0000-0000-000000000027',
      app_slug: 'mindful30-adolescentes',
      nombre: 'Mindful30 Adolescentes',
      tipo: 'programa',
      descripcion: 'Bienestar adolescente',
      thumbnail_url: null,
      brand_color: '#7c3aed',
      instrucciones: null,
      url_acceso: null,
      app_provider: 'tecuida',
      launch_mode: 'native',
      categoria_nombre: 'Bienestar',
    })

    const response = await GET(
      new Request('https://tecuida.group/apps/mindful30-adolescentes/manifest.json') as NextRequest,
      { params: { appSlug: 'mindful30-adolescentes' } },
    )
    const manifest = await response.json()

    expect(manifest.name).toBe('Mindful30 Adolescentes')
    expect(manifest.short_name).toBe('M30 Teens')
    expect(manifest.id).toBe('/apps/mindful30-adolescentes/')
    expect(manifest.theme_color).toBe('#7c3aed')
    expect(manifest.icons[0].src).toBe('/mindful30-icon-192.png')
  })

  it('genera una PWA propia para Mindful30 Infancia', async () => {
    mockedGetPublicApplication.mockResolvedValue({
      id: '22222222-0000-0000-0000-000000000062',
      app_slug: 'mindful30-infancia',
      nombre: 'Mindful30 Infancia',
      tipo: 'programa',
      descripcion: 'Crianza consciente para familias',
      thumbnail_url: '/mindful30-infancia-icon-512.png',
      brand_color: '#0090ff',
      instrucciones: null,
      url_acceso: 'https://mindful30-infancia.web.app/app',
      app_provider: 'firebase',
      launch_mode: 'redirect',
      categoria_nombre: 'Bienestar',
    })

    const response = await GET(
      new Request('https://tecuida.group/apps/mindful30-infancia/manifest.json') as NextRequest,
      { params: { appSlug: 'mindful30-infancia' } },
    )
    const manifest = await response.json()

    expect(manifest.name).toBe('Mindful30 Infancia')
    expect(manifest.short_name).toBe('M30 Infancia')
    expect(manifest.theme_color).toBe('#0090ff')
    expect(manifest.icons[0].src).toBe('/mindful30-infancia-icon-192.png')
  })

  it('genera una PWA propia para Economia Familiar', async () => {
    mockedGetPublicApplication.mockResolvedValue({
      id: '22222222-0000-0000-0000-000000000063',
      app_slug: 'family-gamification',
      nombre: 'Economia Familiar',
      tipo: 'herramienta',
      descripcion: 'Misiones y recompensas familiares',
      thumbnail_url: '/family-gamification-icon-512.png',
      brand_color: '#8b5cf6',
      instrucciones: null,
      url_acceso: null,
      app_provider: 'tecuida',
      launch_mode: 'native',
      categoria_nombre: 'Bienestar',
    })

    const response = await GET(
      new Request('https://tecuida.group/apps/family-gamification/manifest.json') as NextRequest,
      { params: { appSlug: 'family-gamification' } },
    )
    const manifest = await response.json()

    expect(manifest.name).toBe('Economia Familiar')
    expect(manifest.short_name).toBe('Economia Fam.')
    expect(manifest.theme_color).toBe('#8b5cf6')
    expect(manifest.icons[0].src).toBe('/family-gamification-icon-192.png')
  })

  it('genera una PWA propia para Focus Family', async () => {
    mockedGetPublicApplication.mockResolvedValue({
      id: '22222222-0000-0000-0000-000000000064',
      app_slug: 'organizatron',
      nombre: 'Focus Family',
      tipo: 'herramienta',
      descripcion: 'Organizacion familiar local-first',
      thumbnail_url: '/organizatron-icon-512.png',
      brand_color: '#7c3aed',
      instrucciones: null,
      url_acceso: 'https://organizatron-nine.vercel.app',
      app_provider: 'external',
      launch_mode: 'redirect',
      categoria_nombre: 'Bienestar',
    })

    const response = await GET(
      new Request('https://tecuida.group/apps/organizatron/manifest.json') as NextRequest,
      { params: { appSlug: 'organizatron' } },
    )
    const manifest = await response.json()

    expect(manifest.name).toBe('Focus Family')
    expect(manifest.short_name).toBe('Focus Family')
    expect(manifest.theme_color).toBe('#7c3aed')
    expect(manifest.icons[0].src).toBe('/organizatron-icon-192.png')
  })

  it('genera una PWA propia para Salud Adolescente', async () => {
    mockedGetPublicApplication.mockResolvedValue({
      id: '22222222-0000-0000-0000-000000000065',
      app_slug: 'salud-adolescentes',
      nombre: 'Salud Adolescente',
      tipo: 'programa',
      descripcion: 'Habitos saludables y habilidades para la vida',
      thumbnail_url: '/salud-adolescentes-icon-512.png',
      brand_color: '#090d16',
      instrucciones: null,
      url_acceso: 'https://salud-adolescentes.vercel.app',
      app_provider: 'external',
      launch_mode: 'redirect',
      categoria_nombre: 'Bienestar',
    })

    const response = await GET(
      new Request('https://tecuida.group/apps/salud-adolescentes/manifest.json') as NextRequest,
      { params: { appSlug: 'salud-adolescentes' } },
    )
    const manifest = await response.json()

    expect(manifest.name).toBe('Salud Adolescente')
    expect(manifest.short_name).toBe('Salud Joven')
    expect(manifest.theme_color).toBe('#090d16')
    expect(manifest.icons[0].src).toBe('/salud-adolescentes-icon-192.png')
  })
})
