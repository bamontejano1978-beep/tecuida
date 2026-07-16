/**
 * Tests para validations/activity.ts
 *
 * Cubre:
 *   - CreateProfessionalSchema (caso feliz, colegiado sin número, email inválido)
 *   - CreateActivitySchema (modalidad presencial/online/mixta, fechas, aforo)
 *   - UpdateActivitySchema parcial
 *   - InscriptionSchema (email)
 *   - ActivityListQuerySchema (defaults y filtros)
 */

import {
  CreateProfessionalSchema,
  CreateActivitySchema,
  UpdateActivitySchema,
  InscriptionSchema,
  ActivityListQuerySchema,
} from '@/lib/validations/activity'

describe('CreateProfessionalSchema', () => {
  it('acepta profesional autónomo sin número de colegiado', () => {
    const result = CreateProfessionalSchema.safeParse({
      nombre: 'María Guadalupe',
      tipo: 'profesional_autonomo',
      email: 'maria@example.com',
      verificado: false,
    })
    expect(result.success).toBe(true)
  })

  it('rechaza colegiado sin número de colegiado', () => {
    const result = CreateProfessionalSchema.safeParse({
      nombre: 'Dr. Lúz',
      tipo: 'colegiado',
      email: 'dr@example.com',
      verificado: false,
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes('numero_colegiado'))).toBe(true)
    }
  })

  it('rechaza email inválido', () => {
    const result = CreateProfessionalSchema.safeParse({
      nombre: 'X',
      tipo: 'centro',
      email: 'no-es-email',
      verificado: false,
    })
    expect(result.success).toBe(false)
  })

  it('strip() de espacios en nombre y email', () => {
    const result = CreateProfessionalSchema.safeParse({
      nombre: '   Asociación Acuérdate   ',
      tipo: 'asociacion',
      email: '  ACU@EX.com ',
      verificado: false,
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.nombre).toBe('Asociación Acuérdate')
      expect(result.data.email).toBe('acu@ex.com')
    }
  })
})

describe('CreateActivitySchema', () => {
  const baseActivity = {
    professional_id: '11111111-1111-1111-1111-111111111111',
    category_id: '22222222-2222-2222-2222-222222222222',
    nombre: 'Taller de memoria',
    descripcion: 'Para mayores del municipio.',
    modalidad: 'presencial' as const,
    fecha_inicio: '2026-09-01',
    direccion_texto: 'Centro cívico',
  }

  it('acepta presencial con dirección', () => {
    const result = CreateActivitySchema.safeParse(baseActivity)
    expect(result.success).toBe(true)
  })

  it('rechaza presencial sin dirección', () => {
    const result = CreateActivitySchema.safeParse({ ...baseActivity, direccion_texto: undefined })
    expect(result.success).toBe(false)
  })

  it('acepta online con URL', () => {
    const result = CreateActivitySchema.safeParse({
      ...baseActivity,
      modalidad: 'online',
      direccion_texto: undefined,
      url_reunion: 'https://meet.example.com/abc',
    })
    expect(result.success).toBe(true)
  })

  it('rechaza online sin URL', () => {
    const result = CreateActivitySchema.safeParse({
      ...baseActivity,
      modalidad: 'online',
      direccion_texto: undefined,
    })
    expect(result.success).toBe(false)
  })

  it('acepta mixta con dirección + URL', () => {
    const result = CreateActivitySchema.safeParse({
      ...baseActivity,
      modalidad: 'mixta',
      url_reunion: 'https://meet.example.com/abc',
    })
    expect(result.success).toBe(true)
  })

  it('rechaza fecha_fin anterior a fecha_inicio', () => {
    const result = CreateActivitySchema.safeParse({
      ...baseActivity,
      fecha_fin: '2026-08-01',
    })
    expect(result.success).toBe(false)
  })

  it('acepta fecha_fin igual a fecha_inicio (actividad de una sola jornada)', () => {
    const result = CreateActivitySchema.safeParse({
      ...baseActivity,
      fecha_fin: '2026-09-01',
    })
    expect(result.success).toBe(true)
  })

  it('acepta impacto_beneficiarios_estimados como número', () => {
    const result = CreateActivitySchema.safeParse({
      ...baseActivity,
      impacto_objetivo: 'Acompañamiento',
      impacto_beneficiarios_estimados: 120,
    })
    expect(result.success).toBe(true)
  })

  it('rechaza aforo negativo (en string y tras coerción)', () => {
    const result = CreateActivitySchema.safeParse({
      ...baseActivity,
      aforo: '-10',
    })
    expect(result.success).toBe(false)
  })

  it('transforms string empty to undefined en campos opcionales', () => {
    const result = CreateActivitySchema.safeParse({
      ...baseActivity,
      fecha_fin: '',
      horario_texto: '',
      url_reunion: '',
    })
    expect(result.success).toBe(true)
  })
})

describe('UpdateActivitySchema', () => {
  it('acepta parcial válido', () => {
    const result = UpdateActivitySchema.safeParse({ estado: 'cancelada', motivo_cancelacion: 'no procede' })
    expect(result.success).toBe(true)
  })
})

describe('InscriptionSchema', () => {
  it('acepta email válido', () => {
    const result = InscriptionSchema.safeParse({ email: 'ciudadano@example.com' })
    expect(result.success).toBe(true)
  })

  it('rechaza email inválido', () => {
    const result = InscriptionSchema.safeParse({ email: 'no-email' })
    expect(result.success).toBe(false)
  })
})

describe('ActivityListQuerySchema', () => {
  it('aplica defaults', () => {
    const result = ActivityListQuerySchema.safeParse({})
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.limit).toBe(50)
      expect(result.data.offset).toBe(0)
    }
  })

  it('coerción de limit y offset', () => {
    const result = ActivityListQuerySchema.safeParse({ limit: '25', offset: '50' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.limit).toBe(25)
      expect(result.data.offset).toBe(50)
    }
  })

  it('rechaza modalidad inválida', () => {
    const result = ActivityListQuerySchema.safeParse({ modalidad: 'voladora' })
    expect(result.success).toBe(false)
  })
})
