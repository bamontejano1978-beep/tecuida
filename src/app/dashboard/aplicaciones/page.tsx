import Image from 'next/image'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import ApplicationLauncher, { type LauncherApplication } from '@/components/dashboard/application-launcher'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { getTenantConfigFromDB, getTenantFromHeaders } from '@/lib/tenant/headers'

export const dynamic = 'force-dynamic'

interface PublishedAppRow {
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
  completada: boolean
  program: {
    application_id: string
    total_sesiones: number
  } | null
}

function NavigationIcon({ name }: { name: 'home' | 'grid' | 'calendar' | 'user' }) {
  const common = {
    className: 'h-5 w-5',
    fill: 'none',
    viewBox: '0 0 24 24',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    'aria-hidden': true,
  }

  if (name === 'home') return <svg {...common}><path strokeLinecap="round" strokeLinejoin="round" d="m3 10.8 9-7.2 9 7.2v8.4a1.8 1.8 0 0 1-1.8 1.8H4.8A1.8 1.8 0 0 1 3 19.2v-8.4Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M9 21v-6.5h6V21" /></svg>
  if (name === 'grid') return <svg {...common}><rect x="3" y="3" width="7" height="7" rx="2" /><rect x="14" y="3" width="7" height="7" rx="2" /><rect x="3" y="14" width="7" height="7" rx="2" /><rect x="14" y="14" width="7" height="7" rx="2" /></svg>
  if (name === 'calendar') return <svg {...common}><rect x="3" y="5" width="18" height="16" rx="3" /><path strokeLinecap="round" d="M8 3v4M16 3v4M3 10h18" /></svg>
  return <svg {...common}><circle cx="12" cy="8" r="4" /><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 21a7.5 7.5 0 0 1 15 0" /></svg>
}

export default async function CitizenApplicationsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const tenantHeaders = getTenantFromHeaders()
  const tenant = tenantHeaders?.slug ? await getTenantConfigFromDB(tenantHeaders.slug) : null
  if (!tenant) redirect('/dashboard')

  const adminClient = createAdminClient()
  const [{ data: appsData }, { data: progressData }, { data: surveyData }] = await Promise.all([
    adminClient
      .from('municipality_applications')
      .select(`application_id, application:applications!inner (id, nombre, descripcion, thumbnail_url, tipo, app_slug)`)
      .eq('municipality_id', tenant.id)
      .eq('activa', true)
      .eq('publication_status', 'publicada'),
    adminClient
      .from('user_progress')
      .select(`completada, program:programs(application_id, total_sesiones)`)
      .eq('user_id', user.id)
      .limit(500),
    adminClient
      .from('survey_answers')
      .select('survey:surveys(application_id)')
      .eq('user_id', user.id)
      .limit(200),
  ])

  const progressByApp = new Map<string, { completed: number; total: number }>()
  ;((progressData || []) as unknown as ProgressRow[]).forEach((row) => {
    if (!row.program?.application_id) return
    const current = progressByApp.get(row.program.application_id) || {
      completed: 0,
      total: Math.max(row.program.total_sesiones || 1, 1),
    }
    if (row.completada) current.completed += 1
    current.total = Math.max(current.total, row.program.total_sesiones || 1)
    progressByApp.set(row.program.application_id, current)
  })

  const openedAppIds = new Set(progressByApp.keys())
  ;((surveyData || []) as unknown as { survey: { application_id: string } | null }[]).forEach((row) => {
    if (row.survey?.application_id) openedAppIds.add(row.survey.application_id)
  })

  const applications: LauncherApplication[] = ((appsData || []) as unknown as PublishedAppRow[])
    .filter((row) => row.application !== null)
    .map((row) => {
      const app = row.application!
      const progress = progressByApp.get(app.id)
      return {
        id: app.id,
        nombre: app.nombre,
        descripcion: app.descripcion || '',
        tipo: app.tipo,
        appSlug: app.app_slug,
        thumbnailUrl: app.thumbnail_url,
        opened: openedAppIds.has(app.id),
        progressPercent: progress
          ? Math.min(100, Math.round((progress.completed / progress.total) * 100))
          : null,
      }
    })
    .sort((a, b) => Number(b.opened) - Number(a.opened) || a.nombre.localeCompare(b.nombre, 'es'))

  const primary = tenant.colores_corporativos.primary || '#4338ca'
  const secondary = tenant.colores_corporativos.secondary || '#2563eb'

  return (
    <div className="min-h-screen bg-[#f6f7fb] pb-24 text-slate-900 md:pb-10">
      <header className="relative overflow-hidden text-white" style={{ background: `linear-gradient(125deg, ${primary} 0%, ${secondary} 100%)` }}>
        <div className="absolute -right-20 -top-28 h-80 w-80 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -bottom-28 left-1/4 h-64 w-64 rounded-full bg-sky-300/10 blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-4 pb-20 pt-5 sm:px-6 lg:px-8">
          <nav className="flex items-center justify-between" aria-label="Navegación principal">
            <Link href="/dashboard" className="flex min-w-0 items-center gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">
              {tenant.escudo_url ? (
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/95 p-1.5 shadow-sm">
                  <Image src={tenant.escudo_url} alt={`Escudo de ${tenant.nombre_municipio}`} width={40} height={40} className="max-h-8 w-auto" />
                </span>
              ) : (
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/15 text-lg font-black">TC</span>
              )}
              <span className="min-w-0">
                <span className="block truncate text-xs font-semibold uppercase tracking-[0.16em] text-white/70">{tenant.nombre_ayuntamiento || 'TE CUIDA'}</span>
                <span className="block truncate text-sm font-bold">Mi espacio de bienestar</span>
              </span>
            </Link>
            <div className="hidden items-center gap-1 rounded-full bg-white/10 p-1 text-sm font-semibold backdrop-blur md:flex">
              <Link href="/dashboard" className="rounded-full px-4 py-2 text-white/85 transition hover:bg-white/10 hover:text-white">Inicio</Link>
              <Link href="/dashboard/aplicaciones" aria-current="page" className="rounded-full bg-white px-4 py-2 text-slate-900 shadow-sm">Mis apps</Link>
              <Link href="/actividades" className="rounded-full px-4 py-2 text-white/85 transition hover:bg-white/10 hover:text-white">Actividades</Link>
              <Link href="/perfil" className="rounded-full px-4 py-2 text-white/85 transition hover:bg-white/10 hover:text-white">Perfil</Link>
            </div>
          </nav>

          <div className="mt-11 max-w-2xl">
            <p className="text-sm font-semibold text-white/75">Tu lanzadera personal</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Todas tus aplicaciones, en un solo lugar</h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-white/80 sm:text-base">Abre tus herramientas, retoma tus programas y descubre los recursos publicados por {tenant.nombre_municipio}.</p>
          </div>
        </div>
      </header>

      <main className="relative mx-auto -mt-12 max-w-7xl px-4 sm:px-6 lg:px-8">
        <ApplicationLauncher applications={applications} municipalityId={tenant.id} />
      </main>

      <nav className="fixed inset-x-3 bottom-3 z-50 grid grid-cols-4 rounded-2xl border border-white/70 bg-white/95 p-1.5 shadow-2xl shadow-slate-900/15 backdrop-blur md:hidden" aria-label="Navegación móvil">
        <Link href="/dashboard" className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-semibold text-slate-500"><NavigationIcon name="home" />Inicio</Link>
        <Link href="/dashboard/aplicaciones" aria-current="page" className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl bg-indigo-50 text-[11px] font-bold text-indigo-700"><NavigationIcon name="grid" />Mis apps</Link>
        <Link href="/actividades" className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-semibold text-slate-500"><NavigationIcon name="calendar" />Actividades</Link>
        <Link href="/perfil" className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-semibold text-slate-500"><NavigationIcon name="user" />Perfil</Link>
      </nav>
    </div>
  )
}
