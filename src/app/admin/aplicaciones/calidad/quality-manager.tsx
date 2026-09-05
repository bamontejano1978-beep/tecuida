'use client'

import { useState } from 'react'
import Link from 'next/link'

export interface QualityCheck { application_id: string; checked_at: string; status: string; issues: string[] }
export default function QualityManager({ apps, initialChecks }: {
  apps: { id: string; nombre: string }[]; initialChecks: QualityCheck[]
}) {
  const [checks, setChecks] = useState(initialChecks)
  const [pending, setPending] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [onlyIssues, setOnlyIssues] = useState(false)
  async function check(appsToCheck: typeof apps) {
    setError('')
    for (const app of appsToCheck) {
      setPending(app.id)
      try {
        const response = await fetch('/api/admin/applications/quality', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ application_id: app.id }),
        })
        const body = await response.json()
        if (!response.ok) throw new Error(body.error || 'No se pudo revisar.')
        setChecks((current) => [...current.filter((item) => item.application_id !== app.id), body.check])
      } catch (caught) { setError(`${app.nombre}: ${caught instanceof Error ? caught.message : 'No se pudo revisar.'}`); break }
    }
    setPending(null)
  }
  return <>
    <div className="my-6 flex flex-wrap items-center justify-between gap-4">
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={onlyIssues} onChange={(event) => setOnlyIssues(event.target.checked)} />Solo pendientes e incidencias</label>
      <button disabled={!!pending} onClick={() => void check(apps)} className="min-h-11 rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white disabled:opacity-50">{pending ? 'Revisando…' : 'Revisar biblioteca'}</button>
    </div>
    {error && <p role="alert" className="mb-4 text-sm text-red-700">{error}</p>}
    <div className="overflow-x-auto"><table className="w-full text-left text-sm">
      <thead className="border-b bg-gray-50"><tr><th className="p-3">Aplicación</th><th className="p-3">Revisión</th><th className="p-3">Resultado</th><th className="p-3">Acciones</th></tr></thead>
      <tbody>{apps.filter((app) => !onlyIssues || checks.find((item) => item.application_id === app.id)?.status !== 'ok').map((app) => {
        const result = checks.find((item) => item.application_id === app.id)
        return <tr key={app.id} className="border-b align-top">
          <td className="p-3 font-semibold">{app.nombre}</td>
          <td className="p-3">{result ? new Date(result.checked_at).toLocaleString('es-ES') : 'Pendiente'}</td>
          <td className="max-w-md p-3">{result?.status === 'ok' ? <span className="text-emerald-800">Sin incidencias detectadas</span> : result?.issues.map((issue) => <p key={issue} className="mb-2 text-amber-900">{issue}</p>) || 'Sin revisar'}</td>
          <td className="p-3"><div className="flex flex-wrap gap-3"><button className="min-h-11 text-emerald-800 underline disabled:opacity-50" disabled={!!pending} onClick={() => void check([app])}>{pending === app.id ? 'Revisando…' : 'Revisar'}</button><Link href={`/admin/aplicaciones/${app.id}`} className="py-3 text-gray-700 underline">Editar</Link></div></td>
        </tr>
      })}</tbody>
    </table></div>
    {!apps.length && <p className="py-8 text-gray-600">No hay aplicaciones activas para revisar.</p>}
  </>
}
