/**
 * ManageAppsForm — Client Component para gestionar apps de un municipio
 *
 * Muestra todas las apps agrupadas por categoría con checkboxes
 * para entregar o retirar del municipio.
 */

'use client'

import AppThumbnailUploader from '@/components/ui/app-thumbnail-uploader'
import { useState } from 'react'

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

interface AppRow {
  id: string
  nombre: string
  descripcion: string
  tipo: string
  thumbnail_url: string | null
}

interface CategoryWithApps {
  id: string
  nombre: string
  apps: AppRow[]
}

// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------

const tierBadge: Record<string, string> = {
  programa: 'bg-indigo-100 text-indigo-700',
  herramienta: 'bg-blue-100 text-blue-700',
  encuesta: 'bg-amber-100 text-amber-800',
  recurso: 'bg-emerald-100 text-emerald-700',
}

export default function ManageAppsForm({
  municipalityId,
  activeIds,
  thumbnailOverrides,
  categories,
}: {
  municipalityId: string
  activeIds: Set<string>
  thumbnailOverrides: Record<string, string>
  categories: CategoryWithApps[]
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set(activeIds))
  const [overrides, setOverrides] = useState<Record<string, string>>(
    thumbnailOverrides,
  )
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'ok' | 'error'; text: string } | null>(null)

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function updateOverride(appId: string, url: string) {
    setOverrides((previous) => {
      const next = { ...previous }
      if (url) next[appId] = url
      else delete next[appId]
      return next
    })
  }

  async function handleSave() {
    setLoading(true)
    setMessage(null)

    try {
      const res = await fetch(
        `/api/admin/municipalities/${municipalityId}/applications`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            municipality_id: municipalityId,
            application_ids: Array.from(selected),
            thumbnail_overrides: Object.fromEntries(
              Object.entries(overrides).filter(([appId]) => selected.has(appId)),
            ),
          }),
        },
      )

      if (!res.ok) {
        const body = await res.json()
        throw new Error(body.error || 'Error al guardar')
      }

      setMessage({ type: 'ok', text: `Aplicaciones entregadas (${selected.size}).` })
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Error inesperado',
      })
    } finally {
      setLoading(false)
    }
  }

  const totalApps = categories.reduce((sum, c) => sum + c.apps.length, 0)

  return (
    <div className="space-y-6">
      {/* Resumen */}
      <div className="flex items-center justify-between bg-white rounded-xl border border-gray-200 p-4">
        <div>
          <p className="text-sm font-medium text-gray-900">
            {selected.size} de {totalApps} aplicaciones seleccionadas
          </p>
          <p className="mt-1 text-xs text-gray-500">
            Las nuevas aplicaciones quedan pendientes hasta que el gestor
            municipal las publique.
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={loading}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-50 transition-colors"
        >
          {loading ? 'Guardando...' : 'Guardar entrega'}
        </button>
      </div>

      {message && (
        <div
          className={`rounded-md p-3 ${
            message.type === 'ok'
              ? 'bg-emerald-50 border border-emerald-200'
              : 'bg-red-50 border border-red-200'
          }`}
        >
          <p
            className={`text-sm ${
              message.type === 'ok' ? 'text-emerald-700' : 'text-red-700'
            }`}
          >
            {message.text}
          </p>
        </div>
      )}

      {/* Apps por categoría */}
      {categories.map((cat) => (
        <div
          key={cat.id}
          className="bg-white rounded-xl border border-gray-200 overflow-hidden"
        >
          <div className="px-5 py-3 bg-gray-50 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-700">{cat.nombre}</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {cat.apps.map((app) => (
              <div
                key={app.id}
                className="px-5 py-4 hover:bg-gray-50 transition-colors"
              >
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selected.has(app.id)}
                    onChange={() => toggle(app.id)}
                    className="mt-0.5 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-gray-900">{app.nombre}</p>
                      <span
                        className={`inline-flex items-center rounded-full px-1.5 py-0 text-xs font-medium ${
                          tierBadge[app.tipo] || tierBadge.programa
                        }`}
                      >
                        {app.tipo}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-gray-500 line-clamp-2">
                      {app.descripcion || 'Sin descripción'}
                    </p>
                  </div>
                </label>

                {selected.has(app.id) && (
                  <div className="mt-4 ml-7 rounded-lg border border-indigo-100 bg-indigo-50/50 p-4">
                    <div className="mb-3 flex items-center gap-3">
                      {(overrides[app.id] || app.thumbnail_url) ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={overrides[app.id] || app.thumbnail_url || ''}
                          alt={`Icono mostrado para ${app.nombre}`}
                          className="h-14 w-14 rounded-xl border border-gray-200 bg-white object-cover"
                        />
                      ) : (
                        <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-dashed border-gray-300 bg-white text-xl">
                          📱
                        </div>
                      )}
                      <div>
                        <p className="text-xs font-semibold text-gray-700">
                          Icono en este municipio
                        </p>
                        <p className="text-xs text-gray-500">
                          {overrides[app.id]
                            ? 'Personalizado; solo se verá en la landing y el catálogo municipal.'
                            : 'Se está utilizando el icono global de la aplicación.'}
                        </p>
                      </div>
                    </div>

                    <AppThumbnailUploader
                      currentUrl={overrides[app.id] || ''}
                      appSlug={`municipalities/${municipalityId}/${app.id}`}
                      onUploaded={(url) => updateOverride(app.id, url)}
                      mode="clear"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
