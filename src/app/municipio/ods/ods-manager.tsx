'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Gestión del programa ODS desde el panel municipal.
 *
 * Acciones contra POST /api/municipio/ods:
 *  - import_destinations (pegar CSV "codigo,email")
 *  - send_pending / resend_code / update_destination / revoke_code
 *  - register_participations (una fila por correo recibido en las urnas)
 */

interface OdsCode {
  id: string
  code_value: string | null
  code_prefix: string
  estado: string
  expires_at: string | null
  destination_email: string | null
  sent_at: string | null
  sent_count: number
  consumed_at: string | null
  batch_id: string
  batch_nombre: string
}

interface BatchInfo {
  id: string
  nombre: string
  cantidad: number
  estado: string
  expires_at: string | null
  created_at: string
  application_nombre?: string | null
}

type EffectiveState = 'pendiente_destino' | 'pendiente_envio' | 'enviado' | 'activado' | 'caducado' | 'revocado'

function effectiveState(code: OdsCode): EffectiveState {
  if (code.estado === 'revocado') return 'revocado'
  if (code.estado === 'consumido') return 'activado'
  if (code.expires_at && new Date(code.expires_at) <= new Date()) return 'caducado'
  if (!code.destination_email) return 'pendiente_destino'
  if (!code.sent_at) return 'pendiente_envio'
  return 'enviado'
}

const STATE_LABEL: Record<EffectiveState, { label: string; className: string }> = {
  pendiente_destino: { label: 'Pendiente de destino', className: 'bg-gray-100 text-gray-700' },
  pendiente_envio: { label: 'Pendiente de envío', className: 'bg-amber-100 text-amber-800' },
  enviado: { label: 'Enviado', className: 'bg-blue-100 text-blue-800' },
  activado: { label: 'Activado', className: 'bg-emerald-100 text-emerald-800' },
  caducado: { label: 'Caducado', className: 'bg-gray-200 text-gray-600' },
  revocado: { label: 'Revocado', className: 'bg-red-100 text-red-700' },
}


export default function OdsManager({
  batches,
  codes,
}: {
  municipalityId: string
  batches: BatchInfo[]
  codes: OdsCode[]
}) {
  const router = useRouter()
  const [busy, setBusy] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: 'ok' | 'error'; text: string } | null>(null)
  const [csv, setCsv] = useState('')
  const [batchId, setBatchId] = useState<string>(batches[0]?.id || '')
  const [weekMonday, setWeekMonday] = useState('')
  const [pendingOnly, setPendingOnly] = useState(false)
  const [search, setSearch] = useState('')

  async function callApi(body: Record<string, unknown>) {
    const res = await fetch('/api/municipio/ods', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'No se pudo completar la operación.')
    return data
  }

  async function importCsv() {
    setBusy('import')
    setMessage(null)
    try {
      const rows = csv
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
          const [code_value, email] = line.split(/[,;\t]/).map((p) => p?.trim())
          return { code_value, email }
        })
        .filter((r) => r.code_value && r.email)
      if (rows.length === 0) throw new Error('Pega al menos una línea "código,email".')
      const data = await callApi({ action: 'import_destinations', rows })
      const failed = (data.results || []).filter((r: { ok: boolean }) => !r.ok)
      setMessage({
        type: failed.length ? 'error' : 'ok',
        text: `${data.imported} destinos asignados.${failed.length ? ` Fallos: ${failed.map((f: { code_value: string; error?: string }) => `${f.code_value} (${f.error})`).join(', ')}` : ''}`,
      })
      router.refresh()
    } catch (err: unknown) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Error inesperado' })
    } finally {
      setBusy(null)
    }
  }

  async function sendPending() {
    setBusy('send')
    setMessage(null)
    try {
      const data = await callApi({ action: 'send_pending', batch_id: batchId || undefined })
      setMessage({
        type: data.failed?.length ? 'error' : 'ok',
        text: `${data.sent} correos enviados.${data.failed?.length ? ` Fallos: ${data.failed.map((f: { code_value: string; error: string }) => `${f.code_value} (${f.error})`).join(', ')}` : ''}`,
      })
      router.refresh()
    } catch (err: unknown) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Error inesperado' })
    } finally {
      setBusy(null)
    }
  }

  async function codeAction(action: string, codeId: string, extra: Record<string, unknown> = {}) {
    setBusy(`${action}-${codeId}`)
    setMessage(null)
    try {
      await callApi({ action, code_id: codeId, ...extra })
      setMessage({ type: 'ok', text: 'Hecho.' })
      router.refresh()
    } catch (err: unknown) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Error inesperado' })
    } finally {
      setBusy(null)
    }
  }

  async function registerParticipations() {
    setBusy('participations')
    setMessage(null)
    try {
      const rows = csv
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
          const parts = line.split(/[,;\t]/).map((p) => p?.trim())
          return { email: parts[0], ods_code: parts[1] ? Number(parts[1]) : undefined }
        })
        .filter((r) => r.email)
      if (!weekMonday) throw new Error('Indica el lunes de la semana (YYYY-MM-DD).')
      if (rows.length === 0) throw new Error('Pega al menos una línea "email,ods".')
      const data = await callApi({
        action: 'register_participations',
        week_monday: weekMonday,
        rows,
      })
      setMessage({ type: 'ok', text: `${data.registered} participaciones registradas.` })
      router.refresh()
    } catch (err: unknown) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Error inesperado' })
    } finally {
      setBusy(null)
    }
  }

  function updateDestinationPrompt(code: OdsCode) {
    const next = window.prompt(
      'Correo de destino para este código (corrige erratas del papel):',
      code.destination_email || '',
    )
    if (!next) return
    void codeAction('update_destination', code.id, { email: next })
  }

  const visible = codes.filter((c) => {
    const matchesSearch =
      !search ||
      (c.code_value || c.code_prefix).toLowerCase().includes(search.toLowerCase()) ||
      (c.destination_email || '').toLowerCase().includes(search.toLowerCase())
    const st = effectiveState(c)
    const matchesPending =
      pendingOnly === false || ['pendiente_destino', 'pendiente_envio'].includes(st)
    return matchesSearch && matchesPending
  })

  const counts = {
    pendiente_destino: codes.filter((c) => effectiveState(c) === 'pendiente_destino').length,
    pendiente_envio: codes.filter((c) => effectiveState(c) === 'pendiente_envio').length,
    enviado: codes.filter((c) => effectiveState(c) === 'enviado').length,
    activado: codes.filter((c) => effectiveState(c) === 'activado').length,
  }

  return (
    <div className="mt-6 space-y-6">
      {message && (
        <div
          className={`rounded-xl border p-4 text-sm ${message.type === 'ok' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-red-200 bg-red-50 text-red-700'}`}
        >
          {message.text}
        </div>
      )}

      {/* Resumen */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {(
          [
            ['Pendientes de destino', counts.pendiente_destino],
            ['Pendientes de envío', counts.pendiente_envio],
            ['Enviados', counts.enviado],
            ['Activados', counts.activado],
          ] as const
        ).map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            <p className="text-xs font-medium text-gray-500">{label}</p>
          </div>
        ))}
      </div>

      {/* Acciones de flujo */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">Ciclo semanal</h2>
        <p className="mt-1 text-sm text-gray-500">
          1) Genera el lote en «Códigos de acceso» · 2) Pega los destinos de las tarjetas ·
          3) Envía los pendientes · 4) Repite cada semana con un lote nuevo.
        </p>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Destinos de las tarjetas (una línea por tarjeta: <code>código,email</code>)
            </label>
            <textarea
              value={csv}
              onChange={(e) => setCsv(e.target.value)}
              rows={5}
              placeholder={'VI-AB12-CD34-EF56-GH78, ana@example.com\nVI-AB12-CD34-EF56-GH79, luis@example.com'}
              className="mt-2 w-full rounded-xl border border-gray-300 p-3 font-mono text-xs focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            />
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={importCsv}
                disabled={busy !== null}
                className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {busy === 'import' ? 'Importando…' : 'Importar destinos'}
              </button>
              <button
                type="button"
                onClick={sendPending}
                disabled={busy !== null}
                className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {busy === 'send' ? 'Enviando…' : 'Enviar pendientes'}
              </button>
            </div>
            <div className="mt-3">
              <label className="block text-xs font-medium text-gray-500">Lote (opcional)</label>
              <select
                value={batchId}
                onChange={(e) => setBatchId(e.target.value)}
                className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="">Todos los lotes</option>
                {batches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.nombre} ({b.cantidad}){b.application_nombre ? ` — ${b.application_nombre}` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Registrar participaciones de la semana (una por correo; <code>email,ods</code>)
            </label>
            <input
              type="date"
              value={weekMonday}
              onChange={(e) => setWeekMonday(e.target.value)}
              className="mt-2 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm"
              aria-label="Lunes de la semana"
            />
            <button
              type="button"
              onClick={registerParticipations}
              disabled={busy !== null || !csv.trim() || !weekMonday}
              className="mt-2 rounded-xl border border-indigo-300 px-4 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-50 disabled:opacity-50"
            >
              {busy === 'participations' ? 'Registrando…' : 'Registrar participaciones'}
            </button>
            <p className="mt-2 text-xs text-gray-400">
              Se permite un registro por correo y semana; los duplicados se ignoran.
            </p>
          </div>
        </div>
      </div>

      {/* Tabla de códigos */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center gap-3 border-b border-gray-100 p-4">
          <h2 className="text-lg font-semibold text-gray-900">Códigos del programa</h2>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar código o correo…"
            className="ml-auto w-56 rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
          />
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={pendingOnly}
              onChange={(e) => setPendingOnly(e.target.checked)}
              className="rounded border-gray-300"
            />
            Solo pendientes
          </label>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100 text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3">Código</th>
                <th className="px-4 py-3">Destino</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Enviado</th>
                <th className="px-4 py-3">Caduca</th>
                <th className="px-4 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {visible.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-gray-500">
                    Todavía no hay códigos en el programa. Genera un lote en «Códigos de acceso».
                  </td>
                </tr>
              )}
              {visible.map((code) => {
                const st = effectiveState(code)
                return (
                  <tr key={code.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs">{code.code_value || code.code_prefix}</td>
                    <td className="px-4 py-3">{code.destination_email || <span className="text-gray-400">—</span>}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATE_LABEL[st].className}`}>
                        {STATE_LABEL[st].label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {code.sent_at ? new Date(code.sent_at).toLocaleDateString('es-ES') : '—'}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {code.expires_at ? new Date(code.expires_at).toLocaleDateString('es-ES') : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2 text-xs">
                        {st === 'pendiente_destino' || st === 'pendiente_envio' || st === 'enviado' ? (
                          <button
                            type="button"
                            onClick={() => updateDestinationPrompt(code)}
                            className="font-medium text-gray-600 hover:text-gray-900"
                          >
                            Corregir correo
                          </button>
                        ) : null}
                        {code.destination_email && st !== 'activado' && st !== 'revocado' ? (
                          <button
                            type="button"
                            onClick={() => void codeAction('resend_code', code.id)}
                            disabled={busy !== null}
                            className="font-medium text-indigo-600 hover:text-indigo-800 disabled:opacity-50"
                          >
                            Reenviar
                          </button>
                        ) : null}
                        {st !== 'revocado' ? (
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm('¿Revocar este código? Retirará el acceso si ya fue activado.'))
                                void codeAction('revoke_code', code.id)
                            }}
                            disabled={busy !== null}
                            className="font-medium text-red-600 hover:text-red-800 disabled:opacity-50"
                          >
                            Revocar
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
