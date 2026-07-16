/**
 * Esquemas Zod para el marketplace de actividades (Fase 1).
 *
 * Validación aplicada en:
 *   - API routes admin (/api/admin/activities, /api/admin/professionals)
 *   - API route pública de inscripción (/api/activities/[id]/inscription)
 *
 * La migración 043 impone CHECK constraints idénticos a estos enums.
 *
 * Convenciones de cadena:
 *   - `.max()` SIEMPRE antes de `.refine()` (ZodString.max() → ZodString; ZodEffects no tiene .max())
 *   - Sin `.pipe()`: encadenamos `.transform()` + `.refine()` directamente
 *   - Cada `*Base` se mantiene como ZodObject sin refinements, para que
 *     `.partial()` funcione en `Update… = Base.partial().extend(...)`
 *   - Empty string → undefined vía `.transform((s) => (s === '' ? undefined : s))`
 *     y/o `z.union([z.literal(''), realSchema]).transform('')…→undefined`
 *   - Helpers opcionales terminan con `.optional()` (ZodEffects tiene ese método)
 */

import { z } from 'zod'

// ─────────────────────────────────────────────────────────────────────────
// Enums canónicos (deben coincidir con migrations/037_activities_marketplace.sql)
// ─────────────────────────────────────────────────────────────────────────

export const ACTIVITY_MODALIDAD = ['presencial', 'online', 'mixta'] as const
export const ACTIVITY_ESTADO = [
  'borrador',
  'pendiente_validacion',
  'publicada',
  'rechazada',
  'cancelada',
  'finalizada',
] as const
export const INSCRIPTION_ESTADO = [
  'confirmada',
  'asistio',
  'cancelada',
  'no_asistio',
] as const
export const PROFESSIONAL_TIPO = [
  'colegiado',
  'asociacion',
  'centro',
  'profesional_autonomo',
  'otro',
] as const
export const PROFESSIONAL_ESTADO = ['activo', 'inactivo'] as const

// ─────────────────────────────────────────────────────────────────────────
// Helpers ultra-simples (sin .pipe; .max() antes de .refine(); .optional() al final)
// ─────────────────────────────────────────────────────────────────────────

const Trimmed = z.string().transform((s) => s.trim())

const requiredText = (max: number, label: string) =>
  Trimmed
    .refine((s) => s.length > 0, `${label} es obligatorio`)
    .refine((s) => s.length <= max, `${label} no puede superar los ${max} caracteres`)

// Acepta string con trim + (opcional: vacío o undefined → undefined).
const optionalText = (max: number) =>
  z
    .string()
    .max(max, `Máximo ${max} caracteres`)
    .transform((s) => s.trim())
    .refine((s) => s === '' || s.length <= max, `Máximo ${max} caracteres`)
    .transform((s) => (s === '' ? undefined : s))
    .optional()

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const emailTrimmedLower = z
  .string()
  .max(120, 'Email no puede superar los 120 caracteres')
  .transform((s) => s.trim().toLowerCase())
  .refine((v) => EMAIL_REGEX.test(v), 'Email no válido')

// URL flexible o estricta. `strict: true` exige http(s)://; sin flag, completa con `https://`.
const optionalUrl = (
  label: string,
  opts: { strict?: boolean } = {},
  max = 500,
) =>
  z
    .string()
    .max(max, `${label} no puede superar los ${max} caracteres`)
    .transform((s) => s.trim())
    .refine((s) => {
      if (s === '') return true
      const candidate = opts.strict
        ? s
        : s.startsWith('http')
          ? s
          : `https://${s}`
      try {
        new URL(candidate)
        return true
      } catch {
        return false
      }
    }, `${label} no válida`)
    .transform((s) => (s === '' ? undefined : s))
    .optional()

// Fecha YYYY-MM-DD válida (no anterior a hoy). Devuelve string.
const futureOrTodayDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha debe estar en formato YYYY-MM-DD')
  .refine((s) => !Number.isNaN(Date.parse(s)), 'Fecha no válida')

// Fecha YYYY-MM-DD opcional / '' → undefined.
const optionalDate = z
  .union([z.literal(''), futureOrTodayDate])
  .transform((v) => (v === '' ? undefined : v))
  .optional()

// Entero positivo opcional (abierto) o '' → undefined.
const optionalPositiveInt = (max: number, label: string) =>
  z
    .union([
      z.literal(''),
      z.coerce
        .number()
        .int(`${label} debe ser entero`)
        .positive(`${label} debe ser positivo`)
        .max(max, `${label} no puede superar ${max}`),
    ])
    .transform((v) => (v === '' ? undefined : v))
    .optional()

// ─────────────────────────────────────────────────────────────────────────
// PROFESSIONALS
// ─────────────────────────────────────────────────────────────────────────

const ProfessionalBase = z.object({
  nombre: requiredText(120, 'El nombre'),
  tipo: z.enum(PROFESSIONAL_TIPO, {
    errorMap: () => ({ message: 'Tipo de profesional no válido' }),
  }),
  numero_colegiado: optionalText(50),
  descripcion: optionalText(2000),
  foto_url: optionalUrl('URL de foto', { strict: true }),
  web_url: optionalUrl('URL web'),
  email: emailTrimmedLower,
  telefono: optionalText(20),
  verificado: z.boolean().default(false),
})

export const CreateProfessionalSchema = ProfessionalBase.refine(
  (data) => {
    if (data.tipo === 'colegiado') {
      return (
        typeof data.numero_colegiado === 'string' &&
        data.numero_colegiado.trim().length > 0
      )
    }
    return true
  },
  {
    message: 'Profesionales colegiados requieren número de colegiado',
    path: ['numero_colegiado'],
  },
)

export type CreateProfessionalDTO = z.infer<typeof CreateProfessionalSchema>

export const UpdateProfessionalSchema = ProfessionalBase.partial().extend({
  estado: z.enum(PROFESSIONAL_ESTADO).optional(),
})
export type UpdateProfessionalDTO = z.infer<typeof UpdateProfessionalSchema>

// ─────────────────────────────────────────────────────────────────────────
// ACTIVITIES
// ─────────────────────────────────────────────────────────────────────────

const ActivityBase = z.object({
  professional_id: z.string().uuid('ID de profesional no válido'),
  category_id: z.string().uuid('Categoría no válida'),
  nombre: requiredText(120, 'Nombre de la actividad'),
  descripcion: requiredText(2000, 'Descripción'),
  thumbnail_url: optionalUrl('URL de miniatura', { strict: true }),
  modalidad: z.enum(ACTIVITY_MODALIDAD, {
    errorMap: () => ({ message: 'Modalidad no válida' }),
  }),
  fecha_inicio: futureOrTodayDate,
  fecha_fin: optionalDate,
  horario_texto: optionalText(120),
  direccion_texto: optionalText(300),
  url_reunion: optionalUrl('URL de reunión'),
  aforo: optionalPositiveInt(100_000, 'Aforo'),
  precio_texto: optionalText(100),
  nota_pago: optionalText(2000),
  impacto_objetivo: optionalText(500),
  impacto_beneficiarios_estimados: z
    .union([
      z.literal(''),
      z.coerce.number().int().nonnegative().max(10_000_000),
    ])
    .transform((v) => (v === '' ? undefined : v))
    .optional(),
  impacto_ambito: optionalText(300),
  impacto_indicadores: optionalText(500),
  destacada: z.boolean().default(false),
})

export const CreateActivitySchema = ActivityBase.refine(
  (data) => {
    if (data.modalidad === 'presencial' || data.modalidad === 'mixta') {
      return (
        typeof data.direccion_texto === 'string' &&
        data.direccion_texto.trim().length > 0
      )
    }
    return true
  },
  {
    message: 'Actividades presenciales/mixtas requieren dirección',
    path: ['direccion_texto'],
  },
)
  .refine(
    (data) => {
      if (data.modalidad === 'online' || data.modalidad === 'mixta') {
        return (
          typeof data.url_reunion === 'string' &&
          data.url_reunion.trim().length > 0
        )
      }
      return true
    },
    {
      message: 'Actividades online/mixtas requieren URL de reunión',
      path: ['url_reunion'],
    },
  )
  .refine(
    (data) => {
      if (data.fecha_fin && data.fecha_inicio) {
        return new Date(data.fecha_fin) >= new Date(data.fecha_inicio)
      }
      return true
    },
    {
      message: 'La fecha de fin debe ser igual o posterior a la fecha de inicio',
      path: ['fecha_fin'],
    },
  )

export type CreateActivityDTO = z.infer<typeof CreateActivitySchema>

export const UpdateActivitySchema = ActivityBase.partial().extend({
  estado: z.enum(ACTIVITY_ESTADO).optional(),
  motivo_rechazo: optionalText(1000),
  motivo_cancelacion: optionalText(1000),
})
export type UpdateActivityDTO = z.infer<typeof UpdateActivitySchema>

// ─────────────────────────────────────────────────────────────────────────
// INSCRIPTIONS (fase 1 sin pago)
// ─────────────────────────────────────────────────────────────────────────

export const InscriptionSchema = z.object({
  email: emailTrimmedLower,
  nombre: optionalText(120),
  notas: optionalText(1000),
})

export type InscriptionDTO = z.infer<typeof InscriptionSchema>

// ─────────────────────────────────────────────────────────────────────────
// Query params: filtros de catálogo público
// ─────────────────────────────────────────────────────────────────────────

export const ActivityListQuerySchema = z.object({
  categoria_id: z.string().uuid().optional(),
  modalidad: z.enum(ACTIVITY_MODALIDAD).optional(),
  q: z
    .string()
    .transform((s) => s.trim())
    .refine((s) => s.length > 0, 'Texto de búsqueda no puede estar vacío')
    .refine((s) => s.length <= 120, 'Máximo 120 caracteres')
    .optional(),
  destacada: z.coerce.boolean().optional(),
  limit: z.coerce.number().int().positive().max(100).default(50),
  offset: z.coerce.number().int().nonnegative().default(0),
})

export type ActivityListQueryDTO = z.infer<typeof ActivityListQuerySchema>
