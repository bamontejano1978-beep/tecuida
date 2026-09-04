'use client'

import { useMemo, useState } from 'react'

export type PublicationStatus = 'disponible' | 'publicada' | 'oculta'

export interface MunicipalApplicationItem {
  application_id: string
  publication_status: PublicationStatus
  published_at: string | null
  hidden_at: string | null
  thumbnail_url_override: string | null
  application: {
    id: string
    nombre: string
    descripcion: string
    thumbnail_url: string | null
    tipo: string
    category_id: string | null
  }
  categoryName: string
}

const statusLabel: Record<PublicationStatus, string> = {
  disponible: 'Pendiente',
  publicada: 'Publicada',
  oculta: 'Oculta',
}

const statusClass: Record<PublicationStatus, string> = {
  disponible: 'bg-amber-50 text-amber-800 border-amber-200',
  publicada: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  oculta: 'bg-gray-100 text-gray-600 border-gray-200',
}

const statusAdvice: Record<PublicationStatus, string> = {
  disponible: 'Revísala antes de enseñarla en la landing pública.',
  publicada: 'Visible para la ciudadanía en la landing y la lanzadera.',
  oculta: 'Asignada al municipio, pero fuera de la oferta pública.',
}

const typeLabel: Record<string, string> = {
  programa: 'Programa',
  herramienta: 'Herramienta',
  encuesta: 'Encuesta',
  recurso: 'Recurso',
}

function formatDate(value: string | null): string {
  if (!value) return 'Todavía no'
  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(value))
}

export default function MunicipalApplicationsManager({
  initialApps,
}: {
  initialApps: MunicipalApplicationItem[]
}) {
  const [apps, setApps] = useState(initialApps)
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [iconLoadingId, setIconLoadingId] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: 'ok' | 'error'; text: string } | null>(null)

  const totals = useMemo(
    () => ({
      available: apps.filter((app) => app.publication_status === 'disponible').length,
      published: apps.filter((app) => app.publication_status === 'publicada').length,
      hidden: apps.filter((app) => app.publication_status === 'oculta').length,
    }),
    [apps],
  )

  async function updateStatus(applicationId: string, status: 'publicada' | 'oculta') {
    setLoadingId(applicationId)
    setMessage(null)

    try {
      const response = await fetch('/api/municipio/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ application_id: applicationId, status }),
      })

      if (!response.ok) {
        const body = await response.json().catch(() => ({}))
        throw new Error(body.error || 'No se pudo actualizar la publicación.')
      }

      const body = await response.json()
      const updated = body.data as {
        application_id: string
        publication_status: PublicationStatus
        published_at: string | null
        hidden_at: string | null
        thumbnail_url_override: string | null
      }

      setApps((current) =>
        current.map((app) =>
          app.application_id === updated.application_id
            ? {
                ...app,
                publication_status: updated.publication_status,
                published_at: updated.published_at,
                hidden_at: updated.hidden_at,
                thumbnail_url_override: updated.thumbnail_url_override,
              }
            : app,
        ),
      )
      setMessage({
        type: 'ok',
        text:
          status === 'publicada'
            ? 'Aplicación publicada en la landing municipal.'
            : 'Aplicación ocultada de la landing municipal.',
      })
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Error inesperado.',
      })
    } finally {
      setLoadingId(null)
    }
  }

  async function saveIconOverride(applicationId: string, iconUrl: string | null) {
    setIconLoadingId(applicationId)
    setMessage(null)

    try {
      const response = await fetch('/api/municipio/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          application_id: applicationId,
          thumbnail_url_override: iconUrl,
        }),
      })

      if (!response.ok) {
        const body = await response.json().catch(() => ({}))
        throw new Error(body.error || 'No se pudo guardar el icono personalizado.')
      }

      const body = await response.json()
      const updated = body.data as {
        application_id: string
        thumbnail_url_override: string | null
      }

      setApps((current) =>
        current.map((app) =>
          app.application_id === updated.application_id
            ? { ...app, thumbnail_url_override: updated.thumbnail_url_override }
            : app,
        ),
      )
      setMessage({
        type: 'ok',
        text: iconUrl
          ? 'Icono personalizado actualizado.'
          : 'Icono personalizado eliminado. Se usará el icono global.',
      })
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Error inesperado.',
      })
    } finally {
      setIconLoadingId(null)
    }
  }

  async function uploadIcon(applicationId: string, file: File | null) {
    if (!file) return
    setIconLoadingId(applicationId)
    setMessage(null)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('applicationId', applicationId)

      const response = await fetch('/api/municipio/applications/icon', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const body = await response.json().catch(() => ({}))
        throw new Error(body.error || 'No se pudo subir el icono personalizado.')
      }

      const body = (await response.json()) as { publicUrl: string }
      await saveIconOverride(applicationId, body.publicUrl)
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Error inesperado.',
      })
      setIconLoadingId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Pendientes" value={totals.available} tone="amber" />
        <StatCard label="Publicadas" value={totals.published} tone="emerald" />
        <StatCard label="Ocultas" value={totals.hidden} tone="gray" />
      </div>

      {message && (
        <div
          className={`rounded-lg border px-4 py-3 text-sm ${
            message.type === 'ok'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'border-red-200 bg-red-50 text-red-700'
          }`}
        >
          {message.text}
        </div>
      )}

      {apps.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center">
          <p className="text-sm font-medium text-gray-900">Aún no hay aplicaciones entregadas.</p>
          <p className="mt-1 text-sm text-gray-500">
            Cuando TE CUIDA asigne aplicaciones a tu municipio, aparecerán aquí.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <div className="divide-y divide-gray-100">
            {apps.map((item) => {
              const thumbnail = item.thumbnail_url_override || item.application.thumbnail_url
              const isLoading = loadingId === item.application_id
              const isIconLoading = iconLoadingId === item.application_id
              return (
                <article key={item.application_id} className="p-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                    <div className="flex items-start gap-4 sm:flex-1">
                      {thumbnail ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={thumbnail}
                          alt=""
                          className="h-16 w-16 rounded-xl border border-gray-200 object-cover"
                        />
                      ) : (
                        <div className="grid h-16 w-16 place-items-center rounded-xl border border-dashed border-gray-300 bg-gray-50 text-2xl">
                          📱
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-base font-semibold text-gray-900">
                            {item.application.nombre}
                          </h2>
                          <span
                            className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${statusClass[item.publication_status]}`}
                          >
                            {statusLabel[item.publication_status]}
                          </span>
                        </div>
                        <p className="mt-1 text-xs font-medium uppercase tracking-wide text-gray-400">
                          {item.categoryName} · {item.application.tipo}
                        </p>
                        <p className="mt-2 text-sm leading-6 text-gray-600">
                          {item.application.descripcion || 'Sin descripción disponible.'}
                        </p>
                        <div className="mt-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                Ficha descriptiva
                              </p>
                              <h3 className="mt-1 text-sm font-semibold text-slate-950">
                                {item.application.nombre}
                              </h3>
                            </div>
                            <span
                              className={`inline-flex w-fit rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClass[item.publication_status]}`}
                            >
                              {statusLabel[item.publication_status]}
                            </span>
                          </div>
                          <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                            <FichaItem label="Categoría" value={item.categoryName} />
                            <FichaItem
                              label="Tipo"
                              value={typeLabel[item.application.tipo] || item.application.tipo}
                            />
                            <FichaItem
                              label="Publicada desde"
                              value={formatDate(item.published_at)}
                            />
                            <FichaItem
                              label="Icono"
                              value={item.thumbnail_url_override ? 'Personalizado' : 'Global'}
                            />
                          </dl>
                          <div className="mt-3 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                              Qué hace
                            </p>
                            <p className="mt-1 text-sm leading-5 text-slate-700">
                              {item.application.descripcion || 'Aplicación municipal disponible para la ciudadanía.'}
                            </p>
                          </div>
                          <div className="mt-4 rounded-lg bg-slate-50 px-3 py-2">
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                              Uso recomendado
                            </p>
                            <p className="mt-1 text-sm leading-5 text-slate-600">
                              {statusAdvice[item.publication_status]}
                            </p>
                          </div>
                        </div>
                        <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-3">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                                Icono en tu municipio
                              </p>
                              <p className="mt-1 text-xs text-gray-500">
                                Personaliza cómo se verá esta app en la landing y en la lanzadera ciudadana.
                              </p>
                            </div>
                            {item.thumbnail_url_override && (
                              <button
                                type="button"
                                disabled={isIconLoading}
                                onClick={() => saveIconOverride(item.application_id, null)}
                                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                              >
                                Quitar personalizado
                              </button>
                            )}
                          </div>
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/svg+xml,image/webp"
                            disabled={isIconLoading}
                            onChange={(event) => uploadIcon(item.application_id, event.target.files?.[0] ?? null)}
                            className="mt-3 block w-full text-xs text-gray-500 file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-indigo-700 hover:file:bg-indigo-100 disabled:opacity-50"
                          />
                          {isIconLoading && (
                            <p className="mt-2 text-xs font-medium text-indigo-600">Guardando icono...</p>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex shrink-0 gap-2 sm:flex-col">
                      {item.publication_status !== 'publicada' && (
                        <button
                          type="button"
                          disabled={isLoading}
                          onClick={() => updateStatus(item.application_id, 'publicada')}
                          className="inline-flex min-h-10 items-center justify-center rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
                        >
                          {isLoading ? 'Guardando...' : 'Publicar'}
                        </button>
                      )}
                      {item.publication_status === 'publicada' && (
                        <button
                          type="button"
                          disabled={isLoading}
                          onClick={() => updateStatus(item.application_id, 'oculta')}
                          className="inline-flex min-h-10 items-center justify-center rounded-lg border border-gray-300 px-4 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                        >
                          {isLoading ? 'Guardando...' : 'Ocultar'}
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function FichaItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </dt>
      <dd className="mt-1 truncate text-sm font-semibold text-slate-900">
        {value}
      </dd>
    </div>
  )
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone: 'amber' | 'emerald' | 'gray'
}) {
  const styles = {
    amber: 'border-amber-200 bg-amber-50 text-amber-800',
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    gray: 'border-gray-200 bg-white text-gray-700',
  }

  return (
    <div className={`rounded-xl border p-4 ${styles[tone]}`}>
      <p className="text-xs font-semibold uppercase tracking-wide opacity-75">{label}</p>
      <p className="mt-1 text-3xl font-bold">{value}</p>
    </div>
  )
}
