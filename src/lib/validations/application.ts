/**
 * Esquemas Zod para DTOs del catálogo de aplicaciones.
 *
 * El catálogo `applications` contiene todas las apps que el
 * superadmin puede asignar a los municipios vía
 * `municipality_applications` o vía planes de suscripción.
 *
 * Validación: Req 14.1
 */
import { z } from 'zod'

// Tipos canónicos del enum de PostgreSQL (001_initial_schema.sql)
export const APPLICATION_TYPES = [
  'programa',
  'herramienta',
  'encuesta',
  'recurso',
] as const

/**
 * Esquema de validación para crear una nueva aplicación en el catálogo.
 */
export const CreateApplicationSchema = z.object({
  nombre: z
    .string()
    .min(1, 'El nombre de la aplicación no puede estar vacío')
    .max(120, 'El nombre no puede superar los 120 caracteres'),
  descripcion: z
    .string()
    .min(1, 'La descripción no puede estar vacía')
    .max(1000, 'La descripción no puede superar los 1000 caracteres'),
  category_id: z
    .string()
    .uuid('La categoría debe ser un identificador válido'),
  // thumbnail_url es opcional. Si llega cadena vacía desde el form, lo
  // transformamos a undefined para que el API rule haga `?? null` y grabe
  // NULL en la BD (NULL está documentado como "sin miniatura" en el form).
  thumbnail_url: z
    .string()
    .url('La miniatura debe ser una URL válida')
    .max(500, 'La URL no puede superar los 500 caracteres')
    .optional()
    .or(z.literal('').transform(() => undefined)),
  tipo: z.enum(APPLICATION_TYPES, {
    errorMap: () => ({
      message:
        'El tipo debe ser programa, herramienta, encuesta o recurso',
    }),
  }),
  instrucciones: z
    .string()
    .max(5000, 'Las instrucciones no pueden superar los 5000 caracteres')
    .optional()
    .or(z.literal('').transform(() => undefined)),
  url_acceso: z
    .string()
    .max(500, 'La URL no puede superar los 500 caracteres')
    .refine(
      (val) => {
        // Acepta URLs completas (https://...) o rutas relativas (/a/slug)
        if (val.startsWith('/')) return /^\/[a-zA-Z0-9_\-./]+$/.test(val)
        try {
          new URL(val)
          return true
        } catch {
          return false
        }
      },
      'Debe ser una URL válida o una ruta relativa (ej. /a/mi-app)',
    )
    .optional()
    .or(z.literal('').transform(() => undefined)),
  activa: z.boolean().default(true),
  app_slug: z
    .string()
    .regex(/^[a-z0-9-]+$/, 'Solo minúsculas, números y guiones')
    .max(64, 'El slug no puede superar los 64 caracteres')
    .optional()
    .or(z.literal('').transform(() => undefined)),
  brand_color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Debe ser un color hex válido (ej. #7c3aed)')
    .max(7)
    .optional()
    .or(z.literal('').transform(() => undefined)),
})

export type CreateApplicationDTO = z.infer<typeof CreateApplicationSchema>

/**
 * Esquema de validación para actualizar una aplicación existente.
 * Todos los campos son opcionales (PUT parcial).
 */
export const UpdateApplicationSchema = CreateApplicationSchema.partial()

export type UpdateApplicationDTO = z.infer<typeof UpdateApplicationSchema>
