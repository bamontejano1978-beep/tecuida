/**
 * ManageAppsForm — Client Component para gestionar apps de un municipio
 *
 * Muestra todas las apps agrupadas por categoría con checkboxes
 * para activar/desactivar.
 */

'use client'

import { useState } from 'react'

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

interface AppRow {
  id: string
  nombre: string
  descripcion: string
  tipo: string
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
  categories,
}: {
  municipalityId: string
  activeIds: Set<string>
  categories: CategoryWithApps[]
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set(activeIds))
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
          }),
        },
      )

      if (!res.ok) {
        const body = await res.json()
        throw new Error(body.error || 'Error al guardar')
      }

      setMessage({ type: 'ok', text: `Aplicaciones guardadas (${selected.size} activas).` })
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
        </div>
        <button
          onClick={handleSave}
          disabled={loading}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-50 transition-colors"
        >
          {loading ? 'Guardando...' : 'Guardar cambios'}
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
              <label
                key={app.id}
                className="flex items-start gap-3 px-5 py-4 cursor-pointer hover:bg-gray-50 transition-colors"
              >
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
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
