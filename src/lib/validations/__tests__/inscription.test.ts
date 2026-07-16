/**
 * Tests para el InscriptionSchema (POST /api/activities/[id]/inscription).
 *
 * Cubre el contrato que el RPC inscribir_actividad (migration 044) espera:
 *   - email: trim + lowercase + formato válido
 *   - nombre: opcional, '', undefined → undefined; <= 120 chars
 *   - notas: opcional, '', undefined → undefined; <= 1000 chars
 *
 * La atomicidad de la transacción SQL se testea via DB integration tests
 * (no cubiertos aquí — Jest de TS no toca Postgres). Lo que sí probamos
 * aquí es que ningún payload mal formado llega al RPC.
 */

import { InscriptionSchema } from '../activity'

describe('InscriptionSchema', () => {
  describe('email', () => {
    it('acepta email válido y lo normaliza a lowercase + trim', () => {
      const r = InscriptionSchema.safeParse({
        email: '  Juan@TeCuida.app  ',
      })
      expect(r.success).toBe(true)
      expect(r.data?.email).toBe('juan@tecuida.app')
    })

    it('rechaza email sin formato válido', () => {
      const r = InscriptionSchema.safeParse({ email: 'no-es-email' })
      expect(r.success).toBe(false)
      expect(r.error?.issues[0].message).toMatch(/email/i)
    })

    it('rechaza email vacío', () => {
      const r = InscriptionSchema.safeParse({ email: '' })
      expect(r.success).toBe(false)
    })

    it('rechaza email ausente', () => {
      const r = InscriptionSchema.safeParse({})
      expect(r.success).toBe(false)
    })

    it('rechaza email > 120 chars', () => {
      const local = 'a'.repeat(130)
      const r = InscriptionSchema.safeParse({ email: `${local}@x.com` })
      expect(r.success).toBe(false)
    })
  })

  describe('nombre', () => {
    it('es opcional: undefined OK', () => {
      const r = InscriptionSchema.safeParse({ email: 'a@b.co' })
      expect(r.success).toBe(true)
      expect(r.data?.nombre).toBeUndefined()
    })

    it('string vacío se transforma a undefined', () => {
      const r = InscriptionSchema.safeParse({ email: 'a@b.co', nombre: '   ' })
      expect(r.success).toBe(true)
      expect(r.data?.nombre).toBeUndefined()
    })

    it('acepta nombre ≤ 120 chars trimmed', () => {
      const r = InscriptionSchema.safeParse({
        email: 'a@b.co',
        nombre: '  María López  ',
      })
      expect(r.success).toBe(true)
      expect(r.data?.nombre).toBe('María López')
    })

    it('rechaza nombre > 120 chars', () => {
      const r = InscriptionSchema.safeParse({
        email: 'a@b.co',
        nombre: 'x'.repeat(121),
      })
      expect(r.success).toBe(false)
    })
  })

  describe('notas', () => {
    it('es opcional: undefined OK', () => {
      const r = InscriptionSchema.safeParse({ email: 'a@b.co' })
      expect(r.success).toBe(true)
      expect(r.data?.notas).toBeUndefined()
    })

    it('string vacío se transforma a undefined', () => {
      const r = InscriptionSchema.safeParse({ email: 'a@b.co', notas: '' })
      expect(r.success).toBe(true)
      expect(r.data?.notas).toBeUndefined()
    })

    it('acepta notas multi-línea (whitespace preservado)', () => {
      const r = InscriptionSchema.safeParse({
        email: 'a@b.co',
        notas: 'Línea 1\nLínea 2\n  Línea 3',
      })
      expect(r.success).toBe(true)
      expect(r.data?.notas).toBe('Línea 1\nLínea 2\n  Línea 3')
    })

    it('rechaza notas > 1000 chars', () => {
      const r = InscriptionSchema.safeParse({
        email: 'a@b.co',
        notas: 'x'.repeat(1001),
      })
      expect(r.success).toBe(false)
    })
  })

  describe('payload completo válido', () => {
    it('acepta el happy path', () => {
      const r = InscriptionSchema.safeParse({
        email: 'Maria@TeCuida.APP',
        nombre: 'María López',
        notas: 'Tengo alergia al polen.\n¿Habráusize pausa?',
      })
      expect(r.success).toBe(true)
      expect(r.data).toEqual({
        email: 'maria@tecuida.app',
        nombre: 'María López',
        notas: 'Tengo alergia al polen.\n¿Habráusize pausa?',
      })
    })
  })

  describe('payload que el RPC rechazará con código INSC_*', () => {
    // El Zod schema sólo valida formato; la lógica de negocio
    // (tenant match, email-sesión match, aforo) la hace el RPC.
    // Aquí documentamos qué payloads cruzan Zod y llegan al RPC.
    it('email válido (mismatch con sesión) cruza Zod → INSC_EMAIL_MISMATCH en RPC', () => {
      const r = InscriptionSchema.safeParse({
        email: 'intruso@example.com',
      })
      expect(r.success).toBe(true)
    })
  })
})
