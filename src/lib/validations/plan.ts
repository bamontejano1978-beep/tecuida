/**
 * Esquemas Zod para DTOs de planes de suscripción.
 *
 * Requisitos: 16.1, 16.2
 */
import { z } from 'zod'

// Slugs reservados que no pueden usarse como nombre de plan
const RESERVED_PLAN_SLUGS = ['admin', 'www', 'api', 'static', 'assets', 'default'] as const

/**
 * Esquema para crear un nuevo plan de suscripción.
 */
export const CreatePlanSchema = z.object({
  slug: z
    .string()
    .min(2, 'El slug debe tener al menos 2 caracteres')
    .regex(/^[a-z0-9-]+$/, 'El slug solo puede contener minúsculas, números y guiones')
    .refine(
      (val) => !(RESERVED_PLAN_SLUGS as readonly string[]).includes(val),
      { message: 'Este identificador de plan está reservado' },
    ),
  nombre: z.string().min(1, 'El nombre del plan no puede estar vacío'),
  descripcion: z.string().optional().nullable(),
  precio_mensual: z
    .number()
    .min(0, 'El precio no puede ser negativo')
    .optional()
    .nullable(),
  max_ciudadanos: z
    .number()
    .int('Debe ser un número entero')
    .positive('Debe ser mayor que 0')
    .optional()
    .nullable(),
  activo: z.boolean().optional().default(true),
  orden: z.number().int().min(0).optional().default(0),
})

export type CreatePlanDTO = z.infer<typeof CreatePlanSchema>

/**
 * Esquema para actualizar un plan existente.
 * Todos los campos son opcionales (PATCH semántico).
 */
export const UpdatePlanSchema = z.object({
  nombre: z.string().min(1).optional(),
  descripcion: z.string().optional().nullable(),
  precio_mensual: z.number().min(0).optional().nullable(),
  max_ciudadanos: z.number().int().positive().optional().nullable(),
  activo: z.boolean().optional(),
  orden: z.number().int().min(0).optional(),
})

export type UpdatePlanDTO = z.infer<typeof UpdatePlanSchema>

/**
 * Esquema para sincronizar las aplicaciones incluidas en un plan.
 */
export const SyncPlanApplicationsSchema = z.object({
  application_ids: z
    .array(z.string().uuid('Cada application_id debe ser un UUID válido'))
    .min(0),
})

export type SyncPlanApplicationsDTO = z.infer<typeof SyncPlanApplicationsSchema>

/**
 * Esquema para asignar un plan a un municipio.
 *
 * Modos de sincronización:
 *   - 'preserve_extras': añade apps del plan, preserva las que el admin
 *     haya añadido manualmente como extras.
 *   - 'strict': añade apps del plan Y elimina las apps manuales que
 *     NO estén en el plan (municipio limitado estrictamente al plan).
 *   - 'reset': mismo que 'strict' pero con confirmación explícita.
 */
export const AssignPlanSchema = z.object({
  plan_id: z
    .string()
    .uuid('El plan_id debe ser un UUID válido')
    .nullable(), // null = quitar plan (apps manuales)
  sync_mode: z
    .enum(['preserve_extras', 'strict', 'reset'])
    .optional()
    .default('preserve_extras'),
})

export type AssignPlanDTO = z.infer<typeof AssignPlanSchema>
