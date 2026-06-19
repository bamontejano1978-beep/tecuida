/**
 * Dashboard del ciudadano — TE CUIDA
 *
 * Server Component que muestra:
 *   - Programas en progreso y disponibles
 *   - Estadísticas personales (lecciones completadas, tiempo, racha)
 *   - Logros recientes
 *   - Acceso rápido a continuar donde lo dejaste
 *
 * Requisitos: 5.1, 5.2, 7.1
 */

import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { getTenantConfigFromDB, getTenantFromHeaders } from '@/lib/tenant/headers'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import SignOutButton from '@/components/ui/sign-out-button'

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

interface ProgressRow {
  lesson_id: string
  program_id: string
  completada: boolean
  porcentaje_completado: number
  program: {
    id: string
    nombre: string
    application_id: string
  } | null
  lesson: {
    titulo: string
  } | null
}

interface AchievementRow {
  id: string
  tipo: string
  descripcion: string
  fecha_obtenido: string
}

interface ActiveAppRow {
  application_id: string
  application: {
    id: string
    category_id: string
    nombre: string
    descripcion: string
    thumbnail_url: string | null
    tipo: string
  } | null
}

// ---------------------------------------------------------------------------
// Página
// ---------------------------------------------------------------------------

export default async function DashboardPage() {
  // 1. Obtener usuario autenticado
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // 2. Obtener tenant desde headers
  const tenantHeaders = getTenantFromHeaders()
  const tenant = tenantHeaders?.slug
    ? await getTenantConfigFromDB(tenantHeaders.slug)
    : null

  // 3. Obtener progreso del ciudadano
  const adminClient = createAdminClient()

  const { data: progressData } = await adminClient
    .from('user_progress')
    .select(
      `
      lesson_id,
      program_id,
      completada,
      porcentaje_completado,
      program:programs (id, nombre, application_id),
      lesson:lessons (titulo)
    `,
    )
    .eq('user_id', user.id)
    .order('fecha_inicio', { ascending: false })
    .limit(50)

  // 4. Apps activas del municipio
  let activeApps: ActiveAppRow[] = []
  if (tenant) {
    const { data: appsData } = await adminClient
      .from('municipality_applications')
      .select(
        `
        application_id,
        application:applications!inner (
          id,
          category_id,
          nombre,
          descripcion,
          thumbnail_url,
          tipo
        )
      `,
      )
      .eq('municipality_id', tenant.id)
      .eq('activa', true)

    activeApps = (appsData || []) as unknown as ActiveAppRow[]
  }

  // 5. Logros
  const { data: achievementsData } = await adminClient
    .from('achievements')
    .select('id, tipo, descripcion, fecha_obtenido')
    .eq('user_id', user.id)
    .order('fecha_obtenido', { ascending: false })
    .limit(10)

  // 6. Perfil del usuario
  const { data: userProfile } = await adminClient
    .from('users')
    .select('nombre, apellidos, email')
    .eq('id', user.id)
    .single()

  // ─── Procesar datos ────────────────────────────────────

  const progressRows: ProgressRow[] = (progressData || []) as unknown as ProgressRow[]
  const totalCompletadas = progressRows.filter((p) => p.completada).length
  const uniquePrograms = new Map<string, { nombre: string; appId: string }>()
  progressRows.forEach((p) => {
    if (p.program && !uniquePrograms.has(p.program.id)) {
      uniquePrograms.set(p.program.id, {
        nombre: p.program.nombre,
        appId: p.program.application_id,
      })
    }
  })

  const achievements: AchievementRow[] = (achievementsData || []) as unknown as AchievementRow[]

  // Programa más reciente
  const latestProgram = progressRows[0]?.program
  const latestLesson = progressRows[0]?.lesson

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header institucional */}
      {tenant && (
        <header
          className="relative overflow-hidden"
          style={{ backgroundColor: tenant.colores_corporativos.primary }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
          <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            <div className="flex items-center gap-4">
              {tenant.escudo_url && (
                <Image
                  src={tenant.escudo_url}
                  alt={`Escudo de ${tenant.nombre_municipio}`}
                  width={48}
                  height={48}
                  className="h-12 w-auto drop-shadow-md"
                />
              )}
              <div>
                <p className="text-sm font-medium text-white/80">
                  {tenant.nombre_ayuntamiento}
                </p>
                <h1 className="text-2xl font-bold text-white">
                  ¡Hola{userProfile ? `, ${userProfile.nombre}` : ''}!
                </h1>
              </div>
            </div>
          </div>
          <div className="relative h-6">
            <svg
              className="absolute bottom-0 w-full h-6 text-gray-50"
              viewBox="0 0 1440 24"
              fill="currentColor"
              preserveAspectRatio="none"
            >
              <path d="M0,12 C240,24 480,0 720,12 C960,24 1200,0 1440,12 L1440,24 L0,24 Z" />
            </svg>
          </div>
        </header>
      )}

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Stats rápidas */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-3xl font-bold text-indigo-600">{totalCompletadas}</p>
            <p className="mt-1 text-sm text-gray-500">Lecciones completadas</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-3xl font-bold text-emerald-600">{uniquePrograms.size}</p>
            <p className="mt-1 text-sm text-gray-500">Programas en curso</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-3xl font-bold text-amber-600">{achievements.length}</p>
            <p className="mt-1 text-sm text-gray-500">Logros obtenidos</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-3xl font-bold text-sky-600">{activeApps.length}</p>
            <p className="mt-1 text-sm text-gray-500">Apps disponibles</p>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Columna principal */}
          <div className="lg:col-span-2 space-y-8">
            {/* Continuar donde lo dejaste */}
            {latestProgram && latestLesson && (
              <div className="bg-white rounded-xl border border-indigo-200 p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-semibold text-indigo-500 uppercase tracking-wide">
                      Continuar
                    </p>
                    <h2 className="mt-1 text-lg font-bold text-gray-900">
                      {latestProgram.nombre}
                    </h2>
                    <p className="mt-1 text-sm text-gray-500">
                      Última lección: {latestLesson.titulo}
                    </p>
                  </div>
                  <Link
                    href={`/app/${latestProgram.application_id}`}
                    className="shrink-0 inline-flex items-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 transition-colors"
                  >
                    Continuar →
                  </Link>
                </div>
              </div>
            )}

            {/* Mis programas */}
            {uniquePrograms.size > 0 && (
              <div>
                <h2 className="text-lg font-bold text-gray-900 mb-4">
                  Mis programas
                </h2>
                <div className="space-y-3">
                  {Array.from(uniquePrograms.entries()).map(
                    ([programId, { nombre, appId }]) => {
                      const completed = progressRows.filter(
                        (p) => p.program?.id === programId && p.completada,
                      ).length
                      const total = progressRows.filter(
                        (p) => p.program?.id === programId,
                      ).length
                      const pct = total > 0 ? Math.round((completed / total) * 100) : 0

                      return (
                        <Link
                          key={programId}
                          href={`/app/${appId}`}
                          className="block bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md hover:border-indigo-200 transition-all"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <h3 className="text-sm font-semibold text-gray-900">
                              {nombre}
                            </h3>
                            <span className="text-sm font-bold text-indigo-600">
                              {pct}%
                            </span>
                          </div>
                          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-indigo-500 rounded-full transition-all"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <p className="mt-2 text-xs text-gray-400">
                            {completed} de {total} lecciones completadas
                          </p>
                        </Link>
                      )
                    },
                  )}
                </div>
              </div>
            )}

            {/* Catálogo de apps */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-900">
                  Catálogo disponible
                </h2>
                <Link
                  href="/"
                  className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
                >
                  Ver todo →
                </Link>
              </div>
              {activeApps.length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {activeApps.slice(0, 6).map((a) => {
                    if (!a.application) return null
                    return (
                      <Link
                        key={a.application_id}
                        href={`/app/${a.application.id}`}
                        className="block bg-white rounded-lg border border-gray-200 p-4 hover:shadow-sm hover:border-indigo-200 transition-all"
                      >
                        <p className="text-sm font-semibold text-gray-900">
                          {a.application.nombre}
                        </p>
                        <p className="mt-1 text-xs text-gray-500 line-clamp-2">
                          {a.application.descripcion || 'Sin descripción'}
                        </p>
                        <span className="mt-2 inline-flex items-center text-xs font-medium text-indigo-600">
                          Acceder →
                        </span>
                      </Link>
                    )
                  })}
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
                  <svg className="mx-auto h-10 w-10 text-gray-300" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                  </svg>
                  <p className="mt-3 text-sm text-gray-500">
                    No hay aplicaciones disponibles en tu municipio aún.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar: Logros */}
          <div className="space-y-6">
            {/* Logros */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">
                🏆 Logros
              </h3>
              {achievements.length > 0 ? (
                <div className="space-y-3">
                  {achievements.map((a) => (
                    <div
                      key={a.id}
                      className="flex items-center gap-3 p-3 rounded-lg bg-amber-50 border border-amber-100"
                    >
                      <span className="text-xl">
                        {a.tipo === 'primer_programa' && '🌟'}
                        {a.tipo === 'racha_7' && '🔥'}
                        {a.tipo === 'racha_30' && '💎'}
                        {a.tipo === 'completado' && '🎯'}
                        {!['primer_programa', 'racha_7', 'racha_30', 'completado'].includes(a.tipo) && '⭐'}
                      </span>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {a.descripcion || a.tipo}
                        </p>
                        <p className="text-xs text-gray-400">
                          {new Date(a.fecha_obtenido).toLocaleDateString('es')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400 text-center py-4">
                  Completa lecciones para ganar logros.
                </p>
              )}
            </div>

            {/* Acceso rápido a catálogo */}
            <Link
              href="/"
              className="block bg-gradient-to-br from-indigo-600 to-indigo-700 text-white rounded-xl p-5 hover:from-indigo-500 hover:to-indigo-600 transition-all shadow-sm"
            >
              <h3 className="font-bold">Explorar catálogo</h3>
              <p className="mt-1 text-sm text-indigo-100">
                Descubre todos los programas y herramientas disponibles.
              </p>
            </Link>

            {/* Salir */}
            <SignOutButton />
          </div>
        </div>
      </main>
    </div>
  )
}

