'use client'

/**
 * EditProfessionalForm
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface ProRow {
  id: string
  nombre: string
  tipo: string
  email: string
  telefono: string | null
  descripcion: string | null
  numero_colegiado: string | null
  web_url: string | null
  verificado: boolean
  estado: string
}

export default function EditProfessionalForm({ prof }: { prof: ProRow }) {
  const router = useRouter()
  const [data, setData] = useState({
    nombre: prof.nombre,
    tipo: prof.tipo as ProRow['tipo'],
    email: prof.email,
    telefono: prof.telefono ?? '',
    descripcion: prof.descripcion ?? '',
    numero_colegiado: prof.numero_colegiado ?? '',
    web_url: prof.web_url ?? '',
    verificado: prof.verificado,
    estado: prof.estado,
  })
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSave() {
    setError(null)
    setNotice(null)
    setSubmitting(true)
    try {
      const payload: Record<string, unknown> = {
        nombre: data.nombre.trim(),
        tipo: data.tipo,
        numero_colegiado: data.tipo === 'colegiado' ? data.numero_colegiado.trim() : undefined,
        descripcion: data.descripcion.trim() || undefined,
        email: data.email.trim().toLowerCase(),
        telefono: data.telefono.trim() || undefined,
        web_url: data.web_url.trim() || undefined,
        verificado: data.verificado,
        estado: data.estado,
      }
      const res = await fetch(`/api/admin/professionals/${prof.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}))
        throw new Error(errBody.error ?? 'No se pudo guardar')
      }
      setNotice('Cambios guardados.')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    handleSave()
  }

  async function handleDelete() {
    if (!confirm('¿Eliminar este profesional? Si tiene actividades, se marcará como inactivo.')) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/admin/professionals/${prof.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}))
        throw new Error(errBody.error ?? 'No se pudo eliminar')
      }
      router.push('/admin/professionals')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error')
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 p-3"><p className="text-sm text-red-700">{error}</p></div>
      )}
      {notice && (
        <div className="rounded-md bg-emerald-50 border border-emerald-200 p-3"><p className="text-sm text-emerald-700">{notice}</p></div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700">Nombre *</label>
        <input
          required
          value={data.nombre}
          onChange={(e) => setData({ ...data, nombre: e.target.value })}
          className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Tipo *</label>
        <select
          value={data.tipo}
          onChange={(e) => setData({ ...data, tipo: e.target.value as ProRow['tipo'] })}
          className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
        >
          <option value="colegiado">Colegiado</option>
          <option value="asociacion">Asociación</option>
          <option value="centro">Centro</option>
          <option value="profesional_autonomo">Profesional autónomo</option>
          <option value="otro">Otro</option>
        </select>
      </div>

      {data.tipo === 'colegiado' && (
        <div>
          <label className="block text-sm font-medium text-gray-700">Número de colegiado *</label>
          <input
            required
            value={data.numero_colegiado}
            onChange={(e) => setData({ ...data, numero_colegiado: e.target.value })}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
          />
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700">Descripción</label>
        <textarea
          rows={3}
          value={data.descripcion}
          onChange={(e) => setData({ ...data, descripcion: e.target.value })}
          className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none resize-none"
        />
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Email *</label>
          <input
            required type="email"
            value={data.email}
            onChange={(e) => setData({ ...data, email: e.target.value })}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Teléfono</label>
          <input
            value={data.telefono}
            onChange={(e) => setData({ ...data, telefono: e.target.value })}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Web</label>
        <input
          value={data.web_url}
          onChange={(e) => setData({ ...data, web_url: e.target.value })}
          className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
        />
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <label className="flex items-center gap-3 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3 cursor-pointer">
          <input
            type="checkbox"
            checked={data.verificado}
            onChange={(e) => setData({ ...data, verificado: e.target.checked })}
            className="h-4 w-4 rounded border-gray-300 text-emerald-600"
          />
          <span className="text-sm font-medium text-emerald-800">✓ Verificado</span>
        </label>
        <div>
          <label className="block text-sm font-medium text-gray-700">Estado</label>
          <select
            value={data.estado}
            onChange={(e) => setData({ ...data, estado: e.target.value })}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
          >
            <option value="activo">Activo</option>
            <option value="inactivo">Inactivo</option>
          </select>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 pt-4 border-t border-gray-100">
        <button
          type="button"
          onClick={handleDelete}
          disabled={submitting}
          className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50 transition-colors"
        >
          Eliminar
        </button>
        <div className="flex gap-3">
          <Link
            href="/admin/professionals"
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Volver
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-50 transition-colors"
          >
            {submitting ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </form>
  )
}
