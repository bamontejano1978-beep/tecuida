/**
 * TE CUIDA — Tipos e interfaces TypeScript globales de la plataforma
 *
 * Este archivo centraliza todos los tipos del sistema:
 * configuración de municipios, usuarios, programas, progreso y DTOs.
 */

// ---------------------------------------------------------------------------
// Primitivos y tipos base
// ---------------------------------------------------------------------------

export type UUID = string

// ---------------------------------------------------------------------------
// Estado del municipio
// ---------------------------------------------------------------------------

export type SubscriptionStatus = 'activa' | 'suspendida' | 'cancelada' | 'prueba'

// ---------------------------------------------------------------------------
// Colores y textos institucionales del municipio
// ---------------------------------------------------------------------------

export interface CorporateColors {
  /** Color primario en formato hex, p. ej. "#003087" */
  primary: string
  /** Color secundario en formato hex */
  secondary: string
  /** Color de acento en formato hex */
  accent: string
  /** Color de fondo en formato hex */
  background: string
  /** Color de texto en formato hex */
  text: string
}

export interface InstitutionalTexts {
  /** Mensaje de bienvenida que aparece en la página principal del municipio */
  bienvenida: string
  /** Descripción del portal municipal */
  descripcion: string
  /** Texto del pie de página */
  pie_pagina: string
  /** ── Landing sections configurables (P4) ── */
  /** Título de la sección de estadísticas */
  stats_titulo?: string
  /** Subtítulo de la sección de estadísticas */
  stats_subtitulo?: string
  /** Título de la sección de programas */
  programas_titulo?: string
  /** Subtítulo de la sección de programas */
  programas_subtitulo?: string
  /** Título de la sección CTA */
  cta_titulo?: string
  /** Texto descriptivo bajo el título del CTA */
  cta_texto?: string
}

// ---------------------------------------------------------------------------
// Configuración completa del municipio (Tenant)
// ---------------------------------------------------------------------------

export interface MunicipalityConfig {
  id: UUID
  slug: string
  nombre_municipio: string
  nombre_ayuntamiento: string
  /** Dominio completo, p. ej. "calamonte.tecuida.group" */
  dominio: string
  escudo_url: string
  logo_url: string
  /** Imagen de fondo para el hero de la landing page (1920×650+). Si es '', se usa color sólido. */
  hero_image_url: string
  colores_corporativos: CorporateColors
  imagenes_municipio: string[]
  textos_institucionales: InstitutionalTexts
  modulos_activos: string[]
  estado_suscripcion: SubscriptionStatus
  /** Email de contacto público (footer landing page). Migración 035. */
  email_contacto?: string | null
  /** Teléfono de contacto público (footer landing page). Migración 035. */
  telefono_contacto?: string | null
}

// ---------------------------------------------------------------------------
// Filas de base de datos (reflejo del esquema PostgreSQL)
// ---------------------------------------------------------------------------

/** Fila de la tabla `public.users` */
export interface UserRow {
  /** Referencia a auth.users de Supabase */
  id: UUID
  municipality_id: UUID
  email: string
  /** Pseudónimo opcional RGPD-safe (migración 032). Sustituye a nombre real. */
  alias?: string | null
  /** Nombre real — nullable desde migración 032 (RGPD). Solo usuarios legacy. */
  nombre?: string | null
  /** Apellidos reales — nullable desde migración 032 (RGPD). Solo usuarios legacy. */
  apellidos?: string | null
  /** Género auto-declarado (opcional). Propósito: análisis estadístico anónimo de impacto. Migración 033. NULL = prefiero no responder. */
  genero?: 'hombre' | 'mujer' | 'no_binario' | null
  /** Año de nacimiento (opcional, solo año). Propósito: franjas etarias anónimas para métricas. Migración 033. */
  anio_nacimiento?: number | null
  telefono?: string
  /** @deprecated Solo usuarios legacy. Los nuevos usan anio_nacimiento (más RGPD-safe). */
  fecha_nacimiento?: Date
  rol: 'ciudadano' | 'superadmin'
  avatar_url?: string
  /** Token de confirmación para eliminación de cuenta (RGPD). Migración 034. */
  deletion_token?: string | null
  /** Timestamp de solicitud de eliminación. Migración 034. */
  deletion_requested_at?: Date | null
  created_at: Date
}

/** Fila de la tabla `public.user_progress` */
export interface UserProgressRow {
  id: UUID
  user_id: UUID
  program_id: UUID
  lesson_id: UUID
  /** Redundante pero necesario para las políticas RLS */
  municipality_id: UUID
  completada: boolean
  /** Valor entre 0 y 100 */
  porcentaje_completado: number
  fecha_inicio: Date
  fecha_completado?: Date
  tiempo_dedicado_segundos: number
}

/** Fila de la tabla `public.analytics_events` */
export interface AnalyticsEventRow {
  id: UUID
  municipality_id: UUID
  user_id?: UUID
  /** Nombre del evento: 'lesson_started', 'program_completed', etc. */
  evento: string
  payload: Record<string, unknown>
  created_at: Date
}

// ---------------------------------------------------------------------------
// Catálogo de aplicaciones
// ---------------------------------------------------------------------------

export type ApplicationType = 'programa' | 'herramienta' | 'encuesta' | 'recurso'

export interface Application {
  id: UUID
  nombre: string
  descripcion: string
  categoria_id: UUID
  thumbnail_url: string
  tipo: ApplicationType
  activa: boolean
  /** Slug para el subdominio de la app (ej. "mindful30" → mindful30.tecuida.group) */
  app_slug?: string | null
  /** Color de marca en hex (#rrggbb). NULL = el PWA usa el color por defecto del tipo. */
  brand_color?: string | null
  /**
   * URL externa de la app (modo "🔗 URL externa" del create-form).
   * Si NO está vacía y la app no tiene `app_slug`, la card del catálogo
   * enlaza directamente a ella — saltándose `/app/<id>` para evitar el
   * escenario típico del bug 404 en apps tipo='programa' huérfanas
   * (ver migrations 029/031).
   */
  url_acceso?: string | null
}

export interface MunicipalityApplication {
  municipality_id: UUID
  application_id: UUID
  activa: boolean
  fecha_activacion: Date
  application: Application
}

// ---------------------------------------------------------------------------
// Motor de programas (ProgramPlayer)
// ---------------------------------------------------------------------------

export type LessonType = 'texto' | 'audio' | 'video' | 'ejercicio' | 'combinado'

export interface ExerciseQuestion {
  id: string
  texto: string
  tipo: 'abierta' | 'opciones' | 'escala'
  opciones?: string[]
}

export interface Exercise {
  tipo: 'reflexion' | 'cuestionario' | 'respiracion' | 'escritura'
  instrucciones: string
  preguntas?: ExerciseQuestion[]
}

export interface Lesson {
  id: UUID
  module_id: UUID
  titulo: string
  tipo: LessonType
  contenido_texto?: string
  audio_url?: string
  video_url?: string
  ejercicio?: Exercise
  duracion_minutos: number
  orden: number
}

export interface ProgramModule {
  id: UUID
  program_id: UUID
  numero: number
  nombre: string
  descripcion: string
  lessons: Lesson[]
}

export interface Program {
  id: UUID
  application_id: UUID
  nombre: string
  descripcion: string
  total_sesiones: number
  modules: ProgramModule[]
}

// ---------------------------------------------------------------------------
// Progreso del usuario en un programa
// ---------------------------------------------------------------------------

export interface UserProgress {
  id: UUID
  user_id: UUID
  program_id: UUID
  lesson_id: UUID
  municipality_id: UUID
  completada: boolean
  /** Valor entre 0 y 100 */
  porcentaje_completado: number
  fecha_inicio: Date
  fecha_completado?: Date
  tiempo_dedicado_segundos: number
}

export interface ProgramProgressSummary {
  /** Porcentaje total de progreso, siempre en el rango [0, 100] */
  porcentaje_total: number
  lecciones_completadas: number
  lecciones_totales: number
  /** Tiempo total acumulado de todos los registros de progreso completados */
  tiempo_total_segundos: number
  completado: boolean
}

// ---------------------------------------------------------------------------
// Panel de superadministrador
// ---------------------------------------------------------------------------

export interface AdminDashboardStats {
  total_municipios: number
  municipios_activos: number
  total_ciudadanos: number
  ciudadanos_activos_mes: number
  programas_completados_mes: number
  ingresos_mes: number
}

// ---------------------------------------------------------------------------
// DTOs (Data Transfer Objects)
// ---------------------------------------------------------------------------

export interface CreateMunicipalityDTO {
  nombre_municipio: string
  nombre_ayuntamiento: string
  /**
   * Identificador único del municipio.
   * Debe cumplir el patrón ^[a-z0-9-]+$ y no ser una palabra reservada.
   */
  slug: string
  provincia: string
  pais: string
  colores_corporativos: CorporateColors
}

export interface UpdateMunicipalityAppsDTO {
  municipality_id: UUID
  /** Lista de IDs de aplicaciones a activar/desactivar para el municipio */
  application_ids: UUID[]
}

export interface RegisterCitizenDTO {
  email: string
  password: string
  /** Pseudónimo opcional (RGPD-safe). Se guarda en users.alias. */
  alias?: string
  /** Género auto-declarado opcional. Propósito: métricas anónimas de impacto. */
  genero?: 'hombre' | 'mujer' | 'no_binario'
  /** Año de nacimiento opcional. Solo año, no fecha completa (RGPD-safe). */
  anio_nacimiento?: number
}

export interface MarkLessonCompleteDTO {
  lesson_id: UUID
  program_id: UUID
  tiempo_segundos: number
}

// ---------------------------------------------------------------------------
// Errores de dominio
// ---------------------------------------------------------------------------

export class TenantNotFoundError extends Error {
  constructor(slug: string) {
    super(`Municipio no encontrado: ${slug}`)
    this.name = 'TenantNotFoundError'
  }
}

export class TenantSuspendedError extends Error {
  constructor(slug: string) {
    super(`Municipio suspendido o cancelado: ${slug}`)
    this.name = 'TenantSuspendedError'
  }
}

export class MunicipalityInactiveError extends Error {
  constructor() {
    super('El municipio no está activo. No se pueden aceptar nuevos registros.')
    this.name = 'MunicipalityInactiveError'
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ValidationError'
  }
}

export class DatabaseError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'DatabaseError'
  }
}

export class RegistrationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'RegistrationError'
  }
}
