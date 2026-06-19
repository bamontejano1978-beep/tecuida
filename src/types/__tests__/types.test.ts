/**
 * Tests de humo para verificar que los tipos TypeScript están correctamente definidos
 * y que el entorno Jest + TypeScript funciona.
 */
import {
  TenantNotFoundError,
  TenantSuspendedError,
  MunicipalityInactiveError,
  ValidationError,
  DatabaseError,
  RegistrationError,
} from '../index'
import type {
  MunicipalityConfig,
  CorporateColors,
  SubscriptionStatus,
  ProgramProgressSummary,
  AdminDashboardStats,
} from '../index'

describe('Tipos TypeScript — verificación de estructura', () => {
  it('CorporateColors contiene las cinco propiedades de color', () => {
    const colors: CorporateColors = {
      primary: '#003087',
      secondary: '#0070f3',
      accent: '#f5a623',
      background: '#ffffff',
      text: '#111111',
    }
    expect(Object.keys(colors)).toEqual(
      expect.arrayContaining(['primary', 'secondary', 'accent', 'background', 'text'])
    )
  })

  it('MunicipalityConfig incluye todos los campos requeridos', () => {
    const config: MunicipalityConfig = {
      id: '00000000-0000-0000-0000-000000000001',
      slug: 'calamonte',
      nombre_municipio: 'Calamonte',
      nombre_ayuntamiento: 'Ayuntamiento de Calamonte',
      dominio: 'calamonte.tecuida.group',
      escudo_url: 'https://example.com/escudo.png',
      logo_url: 'https://example.com/logo.png',
      hero_image_url: 'https://example.com/hero.jpg',
      colores_corporativos: {
        primary: '#003087',
        secondary: '#0070f3',
        accent: '#f5a623',
        background: '#ffffff',
        text: '#111111',
      },
      imagenes_municipio: [],
      textos_institucionales: {
        bienvenida: 'Bienvenido',
        descripcion: 'Portal municipal',
        pie_pagina: 'Pie de página',
      },
      modulos_activos: [],
      estado_suscripcion: 'activa',
    }
    expect(config.dominio).toBe('calamonte.tecuida.group')
    expect(config.estado_suscripcion).toBe('activa')
  })

  it('ProgramProgressSummary siempre puede representar el rango [0, 100]', () => {
    const empty: ProgramProgressSummary = {
      porcentaje_total: 0,
      lecciones_completadas: 0,
      lecciones_totales: 5,
      tiempo_total_segundos: 0,
      completado: false,
    }
    const complete: ProgramProgressSummary = {
      porcentaje_total: 100,
      lecciones_completadas: 5,
      lecciones_totales: 5,
      tiempo_total_segundos: 3600,
      completado: true,
    }
    expect(empty.porcentaje_total).toBeGreaterThanOrEqual(0)
    expect(complete.porcentaje_total).toBeLessThanOrEqual(100)
    expect(complete.lecciones_completadas).toBeLessThanOrEqual(complete.lecciones_totales)
  })

  it('AdminDashboardStats contiene todos los campos requeridos por el requisito 10.2', () => {
    const stats: AdminDashboardStats = {
      total_municipios: 10,
      municipios_activos: 8,
      total_ciudadanos: 1500,
      ciudadanos_activos_mes: 300,
      programas_completados_mes: 45,
      ingresos_mes: 2400,
    }
    expect(stats).toHaveProperty('total_municipios')
    expect(stats).toHaveProperty('municipios_activos')
    expect(stats).toHaveProperty('total_ciudadanos')
    expect(stats).toHaveProperty('ciudadanos_activos_mes')
    expect(stats).toHaveProperty('programas_completados_mes')
    expect(stats).toHaveProperty('ingresos_mes')
  })
})

describe('Errores de dominio', () => {
  it('TenantNotFoundError lleva el nombre correcto y el slug en el mensaje', () => {
    const err = new TenantNotFoundError('mimunicipyo')
    expect(err).toBeInstanceOf(Error)
    expect(err.name).toBe('TenantNotFoundError')
    expect(err.message).toContain('mimunicipyo')
  })

  it('TenantSuspendedError lleva el nombre correcto', () => {
    const err = new TenantSuspendedError('zafra')
    expect(err).toBeInstanceOf(Error)
    expect(err.name).toBe('TenantSuspendedError')
  })

  it('MunicipalityInactiveError lleva el nombre correcto', () => {
    const err = new MunicipalityInactiveError()
    expect(err).toBeInstanceOf(Error)
    expect(err.name).toBe('MunicipalityInactiveError')
  })

  it('ValidationError, DatabaseError y RegistrationError son instancias de Error', () => {
    expect(new ValidationError('slug inválido')).toBeInstanceOf(Error)
    expect(new DatabaseError('fallo DB')).toBeInstanceOf(Error)
    expect(new RegistrationError('email duplicado')).toBeInstanceOf(Error)
  })
})

describe('SubscriptionStatus — valores válidos', () => {
  it('SubscriptionStatus acepta los cuatro estados de suscripción', () => {
    const statuses: SubscriptionStatus[] = ['activa', 'suspendida', 'cancelada', 'prueba']
    expect(statuses).toHaveLength(4)
  })
})
