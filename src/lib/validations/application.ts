/**
 * Esquemas Zod para DTOs del catalogo de aplicaciones.
 */
import { z } from 'zod'
import {
  APPLICATION_LAUNCH_MODES,
  APPLICATION_PROVIDERS,
} from '@/lib/application-runtime'

export const APPLICATION_TYPES = [
  'programa',
  'herramienta',
  'encuesta',
  'recurso',
] as const

export const CreateApplicationSchema = z.object({
  nombre: z
    .string()
    .min(1, 'El nombre de la aplicacion no puede estar vacio')
    .max(120, 'El nombre no puede superar los 120 caracteres'),
  descripcion: z
    .string()
    .min(1, 'La descripcion no puede estar vacia')
    .max(1000, 'La descripcion no puede superar los 1000 caracteres'),
  category_id: z
    .string()
    .uuid('La categoria debe ser un identificador valido'),
  thumbnail_url: z
    .string()
    .url('La miniatura debe ser una URL valida')
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
        if (val.startsWith('/')) return /^\/[a-zA-Z0-9_\-./]+$/.test(val)
        try {
          new URL(val)
          return true
        } catch {
          return false
        }
      },
      'Debe ser una URL valida o una ruta relativa (ej. /a/mi-app)',
    )
    .optional()
    .or(z.literal('').transform(() => undefined)),
  activa: z.boolean().default(true),
  app_slug: z
    .string()
    .regex(/^[a-z0-9-]+$/, 'Solo minusculas, numeros y guiones')
    .max(64, 'El slug no puede superar los 64 caracteres')
    .optional()
    .or(z.literal('').transform(() => undefined)),
  brand_color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Debe ser un color hex valido (ej. #7c3aed)')
    .max(7)
    .optional()
    .or(z.literal('').transform(() => undefined)),
  app_provider: z.enum(APPLICATION_PROVIDERS).default('tecuida').optional(),
  launch_mode: z.enum(APPLICATION_LAUNCH_MODES).default('landing').optional(),
})

export type CreateApplicationDTO = z.infer<typeof CreateApplicationSchema>

export const UpdateApplicationSchema = CreateApplicationSchema.partial()

export type UpdateApplicationDTO = z.infer<typeof UpdateApplicationSchema>
