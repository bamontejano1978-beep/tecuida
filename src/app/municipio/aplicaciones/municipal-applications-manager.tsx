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

export default function MunicipalApplicationsManager({
  initialApps,
}: {
  initialApps: MunicipalApplicationItem[]
}) {
  const [apps, setApps] = useState(initialApps)
  const [loadingId, setLoadingId] = useState<string | null>(null)
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
      }

      setApps((current) =>
        current.map((app) =>
          app.application_id === updated.application_id
            ? {
                ...app,
                publication_status: updated.publication_status,
                published_at: updated.published_at,
                hidden_at: updated.hidden_at,
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
