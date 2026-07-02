/**
 * GestoresMunicipio — Gestión de administradores municipales
 *
 * Client Component que:
 *   1. Carga la lista de usuarios del municipio
 *   2. Muestra quiénes son gestores (admin_municipio) y quiénes no
 *   3. Permite al superadmin asignar o quitar el rol con un toggle
 *
 * Solo el superadmin puede interactuar; los cambios se envían a
 * PATCH /api/admin/municipalities/[id]/users/role.
 */

'use client'

import { useState, useEffect, useCallback } from 'react'

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

interface MunicipioUser {
  id: string
  email: string
  alias: string | null
  nombre: string | null
  rol: string
  created_at: string
}

// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------

export default function GestoresMunicipio({ municipioId }: { municipioId: string }) {
  const [users, setUsers] = useState<MunicipioUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<{ message: string; ok: boolean } | null>(null)

  // Cargar usuarios del municipio
  const loadUsers = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(
        `/api/admin/municipalities/${municipioId}/users/role`,
      )
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || 'Error al cargar usuarios')
      }
      const data = await res.json()
      setUsers(data.users || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado')
    } finally {
      setLoading(false)
    }
  }, [municipioId])

  useEffect(() => {
    loadUsers()
  }, [loadUsers])

  // Toggle rol
  async function handleToggle(userId: string, currentRol: string) {
    const newRol = currentRol === 'admin_municipio' ? 'ciudadano' : 'admin_municipio'
    setTogglingId(userId)
    setFeedback(null)

    try {
      const res = await fetch(
        `/api/admin/municipalities/${municipioId}/users/role`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, rol: newRol }),
        },
      )

      const body = await res.json()

      if (!res.ok) {
        throw new Error(body.error || 'Error al cambiar rol')
      }

      // Actualizar estado local
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, rol: newRol } : u)),
      )

      setFeedback({ message: body.message, ok: true })
    } catch (err) {
      setFeedback({
        message: err instanceof Error ? err.message : 'Error inesperado',
        ok: false,
      })
    } finally {
      setTogglingId(null)
    }
  }

  // Separar gestores y ciudadanos
  const gestores = users.filter((u) => u.rol === 'admin_municipio')
  const ciudadanos = users.filter((u) => u.rol === 'ciudadano')

  const displayName = (u: MunicipioUser) => u.alias || u.nombre || u.email.split('@')[0]

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">
            👥 Gestores municipales
          </h3>
          <p className="mt-0.5 text-xs text-gray-500">
            Asigna o quita el rol de gestor para que puedan ver las estadísticas
            del municipio en /municipio/estadisticas.
          </p>
        </div>
        <button
          type="button"
          onClick={loadUsers}
          disabled={loading}
          className="text-xs text-indigo-600 hover:text-indigo-500 transition-colors disabled:opacity-50"
        >
          ↻ Actualizar
        </button>
      </div>

      {/* Feedback */}
      {feedback && (
        <div
          className={`rounded-md px-3 py-2 text-xs font-medium ${
            feedback.ok
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}
        >
          {feedback.message}
        </div>
      )}

      {/* Loading */}
      {loading && users.length === 0 && (
        <div className="text-center py-8">
          <div className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
          <p className="mt-2 text-xs text-gray-400">Cargando usuarios...</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2">
          <p className="text-xs text-red-700">{error}</p>
        </div>
      )}

      {/* Tabla de gestores actuales */}
      {!loading && !error && (
        <>
          {gestores.length === 0 && ciudadanos.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-4">
              No hay usuarios registrados en este municipio.
            </p>
          ) : (
            <div className="space-y-4">
              {/* Gestores actuales */}
              {gestores.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-emerald-700 mb-2">
                    ✅ Gestores actuales ({gestores.length})
                  </p>
                  <div className="space-y-1.5">
                    {gestores.map((u) => (
                      <div
                        key={u.id}
                        className="flex items-center justify-between rounded-lg border border-emerald-100 bg-emerald-50/50 px-3 py-2"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {displayName(u)}
                          </p>
                          <p className="text-xs text-gray-400 truncate">
                            {u.email}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleToggle(u.id, u.rol)}
                          disabled={togglingId === u.id}
                          className="ml-3 shrink-0 rounded-md border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors"
                        >
                          {togglingId === u.id ? '...' : 'Quitar gestor'}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Ciudadanos (posibles gestores) */}
              {ciudadanos.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 mb-2">
                    Ciudadanos ({ciudadanos.length})
                  </p>
                  <div className="max-h-64 overflow-y-auto space-y-1.5">
                    {ciudadanos.map((u) => (
                      <div
                        key={u.id}
                        className="flex items-center justify-between rounded-lg border border-gray-100 bg-white px-3 py-2 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-700 truncate">
                            {displayName(u)}
                          </p>
                          <p className="text-xs text-gray-400 truncate">
                            {u.email}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleToggle(u.id, u.rol)}
                          disabled={togglingId === u.id}
                          className="ml-3 shrink-0 rounded-md border border-emerald-200 px-3 py-1.5 text-xs font-medium text-emerald-600 hover:bg-emerald-50 disabled:opacity-50 transition-colors"
                        >
                          {togglingId === u.id
                            ? '...'
                            : 'Hacer gestor'}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      <p className="text-[11px] text-gray-400 pt-2 border-t border-gray-100">
        Los gestores pueden acceder a{' '}
        <code className="bg-gray-100 px-1 rounded">/municipio/estadisticas</code>{' '}
        para ver las métricas de uso de este municipio.
      </p>
    </div>
  )
}
