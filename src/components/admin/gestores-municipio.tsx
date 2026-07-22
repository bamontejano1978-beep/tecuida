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

interface ManagerInvitation {
  id: string
  email: string
  estado: 'pendiente' | 'aceptada'
  created_at: string
  last_sent_at: string
  accepted_at: string | null
}

// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------

export default function GestoresMunicipio({ municipioId }: { municipioId: string }) {
  const [users, setUsers] = useState<MunicipioUser[]>([])
  const [invitations, setInvitations] = useState<ManagerInvitation[]>([])
  const [inviteEmail, setInviteEmail] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<{
    message: string
    ok: boolean
    manualLink?: string
  } | null>(null)

  // Cargar usuarios del municipio
  const loadUsers = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [usersResponse, invitationsResponse] = await Promise.all([
        fetch(`/api/admin/municipalities/${municipioId}/users/role`),
        fetch(`/api/admin/municipalities/${municipioId}/managers`),
      ])
      if (!usersResponse.ok || !invitationsResponse.ok) {
        const body = await (usersResponse.ok ? invitationsResponse : usersResponse)
          .json()
          .catch(() => ({}))
        throw new Error(body.error || 'Error al cargar usuarios')
      }
      const [usersData, invitationsData] = await Promise.all([
        usersResponse.json(),
        invitationsResponse.json(),
      ])
      setUsers(usersData.users || [])
      setInvitations(invitationsData.invitations || [])
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

  async function handleInvitationAction(
    action: 'invite' | 'resend' | 'cancel',
    invitationId?: string,
  ) {
    const busyKey = invitationId || 'invite'
    setTogglingId(busyKey)
    setFeedback(null)

    try {
      const response = await fetch(
        `/api/admin/municipalities/${municipioId}/managers`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(
            action === 'invite'
              ? { action, email: inviteEmail }
              : { action, invitation_id: invitationId },
          ),
        },
      )
      const body = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(body.error || 'No se pudo completar la operación')

      setFeedback({
        message: body.message,
        ok: true,
        manualLink: typeof body.manual_link === 'string' ? body.manual_link : undefined,
      })
      if (action === 'invite') setInviteEmail('')
      await loadUsers()
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
  const pendingInvitations = invitations.filter((invitation) => invitation.estado === 'pendiente')
  const pendingEmails = new Set(pendingInvitations.map((invitation) => invitation.email.toLowerCase()))
  const gestores = users.filter(
    (u) => u.rol === 'admin_municipio' && !pendingEmails.has(u.email.toLowerCase()),
  )
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
          <p>{feedback.message}</p>
          {feedback.manualLink && (
            <div className="mt-2 rounded border border-emerald-200 bg-white p-2 text-[11px] font-normal text-gray-700">
              <p className="mb-1 font-semibold text-emerald-700">
                Modo sin correo automatico
              </p>
              <input
                readOnly
                value={feedback.manualLink}
                onFocus={(event) => event.currentTarget.select()}
                className="w-full rounded border border-gray-200 bg-gray-50 px-2 py-1 font-mono text-[10px] text-gray-700"
              />
              <p className="mt-1 text-gray-500">
                Copia este enlace y enviaselo al gestor. Le permitira crear su contrasena y entrar sin codigo ciudadano.
              </p>
            </div>
          )}
        </div>
      )}

      <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-4">
        <h4 className="text-sm font-semibold text-gray-900">Añadir gestor</h4>
        <p className="mt-1 text-xs text-gray-600">
          Le enviaremos un enlace para crear su contraseña. Quedará vinculado directamente a este municipio y no necesitará un código ciudadano.
        </p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input
            type="email"
            value={inviteEmail}
            onChange={(event) => setInviteEmail(event.target.value)}
            placeholder="gestor@ayuntamiento.es"
            aria-label="Correo del nuevo gestor"
            className="min-w-0 flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={() => handleInvitationAction('invite')}
            disabled={togglingId !== null || !inviteEmail.trim()}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
          >
            {togglingId === 'invite' ? 'Enviando…' : 'Enviar invitación'}
          </button>
        </div>
      </div>

      {pendingInvitations.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold text-amber-700">
            Invitaciones pendientes ({pendingInvitations.length})
          </p>
          <div className="space-y-2">
            {pendingInvitations.map((invitation) => (
              <div
                key={invitation.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-100 bg-amber-50/60 px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-gray-800">{invitation.email}</p>
                  <p className="text-[11px] text-gray-500">
                    Enviada {new Date(invitation.last_sent_at).toLocaleDateString('es-ES')}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleInvitationAction('resend', invitation.id)}
                    disabled={togglingId !== null}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-500 disabled:opacity-50"
                  >
                    Reenviar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm(`¿Cancelar la invitación de ${invitation.email}?`)) {
                        handleInvitationAction('cancel', invitation.id)
                      }
                    }}
                    disabled={togglingId !== null}
                    className="text-xs font-semibold text-red-600 hover:text-red-500 disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ))}
          </div>
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
          {gestores.length === 0 && ciudadanos.length === 0 && pendingInvitations.length === 0 ? (
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
