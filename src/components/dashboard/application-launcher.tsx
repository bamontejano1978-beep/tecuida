'use client'

import Image from 'next/image'
import { useMemo, useState } from 'react'
import TrackedApplicationLink from '@/components/analytics/tracked-application-link'
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

const typeIcons: Record<string, string> = {
  programa: '🌿',
  herramienta: '✦',
  encuesta: '✓',
  recurso: '◫',
}

const tileGradients = [
  'from-indigo-500 to-violet-700',
  'from-emerald-500 to-teal-700',
  'from-sky-500 to-blue-700',
  'from-amber-400 to-orange-600',
  'from-rose-500 to-pink-700',
  'from-cyan-500 to-indigo-700',
]

function SearchIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
      <circle cx="11" cy="11" r="7" />
      <path strokeLinecap="round" d="m16 16 4 4" />
    </svg>
  )
}

function ArrowIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4 transition group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M14 7l5 5-5 5" />
    </svg>
  )
}

export default function ApplicationLauncher({
  applications,
  municipalityId,
}: {
  applications: LauncherApplication[]
  municipalityId: string | null
}) {
  const [query, setQuery] = useState('')
  const [activeType, setActiveType] = useState('todas')

  const types = useMemo(
    () => Array.from(new Set(applications.map((app) => app.tipo))),
    [applications],
  )

  const filteredApps = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('es')
    return applications.filter((app) => {
      const matchesType = activeType === 'todas' || app.tipo === activeType
      const matchesQuery =
        !normalizedQuery ||
        app.nombre.toLocaleLowerCase('es').includes(normalizedQuery) ||
        app.descripcion.toLocaleLowerCase('es').includes(normalizedQuery)
      return matchesType && matchesQuery
    })
  }, [activeType, applications, query])

  if (applications.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center shadow-sm">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-3xl" aria-hidden="true">✦</span>
        <h2 className="mt-5 text-xl font-black text-slate-900">Próximamente tendrás nuevas aplicaciones</h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
          Tu ayuntamiento está preparando los recursos que estarán disponibles para ti.
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="flex flex-col gap-4 rounded-3xl border border-white/80 bg-white/90 p-4 shadow-lg shadow-slate-900/5 backdrop-blur sm:p-5 lg:flex-row lg:items-center lg:justify-between">
        <label className="relative block w-full lg:max-w-md">
          <span className="sr-only">Buscar una aplicación</span>
          <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-slate-400">
            <SearchIcon />
          </span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar una aplicación…"
            className="min-h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-12 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100"
          />
        </label>

        <div className="flex gap-2 overflow-x-auto pb-1" aria-label="Filtrar por tipo">
          <button
            type="button"
            onClick={() => setActiveType('todas')}
            className={`shrink-0 rounded-full px-4 py-2.5 text-sm font-bold transition ${
              activeType === 'todas'
                ? 'bg-slate-950 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Todas
          </button>
          {types.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setActiveType(type)}
              className={`shrink-0 rounded-full px-4 py-2.5 text-sm font-bold transition ${
                activeType === type
                  ? 'bg-slate-950 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {typeLabels[type] || type}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-8 flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-indigo-700">Tu colección</p>
          <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950">Aplicaciones disponibles</h2>
        </div>
        <p className="text-sm font-semibold text-slate-500">
          {filteredApps.length} {filteredApps.length === 1 ? 'aplicación' : 'aplicaciones'}
        </p>
      </div>

      {filteredApps.length > 0 ? (
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredApps.map((app, index) => (
            <TrackedApplicationLink
              key={app.id}
              applicationId={app.id}
              municipalityId={municipalityId}
              href={getApplicationEntryPath({ id: app.id, app_slug: app.appSlug })}
              className="group flex min-h-[270px] flex-col rounded-3xl border border-slate-200 bg-white p-3 shadow-sm transition duration-200 hover:-translate-y-1 hover:border-slate-300 hover:shadow-xl hover:shadow-slate-900/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
            >
              <div className={`relative aspect-[4/3] overflow-hidden rounded-2xl bg-gradient-to-br ${tileGradients[index % tileGradients.length]}`}>
                {app.thumbnailUrl ? (
                  <Image
                    src={app.thumbnailUrl}
                    alt=""
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                    className="object-cover transition duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-5xl text-white" aria-hidden="true">
                    {typeIcons[app.tipo] || '✦'}
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/35 via-transparent to-transparent" />
                <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-slate-700 shadow-sm backdrop-blur">
                  {app.opened ? 'En uso' : 'Nueva'}
                </span>
              </div>

              <div className="flex flex-1 flex-col px-2 pb-2 pt-4">
                <p className="text-xs font-bold uppercase tracking-wide text-indigo-600">
                  {typeLabels[app.tipo]?.replace(/s$/, '') || 'Aplicación'}
                </p>
                <h3 className="mt-1 line-clamp-1 text-lg font-black text-slate-950">{app.nombre}</h3>
                <p className="mt-1 line-clamp-2 text-sm leading-5 text-slate-500">
                  {app.descripcion || 'Un recurso de bienestar disponible para ti.'}
                </p>
                {app.progressPercent !== null && (
                  <div className="mt-4">
                    <div className="mb-1.5 flex justify-between text-[11px] font-bold text-slate-500">
                      <span>Tu progreso</span>
                      <span>{app.progressPercent}%</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-gradient-to-r from-indigo-600 to-sky-500" style={{ width: `${app.progressPercent}%` }} />
                    </div>
                  </div>
                )}
                <span className="mt-auto inline-flex items-center gap-1.5 pt-4 text-sm font-black text-slate-900">
                  {app.opened ? 'Continuar' : 'Abrir aplicación'}
                  <ArrowIcon />
                </span>
              </div>
            </TrackedApplicationLink>
          ))}
        </div>
      ) : (
        <div className="mt-5 rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
          <p className="font-bold text-slate-800">No hemos encontrado ninguna aplicación</p>
          <button type="button" onClick={() => { setQuery(''); setActiveType('todas') }} className="mt-3 text-sm font-bold text-indigo-700 hover:text-indigo-900">
            Limpiar búsqueda
          </button>
        </div>
      )}
    </>
  )
}
