/**
 * AssignPlanForm — Client Component para asignar plan con preview
 *
 * Permite al superadmin:
 *   1. Ver el plan actual del municipio
 *   2. Elegir un plan nuevo de la lista
 *   3. Ver un diff en tiempo real (apps a añadir/quitar)
 *   4. Elegir el modo de sincronización (preserve_extras / strict)
 *   5. Confirmar y guardar
 */

'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

interface PlanOption {
  id: string
  slug: string
  nombre: string
  descripcion: string | null
  precio_mensual: number | null
  max_ciudadanos: number | null
}

interface AppDetail {
  id: string
  nombre: string
  tipo: string
  nivel_suscripcion: string
}

// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------

function formatPrice(price: number | null): string {
  if (price === null) return 'A medida'
  return new Intl.NumberFormat('es', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(price)
}

export default function AssignPlanForm({
  municipalityId,
  currentPlan,
  currentAppIds,
  plans,
  appsByPlan,
  appsById,
}: {
  municipalityId: string
  currentPlan: PlanOption | null
  currentAppIds: string[]
  plans: PlanOption[]
  appsByPlan: Record<string, string[]>
  appsById: Record<string, AppDetail>
}) {
  const router = useRouter()
  const initialPlanId = currentPlan?.id || ''
  const [selectedPlanId, setSelectedPlanId] = useState<string>(initialPlanId)
  const [syncMode, setSyncMode] = useState<'preserve_extras' | 'strict'>(
    'preserve_extras',
  )
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'ok' | 'error'; text: string } | null>(null)

  // Diff en tiempo real
  const diff = useMemo(() => {
    const currentSet = new Set(currentAppIds)
    const targetSet = new Set(
      selectedPlanId ? appsByPlan[selectedPlanId] || [] : [],
    )
    const toAdd: AppDetail[] = []
    const toRemove: AppDetail[] = []
    targetSet.forEach((id) => {
      if (!currentSet.has(id) && appsById[id]) {
        toAdd.push(appsById[id])
      }
    })
    currentSet.forEach((id) => {
      if (!targetSet.has(id) && appsById[id]) {
        toRemove.push(appsById[id])
      }
    })
    return { toAdd, toRemove, unchanged: currentSet.size - toRemove.length }
  }, [selectedPlanId, currentAppIds, appsByPlan, appsById])

  const selectedPlan = plans.find((p) => p.id === selectedPlanId)
  const isNoPlan = !selectedPlanId
  const willChange =
    selectedPlanId !== (currentPlan?.id || '') ||
    diff.toAdd.length > 0 ||
    diff.toRemove.length > 0

  async function handleSave() {
    if (!willChange) {
      setMessage({ type: 'error', text: 'No hay cambios que guardar.' })
      return
    }

    setLoading(true)
    setMessage(null)

    try {
      const res = await fetch(
        `/api/admin/municipalities/${municipalityId}/plan`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            plan_id: selectedPlanId || null,
            sync_mode: isNoPlan ? 'preserve_extras' : syncMode,
          }),
        },
      )

      if (!res.ok) {
        const body = await res.json()
        throw new Error(body.error || 'Error al guardar')
      }

      const body = await res.json()
      setMessage({ type: 'ok', text: body.message || 'Plan actualizado.' })
      router.refresh()
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Error inesperado',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Plan actual */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
          Plan actual
        </p>
        {currentPlan ? (
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <p className="text-lg font-bold text-gray-900">
                {currentPlan.nombre}
              </p>
              <p className="text-sm text-gray-500">
                {formatPrice(currentPlan.precio_mensual)}/mes ·{' '}
                {currentAppIds.length} apps activas
              </p>
            </div>
            <span className="inline-flex items-center rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700">
              Suscrito
            </span>
          </div>
        ) : (
          <p className="text-sm text-gray-500">
            Este municipio no tiene un plan asignado. Sus apps son manuales.
          </p>
        )}
      </div>

      {/* Selector de plan */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <label htmlFor="plan-select" className="block text-sm font-medium text-gray-700 mb-2">
          Nuevo plan
        </label>
        <select
          id="plan-select"
          value={selectedPlanId}
          onChange={(e) => setSelectedPlanId(e.target.value)}
          className="block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
        >
          <option value="">— Sin plan (apps manuales) —</option>
          {plans.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nombre} · {formatPrice(p.precio_mensual)}/mes · {(appsByPlan[p.id] || []).length} apps
            </option>
          ))}
        </select>

        {selectedPlan && (
          <div className="mt-3 rounded-md bg-gray-50 border border-gray-200 p-3">
            <p className="text-xs text-gray-600">
              {selectedPlan.descripcion || 'Sin descripción'}
            </p>
          </div>
        )}
      </div>

      {/* Sync mode (solo si hay plan seleccionado y es diferente al actual) */}
      {selectedPlan && willChange && !isNoPlan && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-sm font-medium text-gray-900 mb-3">
            ¿Qué hacer con las apps manuales?
          </p>
          <div className="space-y-2">
            <label className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
              <input
                type="radio"
                name="sync_mode"
                value="preserve_extras"
                checked={syncMode === 'preserve_extras'}
                onChange={() => setSyncMode('preserve_extras')}
                className="mt-0.5 h-4 w-4 text-indigo-600 focus:ring-indigo-500"
              />
              <div>
                <p className="text-sm font-medium text-gray-900">
                  Preservar apps manuales
                </p>
                <p className="text-xs text-gray-500">
                  El municipio tendrá las apps del plan + las que tuviera
                  añadidas a mano. Recomendado.
                </p>
              </div>
            </label>
            <label className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
              <input
                type="radio"
                name="sync_mode"
                value="strict"
                checked={syncMode === 'strict'}
                onChange={() => setSyncMode('strict')}
                className="mt-0.5 h-4 w-4 text-indigo-600 focus:ring-indigo-500"
              />
              <div>
                <p className="text-sm font-medium text-gray-900">
                  Solo las apps del plan
                </p>
                <p className="text-xs text-gray-500">
                  Se eliminarán las apps manuales que no estén en el plan. El
                  municipio quedará limitado al plan estrictamente.
                </p>
              </div>
            </label>
          </div>
        </div>
      )}

      {/* Diff preview */}
      {willChange && !isNoPlan && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-sm font-medium text-gray-900 mb-3">
            Vista previa de cambios
          </p>

          <div className="space-y-4">
            {diff.toAdd.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide mb-2">
                  + {diff.toAdd.length} app(s) a añadir
                </p>
                <ul className="space-y-1">
                  {diff.toAdd.slice(0, 8).map((a) => (
                    <li
                      key={a.id}
                      className="text-sm text-gray-700 flex items-center gap-2"
                    >
                      <span className="text-emerald-500">+</span>
                      <span>{a.nombre}</span>
                      <span className="text-xs text-gray-400">({a.nivel_suscripcion})</span>
                    </li>
                  ))}
                  {diff.toAdd.length > 8 && (
                    <li className="text-xs text-gray-400">
                      ... y {diff.toAdd.length - 8} más
                    </li>
                  )}
                </ul>
              </div>
            )}

            {diff.toRemove.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-red-700 uppercase tracking-wide mb-2">
                  − {diff.toRemove.length} app(s) a quitar
                  {syncMode === 'preserve_extras' && ' (se preservan como extras)'}
                </p>
                <ul className="space-y-1">
                  {diff.toRemove.slice(0, 8).map((a) => (
                    <li
                      key={a.id}
                      className="text-sm text-gray-700 flex items-center gap-2"
                    >
                      <span className="text-red-500">−</span>
                      <span>{a.nombre}</span>
                    </li>
                  ))}
                  {diff.toRemove.length > 8 && (
                    <li className="text-xs text-gray-400">
                      ... y {diff.toRemove.length - 8} más
                    </li>
                  )}
                </ul>
              </div>
            )}

            {diff.unchanged > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  = {diff.unchanged} app(s) sin cambios
                </p>
              </div>
            )}

            {diff.toAdd.length === 0 &&
              diff.toRemove.length === 0 &&
              diff.unchanged === 0 && (
                <p className="text-sm text-gray-500">
                  Este plan no tiene aplicaciones. El municipio quedará sin apps
                  del plan.
                </p>
              )}
          </div>
        </div>
      )}

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

      {/* Acciones */}
      <div className="flex items-center justify-end gap-3 bg-white rounded-xl border border-gray-200 p-4">
        <button
          onClick={handleSave}
          disabled={loading || !willChange}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-50 transition-colors"
        >
          {loading ? 'Guardando...' : 'Guardar plan'}
        </button>
      </div>
    </div>
  )
}
