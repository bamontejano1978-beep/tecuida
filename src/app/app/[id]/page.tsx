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

import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getTenantConfigFromDB, getTenantFromHeaders } from '@/lib/tenant/headers'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import ProgramPageClient from './program-page-client'
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
  nivel_suscripcion: string
  activa: boolean
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
    .select('*')
    .eq('id', params.id)
    .single()

  if (appError || !appData) {
    notFound()
  }

  const app = appData as unknown as AppRow

  // 3. Obtener el programa asociado a la aplicación
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

  // 8. Renderizar
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Breadcrumb */}
      <div
        className="border-b"
        style={{
          backgroundColor: tenant?.colores_corporativos.primary || '#4f46e5',
        }}
      >
        <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
          <nav className="flex items-center gap-2 text-sm">
            <Link
              href="/"
              className="text-white/80 hover:text-white transition-colors"
            >
              ← Catálogo
            </Link>
            <span className="text-white/40">/</span>
            <span className="text-white font-medium truncate">{app.nombre}</span>
          </nav>
        </div>
      </div>

      {/* Cabecera del programa */}
      <div className="bg-white border-b border-gray-200">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
                {program.nombre}
              </h1>
              <p className="mt-2 text-gray-600 max-w-2xl">
                {program.descripcion}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-gray-500">
                <span className="inline-flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15a2.25 2.25 0 0 1 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z" />
                  </svg>
                  {modules.length} módulos
                </span>
                <span>·</span>
                <span>{allLessons.length} lecciones</span>
                <span>·</span>
                <span>{program.total_sesiones} sesiones</span>
              </div>
            </div>
            {/* Progreso global */}
            {completedLessonIds.length > 0 && (
              <div className="shrink-0 flex items-center gap-3 bg-emerald-50 rounded-lg px-4 py-3 border border-emerald-200">
                <div className="text-center">
                  <p className="text-2xl font-bold text-emerald-700">
                    {Math.round(
                      (completedLessonIds.length / allLessons.length) * 100,
                    )}
                    %
                  </p>
                  <p className="text-xs text-emerald-600">
                    {completedLessonIds.length}/{allLessons.length}
                  </p>
                </div>
                <div className="text-xs text-emerald-600">
                  Completado
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

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
