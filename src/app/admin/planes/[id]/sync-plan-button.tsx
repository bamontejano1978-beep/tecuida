'use client'

/**
 * SyncPlanButton — Client Component para sincronizar un plan
 * a todos sus municipios suscritos vía POST /api/admin/plans/[id]/sync.
 *
 * Muestra el resultado (municipios sincronizados / fallidos) y
 * un listado expandible de los detalles.
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface SyncResult {
  municipality_id: string
  slug: string
  nombre: string
  success: boolean
  apps_count?: number
  error?: string
}

interface SyncResponse {
  message: string
  data: {
    plan_id: string
    plan_name: string
    synced_count: number
    failed_count: number
    results: SyncResult[]
  }
}

export default function SyncPlanButton({
  planId,
  planName,
  municipalityCount,
}: {
  planId: string
  planName: string
  municipalityCount: number
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<SyncResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(false)

  async function handleSync() {
    if (municipalityCount === 0) {
      setError('Este plan no tiene municipios suscritos.')
      return
    }

    if (
      !window.confirm(
        `¿Sincronizar "${planName}" a sus ${municipalityCount} municipio(s) suscrito(s)? Esto añadirá las apps actuales del plan a cada municipio.`,
      )
    ) {
      return
    }

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const res = await fetch(`/api/admin/plans/${planId}/sync`, {
        method: 'POST',
      })

      if (!res.ok) {
        const body = await res.json()
        throw new Error(body.error || 'Error al sincronizar')
      }

      const body: SyncResponse = await res.json()
      setResult(body)
      // Refrescar la página para actualizar contadores
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={handleSync}
          disabled={loading || municipalityCount === 0}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <svg
            className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"
            />
          </svg>
          {loading
            ? 'Sincronizando...'
            : `Sincronizar ahora (${municipalityCount} municipio${municipalityCount !== 1 ? 's' : ''})`}
        </button>
        <span className="text-xs text-gray-500">
          Reaplica el plan a todos los municipios suscritos. Las apps del
          plan se añadirán a cada uno; las apps manuales se preservan.
        </span>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 p-3">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {result && (
        <div
          className={`rounded-md p-3 border ${
            result.data.failed_count > 0
              ? 'bg-amber-50 border-amber-200'
              : 'bg-emerald-50 border-emerald-200'
          }`}
        >
          <p
            className={`text-sm ${
              result.data.failed_count > 0
                ? 'text-amber-700'
                : 'text-emerald-700'
            }`}
          >
            {result.message}
          </p>
          {result.data.results.length > 0 && (
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              className="mt-2 text-xs underline opacity-80 hover:opacity-100"
            >
              {expanded ? 'Ocultar' : 'Ver'} detalles ({result.data.results.length})
            </button>
          )}
          {expanded && (
            <ul className="mt-3 space-y-1 text-xs">
              {result.data.results.map((r) => (
                <li
                  key={r.municipality_id}
                  className="flex items-center gap-2"
                >
                  <span
                    className={
                      r.success ? 'text-emerald-600' : 'text-red-600'
                    }
                  >
                    {r.success ? '✓' : '✗'}
                  </span>
                  <span className="font-mono text-gray-600">{r.slug}</span>
                  <span className="text-gray-500">— {r.nombre}</span>
                  {r.success && r.apps_count !== undefined && (
                    <span className="text-gray-400">
                      ({r.apps_count} apps)
                    </span>
                  )}
                  {r.error && (
                    <span className="text-red-600">— {r.error}</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
