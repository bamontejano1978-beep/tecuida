/**
 * Página de programa individual — TE CUIDA
 *
 * Server Component que obtiene:
 *   - La aplicación (para verificar que es un programa)
 *   - El programa con sus módulos y lecciones anidadas
 *   - La configuración del tenant desde DB
 *
 * Renderiza:
 *   - Breadcrumb de navegación al catálogo
 *   - Cabecera del programa con progreso (si autenticado)
 *   - Sidebar con ModuleAccordion
 *   - Área principal con LessonViewer
 *
 * Ruta: /app/[id]
 *
 * Requisitos: 7.1
 */

import { notFound } from 'next/navigation'
import { getTenantConfigFromDB, getTenantFromHeaders } from '@/lib/tenant/headers'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import ProgramPageClient from './program-page-client'
import { ApplicationHero } from '@/components/landing/application-hero'
import GenericAppLanding from '@/components/landing/generic-app-landing'
import type { Program, ProgramModule, Lesson } from '@/types'

// ---------------------------------------------------------------------------
// Tipos para las filas de Supabase
// ---------------------------------------------------------------------------

interface ProgramRow {
  id: string
  application_id: string
  nombre: string
  descripcion: string | null
  total_sesiones: number
  duracion_dias: number
}

interface ModuleRow {
  id: string
  program_id: string
  numero: number
  nombre: string
}

interface LessonRow {
  id: string
  module_id: string
  titulo: string
  tipo: string
  contenido_texto: string | null
  audio_url: string | null
  video_url: string | null
  ejercicio: Record<string, unknown> | null
  duracion_minutos: number
  orden: number
}

interface AppRow {
  id: string
  categoria_id: string
  nombre: string
  descripcion: string | null
  tipo: string
  activa: boolean
  thumbnail_url: string | null
  instrucciones: string | null
  url_acceso: string | null
  categoria: { nombre: string } | null
}

interface ProgressRow {
  lesson_id: string
  completada: boolean
}

interface Props {
  params: { id: string }
}

// ---------------------------------------------------------------------------
// Página
// ---------------------------------------------------------------------------

export default async function ProgramPage({ params }: Props) {
  // 1. Tenant
  const tenantHeaders = getTenantFromHeaders()
  const tenant = tenantHeaders?.slug
    ? await getTenantConfigFromDB(tenantHeaders.slug)
    : null

  // 2. Obtener la aplicación
  const adminClient = createAdminClient()

  const { data: appData, error: appError } = await adminClient
    .from('applications')
    .select('*, categoria:categories (nombre)')
    .eq('id', params.id)
    .single()

  if (appError || !appData) {
    notFound()
  }

  const app = appData as unknown as AppRow

  // 3. Si NO es un programa, renderizar landing genérica
  if (app.tipo !== 'programa') {
    return (
      <div className="min-h-screen bg-gray-50">
        <GenericAppLanding
          nombre={app.nombre}
          descripcion={app.descripcion}
          tipo={app.tipo}
          instrucciones={app.instrucciones}
          url_acceso={app.url_acceso}
          categoria_nombre={app.categoria?.nombre ?? null}
        />
      </div>
    )
  }

  // 4. Obtener el programa asociado a la aplicación
  const { data: programData, error: progError } = await adminClient
    .from('programs')
    .select('*')
    .eq('application_id', params.id)
    .single()

  if (progError || !programData) {
    notFound()
  }

  const prog = programData as unknown as ProgramRow

  // 4. Obtener módulos
  const { data: modulesData, error: modError } = await adminClient
    .from('program_modules')
    .select('*')
    .eq('program_id', prog.id)
    .order('numero', { ascending: true })

  if (modError) {
    console.error('[ProgramPage] Error fetching modules:', modError.message)
    notFound()
  }

  // 5. Obtener lecciones (solo si hay módulos)
  const moduleIds = (modulesData || []).map((m) => m.id)
  const { data: lessonsData, error: lesError } = moduleIds.length > 0
    ? await adminClient
        .from('lessons')
        .select('*')
        .in('module_id', moduleIds)
        .order('orden', { ascending: true })
    : { data: [], error: null }

  if (lesError) {
    console.error('[ProgramPage] Error fetching lessons:', lesError.message)
    notFound()
  }

  const rawModules: ModuleRow[] = (modulesData || []) as unknown as ModuleRow[]
  const rawLessons: LessonRow[] = (lessonsData || []) as unknown as LessonRow[]

  // 5. Construir la estructura anidada modules → lessons
  const lessonsByModule = new Map<string, Lesson[]>()
  rawLessons.forEach((l) => {
    const lesson: Lesson = {
      id: l.id,
      module_id: l.module_id,
      titulo: l.titulo,
      tipo: l.tipo as Lesson['tipo'],
      contenido_texto: l.contenido_texto || undefined,
      audio_url: l.audio_url || undefined,
      video_url: l.video_url || undefined,
      ejercicio: l.ejercicio
        ? (l.ejercicio as unknown as Lesson['ejercicio'])
        : undefined,
      duracion_minutos: l.duracion_minutos,
      orden: l.orden,
    }
    const arr = lessonsByModule.get(l.module_id) || []
    arr.push(lesson)
    lessonsByModule.set(l.module_id, arr)
  })

  const modules: ProgramModule[] = rawModules.map((m) => ({
    id: m.id,
    program_id: m.program_id,
    numero: m.numero,
    nombre: m.nombre,
    descripcion: '',
    lessons: lessonsByModule.get(m.id) || [],
  }))

  const program: Program = {
    id: prog.id,
    application_id: prog.application_id,
    nombre: prog.nombre,
    descripcion: prog.descripcion || '',
    total_sesiones: prog.total_sesiones,
    modules,
  }

  // 6. Obtener progreso del usuario (si está autenticado)
  let completedLessonIds: string[] = []
  try {
    const serverClient = createClient()
    const { data: { user } } = await serverClient.auth.getUser()
    if (user) {
      const { data: progressData } = await serverClient
        .from('user_progress')
        .select('lesson_id, completada')
        .eq('program_id', prog.id)
        .eq('user_id', user.id)
        .eq('completada', true)

      completedLessonIds = ((progressData || []) as unknown as ProgressRow[]).map(
        (p) => p.lesson_id,
      )
    }
  } catch {
    // Usuario no autenticado — sin progreso
  }

  // 7. Aplanar lecciones para navegación secuencial
  const allLessons = modules.flatMap((m) => m.lessons)

  // 8. Computar progreso agregado para el hero (null si el usuario anónimo no ha empezado)
  const progress =
    completedLessonIds.length > 0
      ? {
          percent: Math.round((completedLessonIds.length / allLessons.length) * 100),
          completed: completedLessonIds.length,
          total: allLessons.length,
        }
      : null

  // 9. Renderizar
  return (
    <div id="lecciones" className="min-h-screen bg-gray-50">
      {/* Hero rediseñado (mismo lenguaje visual que MunicipalityHero) */}
      <ApplicationHero
        nombre={app.nombre}
        descripcion={app.descripcion}
        tipo={app.tipo as 'programa' | 'herramienta' | 'encuesta' | 'recurso'}
        thumbnail_url={app.thumbnail_url ?? null}
        categoria_nombre={app.categoria?.nombre ?? null}
        progress={progress}
      />

      {/* Cuerpo: sidebar + visor */}
      <ProgramPageClient
        program={program}
        modules={modules}
        allLessons={allLessons}
        completedLessonIds={completedLessonIds}
        primaryColor={tenant?.colores_corporativos.primary || '#4f46e5'}
      />
    </div>
  )
}
