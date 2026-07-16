'use client'

/**
 * Client form para crear profesional / entidad.
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Access {
  is_superadmin: boolean
  municipality_id: string | null
}

interface FormData {
  municipality_id: string
  nombre: string
  tipo: 'colegiado' | 'asociacion' | 'centro' | 'profesional_autonomo' | 'otro'
  numero_colegiado: string
  descripcion: string
  email: string
  telefono: string
  web: string
  verificado: boolean
}

export default function CreateProfessionalForm({
  access,
  municipalities,
}: {
  access: Access
  municipalities: Array<{ id: string; nombre_municipio: string }>
}) {
  const router = useRouter()
  const [data, setData] = useState<FormData>({
    municipality_id: access.municipality_id ?? '',
    nombre: '',
    tipo: 'profesional_autonomo',
    numero_colegiado: '',
    descripcion: '',
    email: '',
    telefono: '',
    web: '',
    verificado: false,
  })
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  function update<K extends keyof FormData>(k: K, v: FormData[K]) {
    setData((prev) => ({ ...prev, [k]: v }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const body: Record<string, unknown> = {
        nombre: data.nombre.trim(),
        tipo: data.tipo,
        numero_colegiado:
          data.tipo === 'colegiado' ? data.numero_colegiado.trim() : undefined,
        descripcion: data.descripcion.trim() || undefined,
        email: data.email.trim().toLowerCase(),
        telefono: data.telefono.trim() || undefined,
        web_url: data.web.trim() || undefined,
        verificado: data.verificado,
      }
      if (access.is_superadmin) {
        body.municipality_id = data.municipality_id
      }
      const res = await fetch('/api/admin/professionals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}))
        throw new Error(errBody.error ?? errBody.suggestion ?? 'Error al crear')
      }
      const created = await res.json()
      router.push(`/admin/professionals/${created.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 p-3">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {access.is_superadmin && (
        <div>
          <label htmlFor="municipality_id" className="block text-sm font-medium text-gray-700">Municipio *</label>
          <select
            id="municipality_id"
            required
            value={data.municipality_id}
            onChange={(e) => update('municipality_id', e.target.value)}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
          >
            <option value="">— Selecciona —</option>
            {municipalities.map((m) => (
              <option key={m.id} value={m.id}>{m.nombre_municipio}</option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label htmlFor="nombre" className="block text-sm font-medium text-gray-700">Nombre *</label>
        <input
          id="nombre" required type="text"
          value={data.nombre}
          onChange={(e) => update('nombre', e.target.value)}
          className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
          placeholder="Ej: María Guadalupe Gómez · Asociación de Alzheimer"
        />
      </div>

      <div>
        <label htmlFor="tipo" className="block text-sm font-medium text-gray-700">Tipo *</label>
        <select
          id="tipo"
          required
          value={data.tipo}
          onChange={(e) => update('tipo', e.target.value as FormData['tipo'])}
          className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
        >
          <option value="colegiado">Profesional colegiado (psicólogo, médico, fisioterapeuta…)</option>
          <option value="asociacion">Asociación o fundación</option>
          <option value="centro">Centro o entidad social</option>
          <option value="profesional_autonomo">Profesional autónomo</option>
          <option value="otro">Otro</option>
        </select>
      </div>

      {data.tipo === 'colegiado' && (
        <div>
          <label htmlFor="numero_colegiado" className="block text-sm font-medium text-gray-700">
            Número de colegiado *
          </label>
          <input
            id="numero_colegiado"
            required
            type="text"
            value={data.numero_colegiado}
            onChange={(e) => update('numero_colegiado', e.target.value)}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
          />
          <p className="mt-1 text-xs text-gray-500">
            El admin municipal verificará este número con el colegio profesional correspondiente.
          </p>
        </div>
      )}

      <div>
        <label htmlFor="descripcion" className="block text-sm font-medium text-gray-700">
          Descripción breve
        </label>
        <textarea
          id="descripcion"
          rows={3}
          value={data.descripcion}
          onChange={(e) => update('descripcion', e.target.value)}
          className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none resize-none"
          placeholder="Ej: Psicóloga con 10 años de experiencia en acompañamiento emocional a adolescentes."
        />
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email *</label>
          <input
            id="email" required type="email"
            value={data.email}
            onChange={(e) => update('email', e.target.value)}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
          />
        </div>
        <div>
          <label htmlFor="telefono" className="block text-sm font-medium text-gray-700">Teléfono</label>
          <input
            id="telefono" type="tel"
            value={data.telefono}
            onChange={(e) => update('telefono', e.target.value)}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
          />
        </div>
      </div>

      <div>
        <label htmlFor="web" className="block text-sm font-medium text-gray-700">Web / redes</label>
        <input
          id="web" type="text"
          value={data.web}
          onChange={(e) => update('web', e.target.value)}
          className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
          placeholder="www.ejemplo.com"
        />
      </div>

      <label className="flex items-center gap-3 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3 cursor-pointer">
        <input
          type="checkbox"
          checked={data.verificado}
          onChange={(e) => update('verificado', e.target.checked)}
          className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
        />
        <div>
          <p className="text-sm font-medium text-emerald-800">✓ Marcar como verificado</p>
          <p className="text-xs text-emerald-700 font-normal mt-0.5">
            Solo si ya has validado la identidad (colegiación, CIF, etc.).
          </p>
        </div>
      </label>

      <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
        <Link
          href="/admin/professionals"
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Cancelar
        </Link>
        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-50 transition-colors"
        >
          {submitting ? 'Creando...' : 'Crear profesional'}
        </button>
      </div>
    </form>
  )
}
