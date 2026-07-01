/**
 * Dashboard del ciudadano — TE CUIDA
 *
 * Server Component que muestra el panel personal del ciudadano
 * con el modelo de tienda de aplicaciones municipal:
 *   - Apps disponibles en su municipio
 *   - Apps que ya ha abierto/accedido
 *   - Acceso rápido al catálogo completo
 *
 * Requisitos: 5.1, 5.2, 7.1
 */

import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { getTenantConfigFromDB, getTenantFromHeaders } from '@/lib/tenant/headers'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { normalizeExternalUrl } from '@/lib/urls'
import SignOutButton from '@/components/ui/sign-out-button'

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

interface ActiveAppRow {
  application_id: string
  application: {
    id: string
    category_id: string
    nombre: string
    descripcion: string
    thumbnail_url: string | null
    tipo: string
    app_slug?: string | null
    /**
     * URL externa de la app. Si está presente y NO hay app_slug,
     * el link del dashboard salta `/app/<id>` y va directo a esta URL.
     * Defensa contra el bug 404 típico de apps tipo='programa' con URL
     * externa huérfanas (migrations 029/031 + fallback GenericLanding).
     */
    url_acceso?: string | null
  } | null
}

interface AchievementRow {
  id: string
  tipo: string
  descripcion: string
  fecha_obtenido: string
}

// ---------------------------------------------------------------------------
// Iconos por tipo de app
// ---------------------------------------------------------------------------

const tipoIcon: Record<string, string> = {
  programa: '🌿',
  herramienta: '🔧',
  encuesta: '📋',
  recurso: '📖',
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

  const adminClient = createAdminClient()

  // 3. Apps activas del municipio
  let activeApps: ActiveAppRow[] = []
  if (tenant) {
    const { data: appsData } = await adminClient
      .from('municipality_applications')
      .select(
        `application_id,
        application:applications!inner (
          id,
          category_id,
          nombre,
          descripcion,
          thumbnail_url,
          tipo,
          app_slug,
          url_acceso
        )`,
      )
      .eq('municipality_id', tenant.id)
      .eq('activa', true)

    activeApps = (appsData || []) as unknown as ActiveAppRow[]
  }

  // 4. Apps que el ciudadano ya ha abierto (programas con progreso)
  const { data: openedProgramIds } = await adminClient
    .from('user_progress')
    .select('program_id, program:programs(application_id)')
    .eq('user_id', user.id)
    .limit(100)

  // 5. Apps de encuesta que ha respondido
  const { data: openedSurveyIds } = await adminClient
    .from('survey_answers')
    .select('survey_id, survey:surveys(application_id)')
    .eq('user_id', user.id)
    .limit(100)

  // 6. Logros
  const { data: achievementsData } = await adminClient
    .from('achievements')
    .select('id, tipo, descripcion, fecha_obtenido')
    .eq('user_id', user.id)
    .order('fecha_obtenido', { ascending: false })
    .limit(10)

  // 7. Perfil del usuario
  const { data: userProfile } = await adminClient
    .from('users')
    .select('alias, nombre, apellidos, email')
    .eq('id', user.id)
    .single()

  // RGPD: mostrar alias si existe, fallback a nombre legacy, o 'vecino/a'
  const displayName =
    (userProfile?.alias as string) ||
    (userProfile?.nombre as string) ||
    ''

  // ─── Procesar datos ────────────────────────────────────

  // Conjunto de IDs de apps que el ciudadano ya ha abierto
  const openedAppIds = new Set<string>()

  // Programas con progreso
  const progRows = (openedProgramIds || []) as unknown as {
    program: { application_id: string } | null
  }[]
  progRows.forEach((r) => {
    if (r.program?.application_id) {
      openedAppIds.add(r.program.application_id)
    }
  })

  // Encuestas respondidas
  const surveyRows = (openedSurveyIds || []) as unknown as {
    survey: { application_id: string } | null
  }[]
  surveyRows.forEach((r) => {
    if (r.survey?.application_id) {
      openedAppIds.add(r.survey.application_id)
    }
  })

  // Apps válidas. Pre-normalizamos url_acceso aquí (no en JSX) para que
  // el bloque Link quede limpio — la función `normalizeExternalUrl` añade
  // "https://" si el operador guardó "example.com" sin scheme y devuelve
  // `null` si el valor era vacío / sólo whitespace.
  const validApps = activeApps
    .filter((a) => a.application !== null)
    .map((a) => ({
      id: a.application!.id,
      nombre: a.application!.nombre,
      descripcion: a.application!.descripcion || '',
      tipo: a.application!.tipo,
      appSlug: a.application!.app_slug || null,
      urlAcceso: normalizeExternalUrl(a.application!.url_acceso),
    }))

  const appsAbiertas = validApps.filter((a) => openedAppIds.has(a.id))
  const achievements: AchievementRow[] = (achievementsData || []) as unknown as AchievementRow[]

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
                  ¡Hola{displayName ? `, ${displayName}` : ''}!
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
            <p className="text-3xl font-bold text-indigo-600">{validApps.length}</p>
            <p className="mt-1 text-sm text-gray-500">Apps en tu municipio</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-3xl font-bold text-emerald-600">{appsAbiertas.length}</p>
            <p className="mt-1 text-sm text-gray-500">Apps que has abierto</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-3xl font-bold text-amber-600">{achievements.length}</p>
            <p className="mt-1 text-sm text-gray-500">Logros</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-3xl font-bold text-sky-600">
              {validApps.length - appsAbiertas.length}
            </p>
            <p className="mt-1 text-sm text-gray-500">Apps por descubrir</p>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Columna principal */}
          <div className="lg:col-span-2 space-y-8">
            {/* Mis aplicaciones */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-900">
                  📱 Mis aplicaciones
                </h2>
                <Link
                  href="/"
                  className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
                >
                  Ver catálogo completo →
                </Link>
              </div>

              {validApps.length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {validApps.map((app) => {
                    const isOpened = openedAppIds.has(app.id)
                    // Solo mostrar ✓ Abierta para tipos donde podemos trackear uso (programas y encuestas)
                    const canTrack = app.tipo === 'programa' || app.tipo === 'encuesta'
                    const showOpened = isOpened && canTrack
                    // Misma prioridad de href que application-card.tsx:
                    //   app_slug > url_acceso > /app/<id>
                    // urlAcceso ya viene normalizado del mapping arriba
                    // (con https:// antepuesto por lib/urls si era host puro).
                    const hasAppSlug = !!app.appSlug
                    const hasExternalUrl = !hasAppSlug && app.urlAcceso != null
                    const appHref = hasAppSlug
                      ? `https://${app.appSlug}.tecuida.group`
                      : hasExternalUrl
                        ? app.urlAcceso!
                        : `/app/${app.id}`
                    const isAppExternal = hasAppSlug || hasExternalUrl
                    return (
                      <Link
                        key={app.id}
                        href={appHref}
                        target={isAppExternal ? '_blank' : undefined}
                        rel={isAppExternal ? 'noopener noreferrer' : undefined}
                        className={`block rounded-xl border p-4 transition-all hover:shadow-md ${
                          isOpened
                            ? 'bg-white border-emerald-200 hover:border-emerald-300'
                            : 'bg-white border-gray-200 hover:border-indigo-200'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <span className="text-2xl shrink-0">
                            {tipoIcon[app.tipo] || '📦'}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-semibold text-gray-900 truncate">
                                {app.nombre}
                              </p>
                              {showOpened && (
                                <span className="shrink-0 inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                                  ✓ Abierta
                                </span>
                              )}
                            </div>
                            <p className="mt-1 text-xs text-gray-500 line-clamp-2">
                              {app.descripcion || 'Sin descripción'}
                            </p>
                          </div>
                        </div>
                        <div className="mt-3 flex items-center justify-end">
                          <span className="text-xs font-medium text-indigo-600">
                            {isOpened ? 'Abrir de nuevo →' : 'Abrir →'}
                          </span>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
                  <p className="text-4xl mb-3">📭</p>
                  <p className="text-sm font-medium text-gray-900">
                    Tu ayuntamiento aún no ha publicado aplicaciones
                  </p>
                  <p className="mt-1 text-xs text-gray-400">
                    ¡Vuelve pronto! Estamos preparando nuevas herramientas para ti.
                  </p>
                </div>
              )}
            </div>

            {/* Onboarding para nuevos usuarios */}
            {appsAbiertas.length === 0 && validApps.length > 0 && (
              <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl border border-indigo-100 p-6">
                <h3 className="text-lg font-bold text-indigo-900 mb-3">
                  👋 ¿Acabas de llegar?
                </h3>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="bg-white rounded-lg p-4 shadow-sm">
                    <span className="text-2xl">1️⃣</span>
                    <p className="mt-2 text-sm font-semibold text-gray-900">
                      Explora el catálogo
                    </p>
                    <p className="text-xs text-gray-500">
                      Descubre las apps gratuitas que tu ayuntamiento ha preparado para ti.
                    </p>
                  </div>
                  <div className="bg-white rounded-lg p-4 shadow-sm">
                    <span className="text-2xl">2️⃣</span>
                    <p className="mt-2 text-sm font-semibold text-gray-900">
                      Instala las que te interesen
                    </p>
                    <p className="text-xs text-gray-500">
                      Cada app se instala como una aplicación independiente en tu móvil.
                    </p>
                  </div>
                  <div className="bg-white rounded-lg p-4 shadow-sm">
                    <span className="text-2xl">3️⃣</span>
                    <p className="mt-2 text-sm font-semibold text-gray-900">
                      Úsalas cuando quieras
                    </p>
                    <p className="text-xs text-gray-500">
                      Accede directamente desde tu dispositivo, sin volver a iniciar sesión.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Logros */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">
                🏆 Actividad reciente
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
                <div className="text-center py-4">
                  <p className="text-3xl mb-2">📱</p>
                  <p className="text-sm text-gray-400">
                    Abre tus apps del ayuntamiento para ver tu actividad aquí.
                  </p>
                </div>
              )}
            </div>

            {/* Acceso rápido a catálogo */}
            <Link
              href="/"
              className="block bg-gradient-to-br from-indigo-600 to-indigo-700 text-white rounded-xl p-5 hover:from-indigo-500 hover:to-indigo-600 transition-all shadow-sm"
            >
              <h3 className="font-bold">Explorar catálogo</h3>
              <p className="mt-1 text-sm text-indigo-100">
                Descubre todas las apps gratuitas de tu municipio.
              </p>
            </Link>

            {/* Perfil */}
            <Link
              href="/perfil"
              className="block bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100">
                  <span className="text-lg font-bold text-indigo-600">
                    {displayName ? displayName.charAt(0).toUpperCase() : (userProfile?.email || user?.email || '?').charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">Mi perfil</p>
                  <p className="text-xs text-gray-400">{userProfile?.email || user?.email}</p>
                </div>
              </div>
            </Link>

            {/* Salir */}
            <SignOutButton />
          </div>
        </div>
      </main>
    </div>
  )
}
