'use client'

/**
 * Activity Detail Client — Inscripción a una actividad (Fase 2).
 *
 * Comportamiento:
 *   - Si NO hay usuario autenticado → CTA a /login.
 *   - Inscrito → tarjeta de confirmación con fecha + nota_pago del profesional.
 *   - No inscrito → form inline con campo opcional "Notas para el profesional" + CTA.
 *   - Aforo lleno → mensaje sin acción.
 *
 * End-to-end flow:
 *   POST /api/activities/[id]/inscription
 *     → RPC public.inscribir_actividad() (transacción atómica 044)
 *     → 201 con { inscription_id, plazas, was_duplicate, was_reactivation }
 *
 * Ningún pago se procesa en la plataforma: la nota de pago del profesional
 * se muestra al ciudadano tras inscribirse, pero TE CUIDA no toca el dinero.
 */

import { useState, useEffect, useId } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface ActivityLite {
  id: string
  nombre: string
  fecha_inicio: string
  plazas_inscritas: number
  aforo: number | null
  precio_texto: string | null
  nota_pago: string | null
}

interface UserLite {
  id: string
  email: string
}

interface Props {
  activity: ActivityLite
  user: UserLite | null
  inscription_estado: string | null
}

interface InscriptionApiResponse {
  ok: true
  inscription_id: string
  plazas: number
  was_duplicate?: boolean
  was_reactivation?: boolean
}

interface InscriptionApiError {
  error: string
  code?: string
}

/**
 * Formatea una fecha YYYY-MM-DD en "DD de MMMM de YYYY" en es-ES sin locale dependency.
 * (locale viene del hero del navegador, evitamos mismatch SSR/CSR).
 */
function formatInlineDate(s: string): string {
  try {
    const d = new Date(s + 'T00:00:00')
    const meses = [
      'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
      'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
    ]
    return `${d.getDate()} de ${meses[d.getMonth()]} de ${d.getFullYear()}`
  } catch {
    return s
  }
}

export default function ActivityDetailClient({
  activity,
  user,
  inscription_estado,
}: Props) {
  const router = useRouter()
  const [submitting, setSubmitting] = useState<'join' | 'cancel' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [notas, setNotas] = useState('')
  const notasId = useId()

  const hasSpots =
    activity.aforo === null || activity.plazas_inscritas < activity.aforo
  const estaInscrito =
    inscription_estado === 'confirmada' || inscription_estado === 'asistio'
  const estabaCancelada =
    inscription_estado === 'cancelada' || inscription_estado === 'no_asistio'

  // Reset mensajes cuando cambia el estado de inscripción (router.refresh())
  useEffect(() => {
    setError(null)
    setSuccess(null)
  }, [inscription_estado])

  async function join() {
    setError(null)
    setSuccess(null)
    setSubmitting('join')
    try {
      const res = await fetch(`/api/activities/${activity.id}/inscription`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: user!.email.toLowerCase(),
          notas: notas.trim() || undefined,
        }),
      })
      if (!res.ok) {
        const errBody = (await res.json().catch(() => ({}))) as InscriptionApiError
        throw new Error(errBody.error ?? 'No se pudo inscribir.')
      }
      const out = (await res.json()) as InscriptionApiResponse
      const reactivationMsg = out.was_reactivation
        ? 'Has vuelto a apuntarte a esta actividad.'
        : out.was_duplicate
          ? 'Ya tenías una plaza reservada.'
          : `Te has apuntado a "${activity.nombre}".`
      setSuccess(reactivationMsg)
      setNotas('')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado')
    } finally {
      setSubmitting(null)
    }
  }

  async function cancel() {
    setError(null)
    setSuccess(null)
    setSubmitting('cancel')
    try {
      const res = await fetch(`/api/activities/${activity.id}/inscription`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const errBody = (await res.json().catch(() => ({}))) as InscriptionApiError
        throw new Error(errBody.error ?? 'No se pudo cancelar.')
      }
      setSuccess('Has cancelado tu inscripción.')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado')
    } finally {
      setSubmitting(null)
    }
  }

  return (
    <article
      className="rounded-2xl border text-white shadow-[0_18px_50px_rgba(20,44,25,.4)] p-6"
      style={{
        background:
          'linear-gradient(135deg,#19371f 0%,#38633e 60%,#1a3d20 100%)',
      }}
      aria-labelledby="inscription-heading"
    >
      <p className="text-xs font-extrabold uppercase tracking-wider text-[#f0b64e]">
        Inscripción
      </p>
      <h3
        id="inscription-heading"
        className="mt-1 font-bold text-xl leading-tight"
      >
        {estaInscrito ? 'Tienes una plaza reservada' : 'Apúntate a esta actividad'}
      </h3>

      {/* Indicadores */}
      {activity.aforo !== null && (
        <p className="mt-3 text-sm text-white/85">
          {activity.plazas_inscritas} / {activity.aforo} plazas ocupadas
        </p>
      )}

      {!hasSpots && !estaInscrito && (
        <p
          className="mt-3 text-amber-200 text-sm font-medium"
          role="status"
          aria-live="polite"
        >
          ⚠️ Aforo completo. Apúntate a la lista de espera o contacta con el profesional.
        </p>
      )}

      {/* Tarjeta de precio + nota de pago */}
      <div className="mt-3 rounded-lg bg-white/10 border border-white/15 p-3">
        {activity.precio_texto && (
          <p className="text-sm">
            <span className="text-[#f0b64e] font-bold">Precio:</span>{' '}
            {activity.precio_texto}
          </p>
        )}
        {activity.nota_pago && (
          <div className="mt-2 text-sm">
            <p className="text-[#f0b64e] font-bold">Pago al profesional:</p>
            <p className="text-white/85 whitespace-pre-wrap mt-1 text-xs">
              {activity.nota_pago}
            </p>
            <p className="text-[#f0b64e]/70 text-[11px] italic mt-1">
              TE CUIDA no procesa este pago. Se realiza directamente entre el
              ciudadano y la persona o entidad organizadora.
            </p>
          </div>
        )}
        {!activity.precio_texto && !activity.nota_pago && (
          <p className="text-sm text-white/85">
            Actividad <strong>gratuita</strong>, sin pago al profesional.
          </p>
        )}
      </div>

      {estaInscrito ? (
        // ── TARJETA DE CONFIRMACIÓN ────────────────────────────────────
        <div className="mt-4 space-y-3">
          <div
            className="rounded-xl border border-emerald-200/40 bg-emerald-500/20 p-4"
            role="status"
            aria-live="polite"
          >
            <p className="flex items-center gap-2 font-bold text-emerald-50">
              <span aria-hidden="true">✓</span> Plaza reservada
            </p>
            <dl className="mt-2 text-sm text-emerald-50/95 space-y-1">
              <div className="flex gap-2">
                <dt className="text-emerald-100/80 min-w-[80px]">
                  Fecha:
                </dt>
                <dd>{formatInlineDate(activity.fecha_inicio)}</dd>
              </div>
              {activity.nota_pago && (
                <div className="flex gap-2 items-start">
                  <dt className="text-emerald-100/80 min-w-[80px]">
                    Pago:
                  </dt>
                  <dd className="text-xs">{activity.nota_pago}</dd>
                </div>
              )}
            </dl>
            <p className="mt-3 text-xs text-emerald-100/80">
              Pronto recibirás la confirmación del profesional.
            </p>
          </div>
          <button
            onClick={cancel}
            disabled={submitting !== null}
            className="w-full rounded-xl min-h-[48px] px-4 font-extrabold bg-white text-[#142c19] hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            aria-label="Cancelar mi inscripción"
          >
            {submitting === 'cancel' ? 'Cancelando…' : 'Cancelar mi inscripción'}
          </button>
        </div>
      ) : (
        // ── FORM DE INSCRIPCIÓN ───────────────────────────────────────
        <div className="mt-4 space-y-3">
          {!user ? (
            <Link
              href="/login"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl min-h-[48px] px-4 font-extrabold bg-gradient-to-br from-[#e0a13a] to-[#bd7c25] text-white shadow-[0_14px_32px_rgba(189,124,37,.3)] hover:-translate-y-0.5 transition-transform"
            >
              Inicia sesión para apuntarte
            </Link>
          ) : !hasSpots ? (
            <button
              disabled
              className="w-full rounded-xl min-h-[48px] px-4 font-extrabold bg-white/20 text-white/70 cursor-not-allowed"
              aria-label="Aforo completo"
            >
              Aforo completo
            </button>
          ) : (
            <>
              <label
                htmlFor={notasId}
                className="block text-xs font-bold uppercase tracking-wider text-[#f0b64e]"
              >
                Notas para el profesional <span className="opacity-60">(opcional)</span>
              </label>
              <textarea
                id={notasId}
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                maxLength={1000}
                rows={3}
                placeholder="Alergias, necesidades de accesibilidad, dudas…"
                className="w-full rounded-lg bg-white/10 border border-white/20 px-3 py-2 text-sm placeholder-white/40 text-white focus:outline-none focus:border-[#e0a13a] focus:bg-white/15 transition-colors resize-none"
              />
              <button
                onClick={join}
                disabled={submitting !== null}
                className="w-full rounded-xl min-h-[48px] px-4 font-extrabold bg-gradient-to-br from-[#e0a13a] to-[#bd7c25] text-white shadow-[0_14px_32px_rgba(189,124,37,.3)] hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed transition-transform"
                aria-label="Confirmar inscripción"
              >
                {submitting === 'join' ? 'Procesando…' : 'Quiero participar →'}
              </button>
              {estabaCancelada && (
                <p className="text-xs text-white/70 italic text-center">
                  Tu inscripción anterior fue cancelada. Pulsa &ldquo;Quiero
                  participar&rdquo; para reapuntarte.
                </p>
              )}
            </>
          )}
        </div>
      )}

      {/* Mensajes feedback */}
      {success && (
        <p
          className="mt-4 rounded-md bg-emerald-500/30 border border-emerald-200/30 px-3 py-2 text-sm text-emerald-50"
          role="status"
          aria-live="polite"
        >
          {success}
        </p>
      )}
      {error && (
        <p
          className="mt-4 rounded-md bg-red-500/30 border border-red-200/30 px-3 py-2 text-sm text-red-50"
          role="alert"
          aria-live="assertive"
        >
          {error}
        </p>
      )}
    </article>
  )
}
