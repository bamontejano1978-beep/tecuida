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

/**
 * Variante de layout de la landing page del municipio.
 * - 'classic': diseño actual con tarjetas verdes (default, ~95% de municipios).
 * - 'editorial': rediseño "periódico local" de Villafranca de los Barros
 *                (topbar crema 132px, hero split 35/65, tipografía Georgia).
 *
 * Migración 045. La columna SQL es `text NOT NULL DEFAULT 'classic'`
 * con CHECK constraint → seguro de leer siempre con un valor válido.
 */
export type MunicipalityLayoutVariant = 'classic' | 'editorial'

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
  /** Variante de layout activa — ver tipo `MunicipalityLayoutVariant`. */
  layout_variant: MunicipalityLayoutVariant
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
  rol: 'ciudadano' | 'superadmin' | 'admin_municipio'
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
// Marketplace de Actividades (Fase 1) — migrations/043
// ---------------------------------------------------------------------------

/** Modalidad en la que se realiza la actividad */
export type ActivityModalidad = 'presencial' | 'online' | 'mixta'

/** Estado de moderación de la actividad en el panel admin */
export type ActivityEstado =
  | 'borrador'
  | 'pendiente_validacion'
  | 'publicada'
  | 'rechazada'
  | 'cancelada'
  | 'finalizada'

/** Estado de una inscripción individual */
export type InscriptionEstado =
  | 'confirmada'
  | 'cancelada'
  | 'asistio'
  | 'no_asistio'

/** Tipo de profesional o entidad que oferta la actividad */
export type ProfessionalTipo =
  | 'colegiado'
  | 'asociacion'
  | 'centro'
  | 'profesional_autonomo'
  | 'otro'

/** Fila de la tabla `public.professionals` */
export interface Professional {
  id: UUID
  municipality_id: UUID
  /** Opcional: si el profesional también está registrado en TE CUIDA como ciudadano. */
  user_id?: UUID | null
  nombre: string
  tipo: ProfessionalTipo
  /** Para tipo='colegiado': número de colegiado. */
  numero_colegiado?: string | null
  descripcion?: string | null
  foto_url?: string | null
  web_url?: string | null
  email: string
  telefono?: string | null
  /** Visto bueno del admin_municipio tras revisión. */
  verificado: boolean
  estado: 'activo' | 'inactivo'
  created_at: Date
}

/** Fila de la tabla `public.activities` */
export interface Activity {
  id: UUID
  municipality_id: UUID
  professional_id: UUID
  category_id: UUID
  nombre: string
  descripcion: string
  thumbnail_url?: string | null
  modalidad: ActivityModalidad
  /** formato YYYY-MM-DD */
  fecha_inicio: string
  /** formato YYYY-MM-DD, opcional */
  fecha_fin?: string | null
  horario_texto?: string | null
  direccion_texto?: string | null
  url_reunion?: string | null
  aforo?: number | null
  /** Mantenido atómicamente por /api/activities/[id]/inscription */
  plazas_inscritas: number
  /** Texto libre visible: "Gratis", "15 €", "Aporte voluntario" */
  precio_texto?: string | null
  /** Instrucciones para que el ciudadano pague al profesional: Bizum, transferencia, etc. */
  nota_pago?: string | null
  /** ── Ficha de impacto (diferenciador TE CUIDA) ── */
  impacto_objetivo?: string | null
  impacto_beneficiarios_estimados?: number | null
  impacto_ambito?: string | null
  impacto_indicadores?: string | null
  estado: ActivityEstado
  destacada: boolean
  motivo_rechazo?: string | null
  motivo_cancelacion?: string | null
  created_at: Date
  updated_at: Date
}

/** Fila de la tabla `public.activity_inscriptions` */
export interface ActivityInscription {
  id: UUID
  activity_id: UUID
  municipality_id: UUID
  user_id?: UUID | null
  email: string
  nombre?: string | null
  estado: InscriptionEstado
  notas?: string | null
  created_at: Date
  updated_at: Date
}

/** Vista derivada para UI: actividad con su profesional y categoría */
export interface ActivityWithRelations extends Activity {
  professional: Professional
  categoria: { id: UUID; nombre: string; icono_url?: string | null } | null
}

/** DTO: alta de profesional desde el panel admin */
export interface CreateProfessionalDTO {
  nombre: string
  tipo: ProfessionalTipo
  numero_colegiado?: string
  descripcion?: string
  foto_url?: string
  web_url?: string
  email: string
  telefono?: string
  verificado: boolean
}

/** DTO: alta de actividad desde el panel admin o por admin_municipio */
export interface CreateActivityDTO {
  professional_id: UUID
  category_id: UUID
  nombre: string
  descripcion: string
  thumbnail_url?: string
  modalidad: ActivityModalidad
  fecha_inicio: string
  fecha_fin?: string
  horario_texto?: string
  direccion_texto?: string
  url_reunion?: string
  aforo?: number
  precio_texto?: string
  nota_pago?: string
  impacto_objetivo?: string
  impacto_beneficiarios_estimados?: number
  impacto_ambito?: string
  impacto_indicadores?: string
  destacada?: boolean
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
