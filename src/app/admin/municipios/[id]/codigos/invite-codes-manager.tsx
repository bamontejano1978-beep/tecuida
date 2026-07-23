'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type CodeStatus = 'disponible' | 'reservado' | 'consumido' | 'revocado' | 'caducado'

interface CodeSummary {
  id: string
  value: string | null
  prefix: string
  estado: CodeStatus
  expires_at: string | null
  consumed_at: string | null
  created_at: string
}

interface BatchSummary {
  id: string
  nombre: string
  cantidad: number
  expires_at: string | null
  estado: 'activo' | 'revocado'
  created_at: string
  disponibles: number
  reservados: number
  consumidos: number
  caducados: number
  revocados: number
  codes: CodeSummary[]
}

interface GeneratedBatch {
  batch_id: string
  nombre: string
  expires_at: string
  codes: string[]
}

export default function InviteCodesManager({
  municipalityId,
  required: initialRequired,
  configured,
  batches,
  apiEndpoint,
}: {
  municipalityId: string
  municipalityName: string
  required: boolean
  configured: boolean
  batches: BatchSummary[]
  apiEndpoint?: string
}) {
  const router = useRouter()
  const [required, setRequired] = useState(initialRequired)
  const [nombre, setNombre] = useState(`Lote ${new Date().toLocaleDateString('es-ES')}`)
  const [cantidad, setCantidad] = useState(50)
  const [days, setDays] = useState(90)
  const [busy, setBusy] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: 'ok' | 'error'; text: string } | null>(null)
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null)

  async function callApi(body: Record<string, unknown>) {
    const response = await fetch(apiEndpoint || `/api/admin/municipalities/${municipalityId}/invite-codes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await response.json()
    if (!response.ok) throw new Error(data.error || 'No se pudo completar la operacion')
    return data
  }

  async function generateBatch() {
    setBusy('generate')
    setMessage(null)
    try {
      const data = await callApi({
        action: 'generate',
        nombre,
        cantidad,
        expires_in_days: days,
      }) as GeneratedBatch
      setMessage({
        type: 'ok',
        text: `Lote generado con ${data.codes.length} codigos. Ya queda guardado en la tabla del panel.`,
      })
      router.refresh()
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Error inesperado' })
    } finally {
      setBusy(null)
    }
  }

  async function toggleRequired() {
    setBusy('toggle')
    setMessage(null)
    try {
      const next = !required
      await callApi({ action: 'set_required', enabled: next })
      setRequired(next)
      setMessage({
        type: 'ok',
        text: next
          ? 'Los nuevos registros ya requieren codigo municipal.'
          : 'El registro vuelve a estar abierto sin codigo.',
      })
      router.refresh()
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Error inesperado' })
    } finally {
      setBusy(null)
    }
  }

  async function revokeBatch(batchId: string) {
    if (!window.confirm('Se revocaran todos los codigos disponibles y reservados de este lote. Continuar?')) return
    setBusy(batchId)
    setMessage(null)
    try {
      await callApi({ action: 'revoke_batch', batch_id: batchId })
      setMessage({ type: 'ok', text: 'Lote revocado correctamente.' })
      router.refresh()
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Error inesperado' })
    } finally {
      setBusy(null)
    }
  }

  async function copyCode(code: CodeSummary) {
    if (!code.value) return
    await navigator.clipboard.writeText(code.value)
    setCopiedCodeId(code.id)
    window.setTimeout(() => setCopiedCodeId(null), 1600)
  }

  return (
    <div className="space-y-8">
      {!configured && (
        <div className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-800">
          La funcion esta pendiente de configuracion: anade <code className="font-mono font-semibold">INVITE_CODE_PEPPER</code> al entorno antes de generar codigos o activar la restriccion.
        </div>
      )}

      <section className={`rounded-xl border p-5 ${required ? 'border-emerald-300 bg-emerald-50' : 'border-amber-300 bg-amber-50'}`}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-semibold text-gray-900">Restriccion de nuevos registros</h2>
            <p className="mt-1 text-sm text-gray-600">
              {required
                ? 'Activa: cada nueva cuenta necesita un codigo vigente de este municipio.'
                : 'Desactivada: actualmente cualquier visitante del dominio puede registrarse.'}
            </p>
          </div>
          <button
            type="button"
            onClick={toggleRequired}
            disabled={busy !== null || (!configured && !required)}
            className={`rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 ${required ? 'bg-red-600 hover:bg-red-500' : 'bg-emerald-600 hover:bg-emerald-500'}`}
          >
            {busy === 'toggle' ? 'Guardando...' : required ? 'Desactivar restriccion' : 'Activar restriccion'}
          </button>
        </div>
      </section>

      {message && (
        <div className={`rounded-lg border p-3 text-sm ${message.type === 'ok' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-700'}`}>
          {message.text}
        </div>
      )}

      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="font-semibold text-gray-900">Generar un lote</h2>
        <p className="mt-1 text-sm text-gray-500">Maximo 500 codigos por lote. Los nuevos codigos quedaran visibles en la tabla del panel.</p>
        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <label className="text-sm font-medium text-gray-700">
            Nombre del lote
            <input value={nombre} onChange={(event) => setNombre(event.target.value)} maxLength={100} className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2" />
          </label>
          <label className="text-sm font-medium text-gray-700">
            Cantidad
            <input type="number" min={1} max={500} value={cantidad} onChange={(event) => setCantidad(Number(event.target.value))} className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2" />
          </label>
          <label className="text-sm font-medium text-gray-700">
            Vigencia
            <select value={days} onChange={(event) => setDays(Number(event.target.value))} className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2">
              <option value={30}>30 dias</option>
              <option value={60}>60 dias</option>
              <option value={90}>90 dias</option>
              <option value={180}>180 dias</option>
              <option value={365}>1 ano</option>
            </select>
          </label>
        </div>
        <button type="button" onClick={generateBatch} disabled={!configured || busy !== null || !nombre.trim() || cantidad < 1 || cantidad > 500} className="mt-5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50">
          {busy === 'generate' ? 'Generando...' : 'Generar codigos'}
        </button>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-gray-900">Historial de lotes</h2>
        <div className="mt-4 space-y-3">
          {batches.length === 0 && <p className="rounded-lg border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500">Todavia no se han generado codigos.</p>}
          {batches.map((batch) => (
            <article key={batch.id} className="rounded-xl border border-gray-200 bg-white p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-gray-900">{batch.nombre}</h3>
                  <p className="mt-1 text-xs text-gray-500">Creado {new Date(batch.created_at).toLocaleDateString('es-ES')} · Caduca {batch.expires_at ? new Date(batch.expires_at).toLocaleDateString('es-ES') : 'sin fecha'}</p>
                </div>
                {batch.estado === 'activo' ? (
                  <button type="button" onClick={() => revokeBatch(batch.id)} disabled={busy !== null} className="text-sm font-semibold text-red-600 hover:text-red-500 disabled:opacity-50">
                    {busy === batch.id ? 'Revocando...' : 'Revocar lote'}
                  </button>
                ) : <span className="rounded-full bg-red-100 px-2 py-1 text-xs font-semibold text-red-700">Revocado</span>}
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2 text-center sm:grid-cols-5">
                <Stat label="Vigentes" value={batch.disponibles} />
                <Stat label="Reservados" value={batch.reservados} />
                <Stat label="Usados" value={batch.consumidos} />
                <Stat label="Caducados" value={batch.caducados} />
                <Stat label="Revocados" value={batch.revocados} />
              </div>

              <div className="mt-5 overflow-x-auto rounded-lg border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    <tr>
                      <th className="px-3 py-2">Codigo</th>
                      <th className="px-3 py-2">Estado</th>
                      <th className="px-3 py-2">Caducidad</th>
                      <th className="px-3 py-2">Uso</th>
                      <th className="px-3 py-2 text-right">Accion</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {batch.codes.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-3 py-4 text-center text-gray-500">Este lote no tiene codigos asociados.</td>
                      </tr>
                    ) : (
                      batch.codes.map((code) => (
                        <tr key={code.id} className={code.estado === 'consumido' ? 'bg-gray-50' : undefined}>
                          <td className="whitespace-nowrap px-3 py-2 font-mono text-xs text-gray-900">
                            {code.value || `${code.prefix} (no recuperable)`}
                          </td>
                          <td className="px-3 py-2">
                            <CodeStatusBadge estado={code.estado} />
                          </td>
                          <td className="whitespace-nowrap px-3 py-2 text-gray-600">
                            {code.expires_at ? new Date(code.expires_at).toLocaleDateString('es-ES') : 'Sin caducidad'}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2 text-gray-600">
                            {code.consumed_at ? new Date(code.consumed_at).toLocaleDateString('es-ES') : 'Sin usar'}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2 text-right">
                            {code.value ? (
                              <button type="button" onClick={() => copyCode(code)} className="text-xs font-semibold text-indigo-600 hover:text-indigo-500">
                                {copiedCodeId === code.id ? 'Copiado' : 'Copiar'}
                              </button>
                            ) : (
                              <span className="text-xs text-gray-400">No disponible</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return <div className="rounded-lg bg-gray-50 p-2"><strong className="block text-lg text-gray-900">{value}</strong><span className="text-xs text-gray-500">{label}</span></div>
}

function CodeStatusBadge({ estado }: { estado: CodeStatus }) {
  const styles: Record<CodeStatus, string> = {
    disponible: 'bg-emerald-100 text-emerald-700',
    reservado: 'bg-blue-100 text-blue-700',
    consumido: 'bg-gray-200 text-gray-700',
    caducado: 'bg-amber-100 text-amber-700',
    revocado: 'bg-red-100 text-red-700',
  }
  const labels: Record<CodeStatus, string> = {
    disponible: 'Vigente',
    reservado: 'Reservado',
    consumido: 'Usado',
    caducado: 'Caducado',
    revocado: 'Revocado',
  }

  return (
    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${styles[estado]}`}>
      {labels[estado]}
    </span>
  )
}
