'use client'

/**
 * InscriptionsList — Lista de inscripciones del ciudadano con botón Cancelar
 *
 * Reutiliza el endpoint DELETE `/api/activities/[id]/inscription`
 * (que invoca `public.cancelar_inscripcion_atomic()` del RPC 044 para
 * decrementar plazas atómicamente en la misma transacción).
 *
 * Patrón espejo de `ActivityDetailClient` (mismo confirm + fetch + router.refresh).
 * Decisión: usar DELETE HTTP y no server action porque el endpoint ya
 * existía, ya tiene rate-limit + Zod, y replicar lógica en una server
 * action duplicaría código sin valor.
 */

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { formatInlineDate } from '@/lib/format-date'
import { InscriptionEstadoBadge } from '@/components/ui/inscription-estado-badge'

export interface InscriptionRow {
  id: string
  activity_id: string
  estado: 'confirmada' | 'cancelada' | 'asistio' | 'no_asistio'
  notas: string | null
  created_at: string
  /** JOIN: campos de la actividad (leídos server-side via RLS).
      Nullable para defender contra PostgREST que devuelva null en la
      relación (CASCADE hace imposible orphan rows en DB, pero el cast
      TypeScript no garantiza no-null). */
  activity: {
    id: string
    nombre: string
    fecha_inicio: string
    modalidad: 'presencial' | 'online' | 'mixta'
    thumbnail_url: string | null
    plazas_inscritas: number
    aforo: number | null
  } | null
}

export default function InscriptionsList({ rows }: { rows: InscriptionRow[] }) {
  const router = useRouter()
  const [submittingId, setSubmittingId] = useState<string | null>(null)
  const [errorMap, setErrorMap] = useState<Record<string, string>>({})

  async function cancel(activityId: string, inscriptionId: string) {
    if (!confirm('¿Cancelar tu inscripción en esta actividad?')) return
    setErrorMap((m) => ({ ...m, [inscriptionId]: '' }))
    setSubmittingId(inscriptionId)
    try {
      const res = await fetch(`/api/activities/${activityId}/inscription`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const errBody = (await res.json().catch(() => ({}))) as { error?: string }
        setErrorMap((m) => ({
          ...m,
          [inscriptionId]: errBody.error ?? 'No se pudo cancelar.',
        }))
        return
      }
      router.refresh()
    } catch (err) {
      setErrorMap((m) => ({
        ...m,
        [inscriptionId]: err instanceof Error ? err.message : 'Error inesperado',
      }))
    } finally {
      setSubmittingId(null)
    }
  }

  return (
    <ul className="divide-y divide-gray-100" aria-label="Inscripciones a actividades">      {rows.map((row) => {
        // Defensive: si la relación activity llegase null (no debería,
        // ON DELETE CASCADE en migration 043 garantiza integridad DB),
        // saltamos la fila en lugar de crashear en `.nombre`.
        if (!row.activity) return null
        // Capturar en const local para que TS propague el narrowing dentro
        // del callback onClick del botón Cancelar (TS no siempre propaga
        // narrowing de Union-typed values a través de arrow functions en
        // expresiones JSX). El guard ya asegura no-null.
        const activity = row.activity

        const canCancel = row.estado === 'confirmada'
        const submitting = submittingId === row.id
        const error = errorMap[row.id]

        return (
          <li key={row.id} className="py-5 flex flex-col sm:flex-row sm:items-start gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <Link
                  href={`/actividades/${activity.id}`}
                  className="text-base font-semibold text-gray-900 hover:text-indigo-600 transition-colors"
                >
                  {activity.nombre}
                </Link>
                <InscriptionEstadoBadge estado={row.estado} />
              </div>
              <p className="mt-1 text-sm text-gray-600">
                📅 {formatInlineDate(activity.fecha_inicio)}
                {' · '}
                {activity.modalidad === 'presencial' && '🏛️ Presencial'}
                {activity.modalidad === 'online' && '💻 Online'}
                {activity.modalidad === 'mixta' && '🔀 Mixta'}
                {activity.aforo !== null && (
                  <>
                    {' · '}
                    🎟️ {activity.plazas_inscritas} / {row.activity.aforo} plazas
                  </>
                )}
              </p>
              {row.notas && (
                <p className="mt-2 text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-md px-3 py-2 italic">
                  📝 {row.notas}
                </p>
              )}
              {error && (
                <p
                  className="mt-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded px-2 py-1 inline-block"
                  role="alert"
                  aria-live="assertive"
                >
                  {error}
                </p>
              )}
            </div>
            <div className="shrink-0 flex sm:flex-col gap-2 items-start">
              {canCancel && (
                <button
                  type="button"
                  onClick={() => cancel(activity.id, row.id)}
                  disabled={submitting}
                  className="rounded-lg border border-red-300 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
                  aria-label={`Cancelar inscripción en ${activity.nombre}`}
                >
                  {submitting ? 'Cancelando…' : 'Cancelar'}
                </button>
              )}
              <Link
                href={`/actividades/${activity.id}`}
                className="text-sm font-medium text-indigo-600 hover:text-indigo-500 whitespace-nowrap"
              >
                Ver actividad →
              </Link>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
