/**
 * BulkAssignForm — Client Component para asignación masiva
 *
 * Permite seleccionar una aplicación y marcar/desmarcar
 * los municipios que deben tenerla activa.
 */

'use client'

import { useState, useMemo } from 'react'

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

interface AppRow {
  id: string
  nombre: string
  tipo: string
  nivel_suscripcion: string
}

interface MunicipalityRow {
  id: string
  nombre_municipio: string
  slug: string
  tipo_suscripcion: string
}

// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------

const tierBadge: Record<string, string> = {
  basico: 'bg-gray-100 text-gray-600',
  estandar: 'bg-blue-100 text-blue-700',
  premium: 'bg-amber-100 text-amber-800',
}

const statusBadge: Record<string, string> = {
  basico: 'border-gray-200 text-gray-500',
  estandar: 'border-blue-200 text-blue-600',
  premium: 'border-amber-200 text-amber-600',
}

export default function BulkAssignForm({
  apps,
  municipalities,
  assignmentMap,
}: {
  apps: AppRow[]
  municipalities: MunicipalityRow[]
  assignmentMap: Record<string, string[]>
}) {
  const [selectedAppId, setSelectedAppId] = useState<string>('')
  const [selectedMunIds, setSelectedMunIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'ok' | 'error'; text: string } | null>(null)

  // Cuando el usuario cambia de app, precargar sus municipios actuales
  function handleAppChange(appId: string) {
    setSelectedAppId(appId)
    setMessage(null)

    if (appId && assignmentMap[appId]) {
      setSelectedMunIds(new Set(assignmentMap[appId]))
    } else {
      setSelectedMunIds(new Set())
    }
  }

  function toggleMunicipality(id: string) {
    setSelectedMunIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function selectAll() {
    setSelectedMunIds(new Set(municipalities.map((m) => m.id)))
  }

  function deselectAll() {
    setSelectedMunIds(new Set())
  }

  async function handleSave() {
    if (!selectedAppId) return

    setLoading(true)
    setMessage(null)

    try {
      const res = await fetch(
        `/api/admin/applications/${selectedAppId}/bulk`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            municipality_ids: Array.from(selectedMunIds),
          }),
        },
      )

      if (!res.ok) {
        const body = await res.json()
        throw new Error(body.error || 'Error al guardar')
      }

      const body = await res.json()
      setMessage({
        type: 'ok',
        text: body.message || `Asignado a ${selectedMunIds.size} municipios.`,
      })
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Error inesperado',
      })
    } finally {
      setLoading(false)
    }
  }

  const selectedApp = apps.find((a) => a.id === selectedAppId)
  const previouslyAssigned = selectedAppId
    ? assignmentMap[selectedAppId]?.length || 0
    : 0

  // Agrupar municipios por tipo de suscripción
  const grouped = useMemo(() => {
    const groups: Record<string, MunicipalityRow[]> = {}
    municipalities.forEach((m) => {
      const tier = m.tipo_suscripcion || 'basico'
      if (!groups[tier]) groups[tier] = []
      groups[tier].push(m)
    })
    return groups
  }, [municipalities])

  const tierOrder = ['premium', 'estandar', 'basico']
  const tierLabels: Record<string, string> = {
    premium: 'Premium',
    estandar: 'Estándar',
    basico: 'Básico',
  }

  return (
    <div className="space-y-6">
      {/* Selector de aplicación */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <label
          htmlFor="app-select"
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          Selecciona una aplicación
        </label>
        <select
          id="app-select"
          value={selectedAppId}
          onChange={(e) => handleAppChange(e.target.value)}
          className="block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
        >
          <option value="">— Elige una aplicación —</option>
          {apps.map((app) => (
            <option key={app.id} value={app.id}>
              {app.nombre} · {app.tipo} · {app.nivel_suscripcion}
            </option>
          ))}
        </select>

        {selectedApp && (
          <div className="mt-3 flex items-center gap-2">
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                tierBadge[selectedApp.nivel_suscripcion] || tierBadge.basico
              }`}
            >
              {selectedApp.nivel_suscripcion}
            </span>
            <span className="text-xs text-gray-400 capitalize">
              {selectedApp.tipo}
            </span>
            <span className="text-xs text-gray-400">
              · Actualmente en {previouslyAssigned} municipio
              {previouslyAssigned !== 1 ? 's' : ''}
            </span>
          </div>
        )}
      </div>

      {/* Municipios — solo visibles si hay app seleccionada */}
      {selectedApp && (
        <>
          {/* Barra de acciones */}
          <div className="flex items-center justify-between bg-white rounded-xl border border-gray-200 p-4 flex-wrap gap-3">
            <div>
              <p className="text-sm font-medium text-gray-900">
                {selectedMunIds.size} de {municipalities.length} municipios
                seleccionados
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={selectAll}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Seleccionar todos
              </button>
              <button
                type="button"
                onClick={deselectAll}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Deseleccionar todos
              </button>
              <button
                onClick={handleSave}
                disabled={loading}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-50 transition-colors"
              >
                {loading ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
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

          {/* Lista de municipios agrupados por tier */}
          {tierOrder.map(
            (tier) =>
              grouped[tier]?.length > 0 && (
                <div
                  key={tier}
                  className="bg-white rounded-xl border border-gray-200 overflow-hidden"
                >
                  <div className="px-5 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-700">
                      {tierLabels[tier] || tier} ({grouped[tier].length})
                    </h3>
                    <span
                      className={`text-xs font-medium ${
                        statusBadge[tier] || statusBadge.basico
                      }`}
                    >
                      Suscripción {tierLabels[tier] || tier}
                    </span>
                  </div>
                  <div className="divide-y divide-gray-50 max-h-[500px] overflow-y-auto">
                    {grouped[tier].map((mun) => (
                      <label
                        key={mun.id}
                        className="flex items-center gap-3 px-5 py-3 cursor-pointer hover:bg-gray-50 transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={selectedMunIds.has(mun.id)}
                          onChange={() => toggleMunicipality(mun.id)}
                          className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 shrink-0"
                        />
                        <div className="flex-1 min-w-0 flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {mun.nombre_municipio}
                            </p>
                            <p className="text-xs text-gray-400">{mun.slug}</p>
                          </div>
                          {selectedMunIds.has(mun.id) && (
                            <svg
                              className="w-4 h-4 text-indigo-500 shrink-0"
                              fill="none"
                              viewBox="0 0 24 24"
                              strokeWidth={2}
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="m4.5 12.75 6 6 9-13.5"
                              />
                            </svg>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              ),
          )}

          {/* Municipios sin tier (fallback) */}
          {Object.entries(grouped).filter(
            ([tier]) => !tierOrder.includes(tier),
          ).length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-3 bg-gray-50 border-b border-gray-100">
                <h3 className="text-sm font-semibold text-gray-700">Otros</h3>
              </div>
              <div className="divide-y divide-gray-50">
                {Object.entries(grouped)
                  .filter(([tier]) => !tierOrder.includes(tier))
                  .flatMap(([, muns]) =>
                    muns.map((mun) => (
                      <label
                        key={mun.id}
                        className="flex items-center gap-3 px-5 py-3 cursor-pointer hover:bg-gray-50 transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={selectedMunIds.has(mun.id)}
                          onChange={() => toggleMunicipality(mun.id)}
                          className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="text-sm text-gray-900">
                          {mun.nombre_municipio}
                        </span>
                      </label>
                    )),
                  )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
