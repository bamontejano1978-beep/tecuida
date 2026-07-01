/**
 * Esquemas Zod para DTOs relacionados con municipios.
 *
 * Valida: Requisito 11.5, 11.6, 13.1
 */
import { z } from 'zod'

// Palabras reservadas que no pueden usarse como slug (Req 11.5)
const RESERVED_SLUGS = ['admin', 'www', 'api', 'static', 'assets'] as const

// Validador de color hexadecimal (#RRGGBB)
const hexColorSchema = z
  .string()
  .regex(/^#[0-9A-Fa-f]{6}$/, 'Debe ser un color hexadecimal válido (#RRGGBB)')

// Sub-esquema de colores corporativos
const corporateColorsSchema = z.object({
  primary: hexColorSchema,
  secondary: hexColorSchema,
  accent: hexColorSchema,
  background: hexColorSchema,
  text: hexColorSchema,
})

// Sub-esquema de textos institucionales
const institutionalTextsSchema = z.object({
  bienvenida: z.string().optional(),
  descripcion: z.string().optional(),
  pie_pagina: z.string().optional(),
  // Títulos y contenidos configurables de la landing (P4)
  stats_titulo: z.string().optional(),
  stats_subtitulo: z.string().optional(),
  programas_titulo: z.string().optional(),
  programas_subtitulo: z.string().optional(),
  cta_titulo: z.string().optional(),
  cta_texto: z.string().optional(),
  seccion_stats_visible: z.boolean().optional(),
  seccion_programas_visible: z.boolean().optional(),
  seccion_cta_visible: z.boolean().optional(),
})

/**
 * Esquema de validación para crear un nuevo municipio.
 * Req 11.5: rechaza slugs reservados
 * Req 11.6: rechaza slugs con caracteres inválidos
 */
export const CreateMunicipalitySchema = z.object({
  nombre_municipio: z.string().min(1, 'El nombre del municipio no puede estar vacío'),
  nombre_ayuntamiento: z.string().min(1, 'El nombre del ayuntamiento no puede estar vacío'),
  slug: z
    .string()
    .regex(/^[a-z0-9-]+$/, 'El slug solo puede contener letras minúsculas, números y guiones')
    .refine(
      (val) => !(RESERVED_SLUGS as readonly string[]).includes(val),
      { message: 'Este identificador de municipio está reservado y no puede usarse' }
    ),
  provincia: z.string().min(1, 'La provincia no puede estar vacía'),
  pais: z.string().min(1, 'El país no puede estar vacío').default('España'),
  colores_corporativos: corporateColorsSchema,
  hero_image_url: z.string().url('La URL de la imagen principal debe ser una URL válida').nullable().optional(),
  escudo_url: z.string().url('La URL del escudo debe ser una URL válida').nullable().optional(),
  logo_url: z.string().url('La URL del logo debe ser una URL válida').nullable().optional(),
  email_contacto: z.string().email('Debe ser un email válido').nullable().optional(),
  telefono_contacto: z.string().max(30, 'El teléfono no puede superar los 30 caracteres').nullable().optional(),
  textos_institucionales: institutionalTextsSchema.optional(),
})

export type CreateMunicipalityDTO = z.infer<typeof CreateMunicipalitySchema>

/**
 * Esquema de validación para actualizar las aplicaciones activas de un municipio.
 * Req 13.1
 */
export const UpdateMunicipalityAppsSchema = z.object({
  municipality_id: z.string().uuid('El municipality_id debe ser un UUID válido'),
  application_ids: z
    .array(z.string().uuid('Cada application_id debe ser un UUID válido'))
    .min(0),
})

export type UpdateMunicipalityAppsDTO = z.infer<typeof UpdateMunicipalityAppsSchema>

/**
 * Esquema de validación para asignación masiva:
 * asigna/desasigna una aplicación a múltiples municipios a la vez.
 */
export const BulkAssignAppSchema = z.object({
  municipality_ids: z
    .array(z.string().uuid('Cada municipality_id debe ser un UUID válido'))
    .min(0),
})

export type BulkAssignAppDTO = z.infer<typeof BulkAssignAppSchema>
