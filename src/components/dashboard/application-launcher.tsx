'use client'

import Image from 'next/image'
import { type CSSProperties, useMemo, useState } from 'react'
import TrackedApplicationLink from '@/components/analytics/tracked-application-link'
import PwaInstallLauncher from '@/components/ui/pwa-install-launcher'
import { getApplicationEntryPath } from '@/lib/application-links'

export interface LauncherApplication {
  id: string
  nombre: string
  descripcion: string
  tipo: string
  appSlug: string | null
  thumbnailUrl: string | null
  opened: boolean
  progressPercent: number | null
}

const typeLabels: Record<string, string> = {
  programa: 'Programas',
  herramienta: 'Herramientas',
  encuesta: 'Encuestas',
  recurso: 'Recursos',
}

const typeStyles: Record<string, { background: string; foreground: string }> = {
  programa: { background: '#ecfdf5', foreground: '#047857' },
  herramienta: { background: '#eff6ff', foreground: '#1d4ed8' },
  encuesta: { background: '#fff7ed', foreground: '#c2410c' },
  recurso: { background: '#f5f3ff', foreground: '#6d28d9' },
}

const tileBackgrounds = [
  'bg-slate-900',
  'bg-emerald-800',
  'bg-blue-800',
  'bg-amber-700',
  'bg-rose-800',
  'bg-cyan-800',
]

const statusFilters = [
  { id: 'todas', label: 'Todas' },
  { id: 'en-uso', label: 'En uso' },
  { id: 'progreso', label: 'Con progreso' },
  { id: 'nuevas', label: 'Por descubrir' },
] as const

type StatusFilter = (typeof statusFilters)[number]['id']
type IconName = 'apps' | 'arrow' | 'check' | 'clock' | 'compass' | 'search' | 'sparkles'

function normalizeSearch(value: string) {
  return value
    .trim()
    .toLocaleLowerCase('es')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function LauncherIcon({ name, className = 'h-5 w-5' }: { name: IconName; className?: string }) {
  const common = {
    'aria-hidden': true,
    className,
    fill: 'none',
    viewBox: '0 0 24 24',
    stroke: 'currentColor',
    strokeWidth: 1.8,
  }

  if (name === 'search') return <svg {...common}><circle cx="11" cy="11" r="7" /><path strokeLinecap="round" d="m16 16 4 4" /></svg>
  if (name === 'arrow') return <svg {...common}><path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M14 7l5 5-5 5" /></svg>
  if (name === 'check') return <svg {...common}><path strokeLinecap="round" strokeLinejoin="round" d="m5 12 4 4L19 6" /></svg>
  if (name === 'clock') return <svg {...common}><circle cx="12" cy="12" r="9" /><path strokeLinecap="round" d="M12 7v5l3 2" /></svg>
  if (name === 'compass') return <svg {...common}><circle cx="12" cy="12" r="9" /><path strokeLinecap="round" strokeLinejoin="round" d="m15.5 8.5-2 5-5 2 2-5 5-2Z" /></svg>
  if (name === 'sparkles') return <svg {...common}><path strokeLinecap="round" strokeLinejoin="round" d="M12 3c.5 3.2 2.3 5 5.5 5.5-3.2.5-5 2.3-5.5 5.5-.5-3.2-2.3-5-5.5-5.5C9.7 8 11.5 6.2 12 3ZM18.5 15c.2 1.4 1.1 2.3 2.5 2.5-1.4.2-2.3 1.1-2.5 2.5-.2-1.4-1.1-2.3-2.5-2.5 1.4-.2 2.3-1.1 2.5-2.5Z" /></svg>
  return <svg {...common}><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></svg>
}

function SummaryItem({ icon, label, value, detail }: { icon: IconName; label: string; value: number; detail: string }) {
  return (
    <div className="flex min-w-0 items-center gap-3 px-4 py-4 sm:px-5">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700"><LauncherIcon name={icon} /></span>
      <div className="min-w-0">
        <div className="flex items-baseline gap-2"><span className="text-2xl font-bold text-slate-950">{value}</span><span className="truncate text-sm font-semibold text-slate-800">{label}</span></div>
        <p className="truncate text-xs text-slate-500">{detail}</p>
      </div>
    </div>
  )
}

export default function ApplicationLauncher({
  applications,
  municipalityId,
  municipalityName,
  primaryColor,
}: {
  applications: LauncherApplication[]
  municipalityId: string | null
  municipalityName: string
  primaryColor: string
}) {
  const [query, setQuery] = useState('')
  const [activeType, setActiveType] = useState('todas')
  const [activeStatus, setActiveStatus] = useState<StatusFilter>('todas')
  const launcherStyle = { '--launcher-accent': primaryColor } as CSSProperties

  const types = useMemo(() => Array.from(new Set(applications.map((app) => app.tipo))), [applications])
  const typeCounts = useMemo(() => {
    const counts = new Map<string, number>()
    applications.forEach((app) => counts.set(app.tipo, (counts.get(app.tipo) || 0) + 1))
    return counts
  }, [applications])
  const statusCounts = useMemo(() => {
    const enUso = applications.filter((app) => app.opened).length
    const progreso = applications.filter((app) => app.progressPercent !== null).length
    return { todas: applications.length, 'en-uso': enUso, progreso, nuevas: applications.length - enUso } satisfies Record<StatusFilter, number>
  }, [applications])

  const filteredApps = useMemo(() => {
    const normalizedQuery = normalizeSearch(query)
    return applications.filter((app) => {
      const matchesType = activeType === 'todas' || app.tipo === activeType
      const matchesStatus = activeStatus === 'todas' || (activeStatus === 'en-uso' && app.opened) || (activeStatus === 'progreso' && app.progressPercent !== null) || (activeStatus === 'nuevas' && !app.opened)
      const matchesQuery = !normalizedQuery || normalizeSearch(app.nombre).includes(normalizedQuery) || normalizeSearch(app.descripcion).includes(normalizedQuery)
      return matchesType && matchesStatus && matchesQuery
    })
  }, [activeStatus, activeType, applications, query])

  const hasActiveFilters = activeType !== 'todas' || activeStatus !== 'todas' || query.trim().length > 0
  function clearFilters() {
    setQuery('')
    setActiveType('todas')
    setActiveStatus('todas')
  }

  if (applications.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 bg-white px-6 py-16 text-center shadow-sm">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-lg bg-slate-100 text-slate-600" aria-hidden="true"><LauncherIcon name="sparkles" className="h-7 w-7" /></span>
        <h2 className="mt-5 text-xl font-bold text-slate-950">Próximamente tendrás nuevas aplicaciones</h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">Tu ayuntamiento está preparando los recursos que estarán disponibles para ti.</p>
      </div>
    )
  }

  return (
    <div style={launcherStyle}>
      <PwaInstallLauncher municipalityName={municipalityName} primaryColor={primaryColor} />

      <section aria-label="Resumen de tus aplicaciones" className="grid overflow-hidden rounded-lg border border-slate-200 bg-white shadow-[0_10px_35px_rgba(15,23,42,0.06)] sm:grid-cols-3 sm:divide-x sm:divide-slate-200">
        <SummaryItem icon="clock" label="En uso" value={statusCounts['en-uso']} detail="Listas para retomar" />
        <div className="border-t border-slate-200 sm:border-t-0"><SummaryItem icon="check" label="Con progreso" value={statusCounts.progreso} detail="Con avance guardado" /></div>
        <div className="border-t border-slate-200 sm:border-t-0"><SummaryItem icon="compass" label="Por descubrir" value={statusCounts.nuevas} detail="Nuevas para ti" /></div>
      </section>

      <section aria-label="Buscar y filtrar aplicaciones" className="mt-5 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="grid gap-5 lg:grid-cols-[minmax(260px,0.85fr)_1.15fr] lg:items-end">
          <label className="block">
            <span className="mb-2 block text-xs font-bold uppercase text-slate-500">Buscar</span>
            <span className="relative block">
              <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-slate-400"><LauncherIcon name="search" /></span>
              <input aria-label="Buscar una aplicación" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Nombre o descripción" className="min-h-11 w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-11 pr-4 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-[color:var(--launcher-accent)] focus:ring-2 focus:ring-[color:var(--launcher-accent)] focus:ring-opacity-20" />
            </span>
          </label>

          <div>
            <p className="mb-2 text-xs font-bold uppercase text-slate-500">Estado</p>
            <div className="flex gap-1 overflow-x-auto rounded-lg bg-slate-100 p-1" aria-label="Filtrar por estado">
              {statusFilters.map((status) => (
                <button key={status.id} type="button" aria-pressed={activeStatus === status.id} onClick={() => setActiveStatus(status.id)} className={`flex min-h-9 shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold transition ${activeStatus === status.id ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-600 hover:text-slate-950'}`}>
                  {status.label}<span className={`text-xs ${activeStatus === status.id ? 'text-[color:var(--launcher-accent)]' : 'text-slate-400'}`}>{statusCounts[status.id]}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4 border-t border-slate-100 pt-4">
          <div className="flex items-center gap-2 overflow-x-auto" aria-label="Filtrar por tipo">
            <span className="shrink-0 text-xs font-bold uppercase text-slate-500">Tipo</span>
            <button type="button" aria-pressed={activeType === 'todas'} onClick={() => setActiveType('todas')} className={`shrink-0 rounded-md border px-3 py-1.5 text-xs font-semibold transition ${activeType === 'todas' ? 'border-[color:var(--launcher-accent)] bg-[color:var(--launcher-accent)] text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'}`}>Todas · {applications.length}</button>
            {types.map((type) => (
              <button key={type} type="button" aria-pressed={activeType === type} onClick={() => setActiveType(type)} className={`shrink-0 rounded-md border px-3 py-1.5 text-xs font-semibold transition ${activeType === type ? 'border-[color:var(--launcher-accent)] bg-[color:var(--launcher-accent)] text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'}`}>{typeLabels[type] || type} · {typeCounts.get(type) || 0}</button>
            ))}
          </div>
        </div>
      </section>

      <div className="mt-9 flex items-end justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <p className="text-xs font-bold uppercase text-[color:var(--launcher-accent)]">Tu colección</p>
          <h2 className="mt-1 text-2xl font-bold text-slate-950">
            {activeStatus === 'en-uso' && 'Aplicaciones en uso'}
            {activeStatus === 'progreso' && 'Aplicaciones con progreso'}
            {activeStatus === 'nuevas' && 'Aplicaciones por descubrir'}
            {activeStatus === 'todas' && 'Aplicaciones disponibles'}
          </h2>
        </div>
        <div className="shrink-0 text-right">
          <p aria-live="polite" className="text-sm font-semibold text-slate-500">{filteredApps.length} {filteredApps.length === 1 ? 'aplicación' : 'aplicaciones'}</p>
          {hasActiveFilters && <button type="button" onClick={clearFilters} className="mt-1 text-xs font-bold text-[color:var(--launcher-accent)] hover:underline">Limpiar filtros</button>}
        </div>
      </div>

      {filteredApps.length > 0 ? (
        <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredApps.map((app, index) => {
            const typeStyle = typeStyles[app.tipo] || { background: '#f1f5f9', foreground: '#334155' }
            return (
              <TrackedApplicationLink key={app.id} applicationId={app.id} municipalityId={municipalityId} href={getApplicationEntryPath({ id: app.id, app_slug: app.appSlug })} className="group flex min-h-[318px] flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-[0_4px_18px_rgba(15,23,42,0.05)] transition duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_14px_32px_rgba(15,23,42,0.11)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--launcher-accent)] focus-visible:ring-offset-2">
                <div className={`relative aspect-[16/9] overflow-hidden ${tileBackgrounds[index % tileBackgrounds.length]}`}>
                  {app.thumbnailUrl ? (
                    <Image src={app.thumbnailUrl} alt="" fill sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw" className="object-cover transition duration-300 group-hover:scale-[1.025]" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-white/90" aria-hidden="true"><LauncherIcon name="apps" className="h-11 w-11" /></div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/50 via-transparent to-slate-950/5" />
                  <span className="absolute left-3 top-3 rounded-md bg-white/95 px-2.5 py-1 text-[10px] font-bold uppercase text-slate-700 shadow-sm backdrop-blur">{app.opened ? 'En uso' : 'Por descubrir'}</span>
                  {app.progressPercent !== null && <span className="absolute bottom-3 right-3 rounded-md bg-slate-950/85 px-2.5 py-1 text-[10px] font-bold text-white backdrop-blur">{app.progressPercent}% completado</span>}
                </div>

                <div className="flex flex-1 flex-col p-4">
                  <span className="w-fit rounded px-2 py-1 text-[10px] font-bold uppercase" style={{ backgroundColor: typeStyle.background, color: typeStyle.foreground }}>{typeLabels[app.tipo]?.replace(/s$/, '') || 'Aplicación'}</span>
                  <h3 className="mt-3 line-clamp-1 text-lg font-bold text-slate-950">{app.nombre}</h3>
                  <p className="mt-1.5 line-clamp-2 text-sm leading-5 text-slate-500">{app.descripcion || 'Un recurso de bienestar disponible para ti.'}</p>
                  {app.progressPercent !== null && (
                    <div className="mt-4" aria-label={`Progreso: ${app.progressPercent}%`}>
                      <div className="mb-1.5 flex justify-between text-[11px] font-semibold text-slate-500"><span>Tu progreso</span><span>{app.progressPercent}%</span></div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-[color:var(--launcher-accent)]" style={{ width: `${app.progressPercent}%` }} /></div>
                    </div>
                  )}
                  <span className="mt-auto flex items-center justify-between border-t border-slate-100 pt-3 text-sm font-bold text-slate-900">{app.opened ? 'Continuar' : 'Abrir aplicación'}<LauncherIcon name="arrow" className="h-4 w-4 transition group-hover:translate-x-0.5" /></span>
                </div>
              </TrackedApplicationLink>
            )
          })}
        </div>
      ) : (
        <div className="mt-5 rounded-lg border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
          <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-lg bg-slate-100 text-slate-500"><LauncherIcon name="search" /></span>
          <p className="mt-4 font-bold text-slate-900">No hemos encontrado ninguna aplicación</p>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">Prueba con otra palabra o cambia los filtros de estado y tipo.</p>
          <button type="button" onClick={clearFilters} className="mt-4 rounded-md border border-slate-300 px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50">Limpiar búsqueda</button>
        </div>
      )}
    </div>
  )
}
