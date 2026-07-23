import Image from 'next/image'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import TrackedApplicationLink from '@/components/analytics/tracked-application-link'
import SignOutButton from '@/components/ui/sign-out-button'
import { getApplicationEntryPath } from '@/lib/application-links'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { getTenantConfigFromDB, getTenantFromHeaders } from '@/lib/tenant/headers'

export const dynamic = 'force-dynamic'

interface ActiveAppRow {
  application_id: string
  application: {
    id: string
    nombre: string
    descripcion: string | null
    thumbnail_url: string | null
    tipo: string
    app_slug: string | null
  } | null
}

interface ProgressRow {
  program_id: string
  completada: boolean
  porcentaje_completado: number
  fecha_inicio: string
  program: {
    application_id: string
    total_sesiones: number
  } | null
}

interface AchievementRow {
  id: string
  tipo: string
  descripcion: string
  fecha_obtenido: string
}

interface UpcomingInscriptionRow {
  id: string
  activity: {
    id: string
    nombre: string
    fecha_inicio: string
    horario_texto: string | null
    modalidad: 'presencial' | 'online' | 'mixta'
    direccion_texto: string | null
    thumbnail_url: string | null
  } | null
}

interface DashboardApp {
  id: string
  nombre: string
  descripcion: string
  tipo: string
  appSlug: string | null
  thumbnailUrl: string | null
}

const appTypeLabel: Record<string, string> = {
  programa: 'Programa',
  herramienta: 'Herramienta',
  encuesta: 'Encuesta',
  recurso: 'Recurso',
}

const appTypeIcon: Record<string, string> = {
  programa: '🌿',
  herramienta: '✦',
  encuesta: '✓',
  recurso: '◫',
}

const achievementIcon: Record<string, string> = {
  primer_programa: '🌟',
  racha_7: '🔥',
  racha_30: '💎',
  completado: '🎯',
}

function formatActivityDate(value: string) {
  return new Intl.DateTimeFormat('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date(`${value}T12:00:00`))
}

function DashboardIcon({
  name,
  className = 'h-5 w-5',
}: {
  name: 'home' | 'grid' | 'calendar' | 'user' | 'sparkles' | 'arrow' | 'play'
  className?: string
}) {
  const common = {
    className,
    fill: 'none',
    viewBox: '0 0 24 24',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    'aria-hidden': true,
  }

  if (name === 'home') {
    return (
      <svg {...common}>
        <path strokeLinecap="round" strokeLinejoin="round" d="m3 10.8 9-7.2 9 7.2v8.4a1.8 1.8 0 0 1-1.8 1.8H4.8A1.8 1.8 0 0 1 3 19.2v-8.4Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 21v-6.5h6V21" />
      </svg>
    )
  }

  if (name === 'grid') {
    return (
      <svg {...common}>
        <rect x="3" y="3" width="7" height="7" rx="2" />
        <rect x="14" y="3" width="7" height="7" rx="2" />
        <rect x="3" y="14" width="7" height="7" rx="2" />
        <rect x="14" y="14" width="7" height="7" rx="2" />
      </svg>
    )
  }

  if (name === 'calendar') {
    return (
      <svg {...common}>
        <rect x="3" y="5" width="18" height="16" rx="3" />
        <path strokeLinecap="round" d="M8 3v4M16 3v4M3 10h18" />
      </svg>
    )
  }

  if (name === 'user') {
    return (
      <svg {...common}>
        <circle cx="12" cy="8" r="4" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 21a7.5 7.5 0 0 1 15 0" />
      </svg>
    )
  }

  if (name === 'sparkles') {
    return (
      <svg {...common}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c.7 4 2.3 5.6 6.3 6.3-4 .7-5.6 2.3-6.3 6.3-.7-4-2.3-5.6-6.3-6.3C9.7 8.6 11.3 7 12 3Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M18.5 15.5c.3 1.8 1.2 2.7 3 3-1.8.3-2.7 1.2-3 3-.3-1.8-1.2-2.7-3-3 1.8-.3 2.7-1.2 3-3Z" />
      </svg>
    )
  }

  if (name === 'play') {
    return (
      <svg {...common}>
        <path strokeLinecap="round" strokeLinejoin="round" d="m9 7 8 5-8 5V7Z" />
      </svg>
    )
  }

  return (
    <svg {...common}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M14 7l5 5-5 5" />
    </svg>
  )
}

function ApplicationCard({
  app,
  actionLabel,
  prominent = false,
}: {
  app: DashboardApp
  actionLabel: string
  prominent?: boolean
}) {
  const href = getApplicationEntryPath({ id: app.id, app_slug: app.appSlug })

  return (
    <TrackedApplicationLink
      applicationId={app.id}
      href={href}
      className={`group overflow-hidden rounded-2xl border bg-white transition duration-200 hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 ${
        prominent ? 'border-indigo-100 shadow-sm' : 'border-slate-200'
      }`}
    >
      <div className={`relative overflow-hidden ${prominent ? 'aspect-[16/8]' : 'aspect-[16/9]'}`}>
        {app.thumbnailUrl ? (
          <Image
            src={app.thumbnailUrl}
            alt=""
            fill
            sizes={prominent ? '(max-width: 640px) 100vw, 50vw' : '(max-width: 640px) 100vw, 33vw'}
            className="object-cover transition duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-100 via-sky-50 to-emerald-100">
            <div className="flex h-full items-center justify-center text-4xl" aria-hidden="true">
              {appTypeIcon[app.tipo] || '✦'}
            </div>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/45 via-transparent to-transparent" />
        <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-slate-700 shadow-sm backdrop-blur">
          {appTypeLabel[app.tipo] || 'Aplicación'}
        </span>
      </div>
      <div className="p-4">
        <h3 className="text-base font-bold text-slate-900">{app.nombre}</h3>
        <p className="mt-1 line-clamp-2 text-sm leading-5 text-slate-600">
          {app.descripcion || 'Una herramienta de bienestar disponible para ti.'}
        </p>
        <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-indigo-700">
          {actionLabel}
          <DashboardIcon name="arrow" className="h-4 w-4 transition group-hover:translate-x-0.5" />
        </span>
      </div>
    </TrackedApplicationLink>
  )
}

export default async function DashboardPage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const tenantHeaders = getTenantFromHeaders()
  const tenant = tenantHeaders?.slug
    ? await getTenantConfigFromDB(tenantHeaders.slug)
    : null
  const adminClient = createAdminClient()

  let activeApps: ActiveAppRow[] = []
  if (tenant) {
    const { data } = await adminClient
      .from('municipality_applications')
      .select(
        `application_id,
         application:applications!inner (
           id, nombre, descripcion, thumbnail_url, tipo, app_slug
         )`,
      )
      .eq('municipality_id', tenant.id)
      .eq('activa', true)

    activeApps = (data || []) as unknown as ActiveAppRow[]
  }

  const [
    { data: progressData },
    { data: surveyData },
    { data: achievementsData },
    { count: achievementCount },
    { data: userProfile },
    { data: inscriptionData },
  ] = await Promise.all([
    adminClient
      .from('user_progress')
      .select(
        `program_id, completada, porcentaje_completado, fecha_inicio,
         program:programs(application_id, total_sesiones)`,
      )
      .eq('user_id', user.id)
      .order('fecha_inicio', { ascending: false })
      .limit(200),
    adminClient
      .from('survey_answers')
      .select('survey:surveys(application_id)')
      .eq('user_id', user.id)
      .limit(100),
    adminClient
      .from('achievements')
      .select('id, tipo, descripcion, fecha_obtenido')
      .eq('user_id', user.id)
      .order('fecha_obtenido', { ascending: false })
      .limit(4),
    adminClient
      .from('achievements')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id),
    adminClient
      .from('users')
      .select('alias, nombre, email')
      .eq('id', user.id)
      .single(),
    adminClient
      .from('activity_inscriptions')
      .select(
        `id,
         activity:activities (
           id, nombre, fecha_inicio, horario_texto, modalidad,
           direccion_texto, thumbnail_url
         )`,
      )
      .eq('user_id', user.id)
      .eq('estado', 'confirmada')
      .gte('activity.fecha_inicio', new Date().toISOString().slice(0, 10))
      .order('created_at', { ascending: false })
      .limit(20),
  ])

  const apps: DashboardApp[] = activeApps
    .filter((row) => row.application !== null)
    .map((row) => ({
      id: row.application!.id,
      nombre: row.application!.nombre,
      descripcion: row.application!.descripcion || '',
      tipo: row.application!.tipo,
      appSlug: row.application!.app_slug,
      // La personalización municipal de iconos se limita, por decisión de
      // producto, a la landing y al catálogo. El panel conserva la identidad
      // global de cada aplicación.
      thumbnailUrl: row.application!.thumbnail_url,
    }))

  const progressRows = (progressData || []) as unknown as ProgressRow[]
  const openedAppIds = new Set<string>()
  const progressByApp = new Map<
    string,
    { completed: number; total: number; latestDate: string }
  >()

  progressRows.forEach((row) => {
    if (!row.program?.application_id) return
    const appId = row.program.application_id
    openedAppIds.add(appId)
    const current = progressByApp.get(appId) || {
      completed: 0,
      total: Math.max(row.program.total_sesiones || 0, 1),
      latestDate: row.fecha_inicio,
    }
    if (row.completada) current.completed += 1
    current.total = Math.max(current.total, row.program.total_sesiones || 0, 1)
    if (row.fecha_inicio > current.latestDate) current.latestDate = row.fecha_inicio
    progressByApp.set(appId, current)
  })

  const surveyRows = (surveyData || []) as unknown as {
    survey: { application_id: string } | null
  }[]
  surveyRows.forEach((row) => {
    if (row.survey?.application_id) openedAppIds.add(row.survey.application_id)
  })

  const usedApps = apps.filter((app) => openedAppIds.has(app.id))
  const discoveryApps = apps.filter((app) => !openedAppIds.has(app.id))
  const continueApp = [...usedApps].sort((a, b) => {
    const dateA = progressByApp.get(a.id)?.latestDate || ''
    const dateB = progressByApp.get(b.id)?.latestDate || ''
    return dateB.localeCompare(dateA)
  })[0]
  const continueProgress = continueApp ? progressByApp.get(continueApp.id) : null
  const progressPercent = continueProgress
    ? Math.min(100, Math.round((continueProgress.completed / continueProgress.total) * 100))
    : 0

  const upcomingInscription = (
    (inscriptionData || []) as unknown as UpcomingInscriptionRow[]
  )
    .filter((row) => row.activity !== null)
    .sort((a, b) =>
      a.activity!.fecha_inicio.localeCompare(b.activity!.fecha_inicio),
    )[0]

  const achievements = (achievementsData || []) as unknown as AchievementRow[]
  const displayName =
    (userProfile?.alias as string) || (userProfile?.nombre as string) || ''
  const primary = tenant?.colores_corporativos.primary || '#4338ca'
  const secondary = tenant?.colores_corporativos.secondary || '#2563eb'
  const municipalityName = tenant?.nombre_municipio || 'tu municipio'
  const userEmail = userProfile?.email || user.email || ''

  return (
    <div className="min-h-screen bg-[#f6f7fb] pb-24 text-slate-900 md:pb-10">
      <header
        className="relative overflow-hidden text-white"
        style={{
          background: `linear-gradient(125deg, ${primary} 0%, ${secondary} 100%)`,
        }}
      >
        <div className="absolute -right-16 -top-24 h-72 w-72 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -bottom-32 left-1/4 h-64 w-64 rounded-full bg-sky-300/10 blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-4 pb-20 pt-5 sm:px-6 lg:px-8">
          <nav className="flex items-center justify-between" aria-label="Navegación principal">
            <Link href="/" className="flex min-w-0 items-center gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">
              {tenant?.escudo_url ? (
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/95 p-1.5 shadow-sm">
                  <Image
                    src={tenant.escudo_url}
                    alt={`Escudo de ${municipalityName}`}
                    width={40}
                    height={40}
                    className="max-h-8 w-auto"
                  />
                </span>
              ) : (
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/15 text-lg font-black">
                  TC
                </span>
              )}
              <span className="min-w-0">
                <span className="block truncate text-xs font-semibold uppercase tracking-[0.16em] text-white/70">
                  {tenant?.nombre_ayuntamiento || 'TE CUIDA'}
                </span>
                <span className="block truncate text-sm font-bold">Mi espacio de bienestar</span>
              </span>
            </Link>
            <div className="hidden items-center gap-1 rounded-full bg-white/10 p-1 text-sm font-semibold backdrop-blur md:flex">
              <Link href="/dashboard" aria-current="page" className="rounded-full bg-white px-4 py-2 text-slate-900 shadow-sm">
                Inicio
              </Link>
              <Link href="/" className="rounded-full px-4 py-2 text-white/85 transition hover:bg-white/10 hover:text-white">
                Explorar
              </Link>
              <Link href="/actividades" className="rounded-full px-4 py-2 text-white/85 transition hover:bg-white/10 hover:text-white">
                Actividades
              </Link>
              <Link href="/perfil" className="rounded-full px-4 py-2 text-white/85 transition hover:bg-white/10 hover:text-white">
                Perfil
              </Link>
            </div>
          </nav>

          <div className="mt-12 max-w-2xl">
            <p className="text-sm font-semibold text-white/75">Tu espacio en {municipalityName}</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
              Hola{displayName ? `, ${displayName}` : ''}. ¿Qué te apetece hacer hoy?
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-white/80 sm:text-base">
              Continúa cuidándote, descubre recursos útiles y participa en las actividades de tu municipio.
            </p>
          </div>
        </div>
      </header>

      <main className="relative mx-auto -mt-12 max-w-7xl px-4 sm:px-6 lg:px-8">
        <section aria-labelledby="today-title" className="grid gap-5 lg:grid-cols-[1.55fr_1fr]">
          <div className="overflow-hidden rounded-3xl border border-white/70 bg-white p-5 shadow-xl shadow-slate-900/5 sm:p-7">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-indigo-700">
              <DashboardIcon name="sparkles" className="h-4 w-4" />
              Para ti hoy
            </div>
            {continueApp ? (
              <div className="mt-5 grid items-center gap-6 sm:grid-cols-[1fr_180px]">
                <div>
                  <h2 id="today-title" className="text-2xl font-black tracking-tight text-slate-950">
                    Continúa con {continueApp.nombre}
                  </h2>
                  <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">
                    {continueApp.descripcion || 'Retoma tu actividad y sigue avanzando a tu ritmo.'}
                  </p>
                  {continueProgress && (
                    <div className="mt-5 max-w-md">
                      <div className="mb-2 flex items-center justify-between text-xs font-semibold text-slate-500">
                        <span>{continueProgress.completed} sesiones completadas</span>
                        <span>{progressPercent}%</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-indigo-600 to-sky-500"
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                    </div>
                  )}
                  <TrackedApplicationLink
                    applicationId={continueApp.id}
                    href={getApplicationEntryPath({
                      id: continueApp.id,
                      app_slug: continueApp.appSlug,
                    })}
                    className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white transition hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
                  >
                    <DashboardIcon name="play" className="h-4 w-4" />
                    Continuar
                  </TrackedApplicationLink>
                </div>
                <div className="relative hidden aspect-square overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-100 to-sky-100 sm:block">
                  {continueApp.thumbnailUrl ? (
                    <Image
                      src={continueApp.thumbnailUrl}
                      alt=""
                      fill
                      sizes="180px"
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-5xl" aria-hidden="true">
                      {appTypeIcon[continueApp.tipo] || '✦'}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="mt-5">
                <h2 id="today-title" className="text-2xl font-black tracking-tight text-slate-950">
                  Empieza por algo que te haga bien
                </h2>
                <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">
                  Tu ayuntamiento ha reunido programas y herramientas para acompañarte. Elige el que mejor encaje contigo.
                </p>
                <Link
                  href="/"
                  className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white transition hover:bg-indigo-700"
                >
                  Explorar recursos
                  <DashboardIcon name="arrow" className="h-4 w-4" />
                </Link>
              </div>
            )}
          </div>

          <div className="overflow-hidden rounded-3xl border border-white/70 bg-white shadow-xl shadow-slate-900/5">
            {upcomingInscription?.activity ? (
              <>
                <div className="relative h-28 overflow-hidden bg-gradient-to-br from-emerald-500 to-teal-700">
                  {upcomingInscription.activity.thumbnail_url && (
                    <Image
                      src={upcomingInscription.activity.thumbnail_url}
                      alt=""
                      fill
                      sizes="(max-width: 1024px) 100vw, 35vw"
                      className="object-cover opacity-80"
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/55 to-transparent" />
                  <span className="absolute bottom-3 left-5 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-white">
                    <DashboardIcon name="calendar" className="h-4 w-4" />
                    Tu próxima actividad
                  </span>
                </div>
                <div className="p-5">
                  <h2 className="text-lg font-black text-slate-950">{upcomingInscription.activity.nombre}</h2>
                  <p className="mt-2 text-sm font-semibold capitalize text-emerald-700">
                    {formatActivityDate(upcomingInscription.activity.fecha_inicio)}
                    {upcomingInscription.activity.horario_texto
                      ? ` · ${upcomingInscription.activity.horario_texto}`
                      : ''}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    {upcomingInscription.activity.modalidad === 'presencial' && 'Presencial'}
                    {upcomingInscription.activity.modalidad === 'online' && 'En línea'}
                    {upcomingInscription.activity.modalidad === 'mixta' && 'Presencial y en línea'}
                    {upcomingInscription.activity.direccion_texto
                      ? ` · ${upcomingInscription.activity.direccion_texto}`
                      : ''}
                  </p>
                  <Link
                    href={`/actividades/${upcomingInscription.activity.id}`}
                    className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-indigo-700"
                  >
                    Ver detalles
                    <DashboardIcon name="arrow" className="h-4 w-4" />
                  </Link>
                </div>
              </>
            ) : (
              <div className="flex h-full min-h-[260px] flex-col justify-between bg-gradient-to-br from-emerald-50 via-white to-sky-50 p-6">
                <div>
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                    <DashboardIcon name="calendar" className="h-6 w-6" />
                  </span>
                  <h2 className="mt-5 text-xl font-black text-slate-950">Participa en tu municipio</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Encuentra talleres, encuentros y actividades pensadas para tu comunidad.
                  </p>
                </div>
                <Link href="/actividades" className="mt-5 inline-flex items-center gap-1.5 text-sm font-bold text-emerald-800">
                  Explorar actividades
                  <DashboardIcon name="arrow" className="h-4 w-4" />
                </Link>
              </div>
            )}
          </div>
        </section>

        {usedApps.length > 0 && (
          <section className="mt-12" aria-labelledby="my-apps-title">
            <div className="mb-5 flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-indigo-700">Tu espacio</p>
                <h2 id="my-apps-title" className="mt-1 text-2xl font-black tracking-tight text-slate-950">
                  Mis programas y herramientas
                </h2>
              </div>
              <Link href="/" className="hidden items-center gap-1 text-sm font-bold text-indigo-700 sm:inline-flex">
                Ver todo
                <DashboardIcon name="arrow" className="h-4 w-4" />
              </Link>
            </div>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {usedApps.slice(0, 6).map((app) => (
                <ApplicationCard key={app.id} app={app} actionLabel="Abrir de nuevo" />
              ))}
            </div>
          </section>
        )}

        <section className="mt-12" aria-labelledby="discover-title">
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-700">Descubre</p>
              <h2 id="discover-title" className="mt-1 text-2xl font-black tracking-tight text-slate-950">
                {discoveryApps.length > 0 ? 'Algo nuevo para ti' : 'Todos tus recursos'}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {discoveryApps.length > 0
                  ? `${discoveryApps.length} ${discoveryApps.length === 1 ? 'recurso disponible' : 'recursos disponibles'} por explorar`
                  : 'Accede rápidamente a las herramientas de tu municipio'}
              </p>
            </div>
            <Link href="/" className="hidden items-center gap-1 text-sm font-bold text-indigo-700 sm:inline-flex">
              Catálogo completo
              <DashboardIcon name="arrow" className="h-4 w-4" />
            </Link>
          </div>
          {apps.length > 0 ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {(discoveryApps.length > 0 ? discoveryApps : apps).slice(0, 3).map((app) => (
                <ApplicationCard
                  key={app.id}
                  app={app}
                  actionLabel={discoveryApps.length > 0 ? 'Descubrir' : 'Abrir'}
                  prominent
                />
              ))}
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
              <p className="text-lg font-bold text-slate-800">Estamos preparando nuevos recursos para ti</p>
              <p className="mt-2 text-sm text-slate-500">Vuelve pronto para descubrir las novedades de tu municipio.</p>
            </div>
          )}
        </section>

        <section className="mt-12 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-7">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-amber-700">Tu recorrido</p>
                <h2 className="mt-1 text-xl font-black text-slate-950">Logros recientes</h2>
              </div>
              <div className="rounded-2xl bg-amber-50 px-3 py-2 text-center">
                <span className="block text-xl font-black text-amber-700">{achievementCount || 0}</span>
                <span className="block text-[10px] font-bold uppercase tracking-wide text-amber-700/70">logros</span>
              </div>
            </div>
            {achievements.length > 0 ? (
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {achievements.map((achievement) => (
                  <div key={achievement.id} className="flex items-center gap-3 rounded-2xl bg-amber-50/70 p-3.5">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-xl shadow-sm" aria-hidden="true">
                      {achievementIcon[achievement.tipo] || '⭐'}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-slate-900">
                        {achievement.descripcion || achievement.tipo}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {new Date(achievement.fecha_obtenido).toLocaleDateString('es-ES')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-5 rounded-2xl bg-slate-50 p-5">
                <p className="text-sm font-semibold text-slate-700">
                  Tus primeros logros aparecerán aquí cuando avances en los programas.
                </p>
              </div>
            )}
          </div>

          <div className="rounded-3xl bg-slate-950 p-6 text-white sm:p-7">
            <div className="flex h-full flex-col justify-between">
              <div>
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-white">
                  <DashboardIcon name="user" className="h-6 w-6" />
                </span>
                <h2 className="mt-5 text-xl font-black">Tu cuenta</h2>
                <p className="mt-1 truncate text-sm text-slate-400">{userEmail}</p>
              </div>
              <div className="mt-6 space-y-2">
                <Link
                  href="/dashboard/inscripciones"
                  className="flex min-h-11 items-center justify-between rounded-xl bg-white/10 px-4 py-3 text-sm font-bold transition hover:bg-white/15"
                >
                  Mis inscripciones
                  <DashboardIcon name="arrow" className="h-4 w-4" />
                </Link>
                <Link
                  href="/perfil"
                  className="flex min-h-11 items-center justify-between rounded-xl bg-white/10 px-4 py-3 text-sm font-bold transition hover:bg-white/15"
                >
                  Configurar perfil
                  <DashboardIcon name="arrow" className="h-4 w-4" />
                </Link>
                <div className="[&_button]:w-full [&_button]:justify-center [&_button]:border-white/15 [&_button]:bg-transparent [&_button]:text-slate-300 [&_button:hover]:bg-white/10">
                  <SignOutButton />
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <nav
        className="fixed inset-x-3 bottom-3 z-50 grid grid-cols-4 rounded-2xl border border-white/70 bg-white/95 p-1.5 shadow-2xl shadow-slate-900/15 backdrop-blur md:hidden"
        aria-label="Navegación móvil"
      >
        <Link href="/dashboard" aria-current="page" className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl bg-indigo-50 text-[11px] font-bold text-indigo-700">
          <DashboardIcon name="home" className="h-5 w-5" />
          Inicio
        </Link>
        <Link href="/" className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-semibold text-slate-500">
          <DashboardIcon name="grid" className="h-5 w-5" />
          Explorar
        </Link>
        <Link href="/actividades" className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-semibold text-slate-500">
          <DashboardIcon name="calendar" className="h-5 w-5" />
          Actividades
        </Link>
        <Link href="/perfil" className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-semibold text-slate-500">
          <DashboardIcon name="user" className="h-5 w-5" />
          Perfil
        </Link>
      </nav>
    </div>
  )
}
