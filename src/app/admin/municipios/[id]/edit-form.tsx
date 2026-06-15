/**
 * EditMunicipioForm — Client Component de edición de municipio
 *
 * Permite actualizar nombre, ayuntamiento, slug, colores
 * y tipo de suscripción de un municipio existente.
 */

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

interface MunicipioData {
  id: string
  slug: string
  nombre_municipio: string
  nombre_ayuntamiento: string
  dominio: string
  colores_corporativos: {
    primary: string
    secondary: string
    accent: string
  }
  tipo_suscripcion: string
  estado_suscripcion: string
}

// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------

export default function EditMunicipioForm({ municipio }: { municipio: MunicipioData }) {
  const router = useRouter()
  const [formData, setFormData] = useState({
    nombre_municipio: municipio.nombre_municipio,
    nombre_ayuntamiento: municipio.nombre_ayuntamiento,
    slug: municipio.slug,
    tipo_suscripcion: municipio.tipo_suscripcion,
    color_primary: municipio.colores_corporativos.primary,
    color_secondary: municipio.colores_corporativos.secondary,
    color_accent: municipio.colores_corporativos.accent,
  })
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitOk, setSubmitOk] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  function updateField(field: keyof typeof formData, value: string) {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitError(null)
    setSubmitOk(null)
    setLoading(true)

    try {
      const res = await fetch(`/api/admin/municipalities/${municipio.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre_municipio: formData.nombre_municipio.trim(),
          nombre_ayuntamiento: formData.nombre_ayuntamiento.trim(),
          slug: formData.slug.trim(),
          tipo_suscripcion: formData.tipo_suscripcion,
          colores_corporativos: {
            primary: formData.color_primary,
            secondary: formData.color_secondary,
            accent: formData.color_accent,
            background: '#ffffff',
            text: '#111827',
          },
        }),
      })

      if (!res.ok) {
        const body = await res.json()
        throw new Error(body.error || 'Error al actualizar')
      }

      setSubmitOk('Municipio actualizado correctamente.')
      router.refresh()
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Error inesperado')
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete() {
    if (!confirm('¿Estás seguro de eliminar este municipio? Esta acción no se puede deshacer y eliminará todos los datos asociados (usuarios, progreso, etc.).')) {
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`/api/admin/municipalities/${municipio.id}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const body = await res.json()
        throw new Error(body.error || 'Error al eliminar')
      }

      router.push('/admin/municipios')
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Error inesperado')
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
      {submitError && (
        <div className="rounded-md bg-red-50 border border-red-200 p-3">
          <p className="text-sm text-red-700">{submitError}</p>
        </div>
      )}

      {submitOk && (
        <div className="rounded-md bg-emerald-50 border border-emerald-200 p-3">
          <p className="text-sm text-emerald-700">{submitOk}</p>
        </div>
      )}

      {/* Estado actual */}
      <div className="rounded-lg bg-gray-50 border border-gray-200 px-4 py-3 flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide">Estado de suscripción</p>
          <p className="text-sm font-semibold text-gray-900 capitalize">{municipio.estado_suscripcion}</p>
        </div>
        <span className="text-xs text-gray-400">ID: {municipio.id.slice(0, 8)}...</span>
      </div>

      {/* Nombre municipio */}
      <div>
        <label htmlFor="nombre_municipio" className="block text-sm font-medium text-gray-700">
          Nombre del municipio
        </label>
        <input
          id="nombre_municipio"
          type="text"
          value={formData.nombre_municipio}
          onChange={(e) => updateField('nombre_municipio', e.target.value)}
          className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
        />
      </div>

      {/* Nombre ayuntamiento */}
      <div>
        <label htmlFor="nombre_ayuntamiento" className="block text-sm font-medium text-gray-700">
          Nombre del ayuntamiento
        </label>
        <input
          id="nombre_ayuntamiento"
          type="text"
          value={formData.nombre_ayuntamiento}
          onChange={(e) => updateField('nombre_ayuntamiento', e.target.value)}
          className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
        />
      </div>

      {/* Slug */}
      <div>
        <label htmlFor="slug" className="block text-sm font-medium text-gray-700">
          Slug
        </label>
        <input
          id="slug"
          type="text"
          value={formData.slug}
          onChange={(e) => updateField('slug', e.target.value)}
          className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm font-mono focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
        />
        <p className="mt-1 text-xs text-gray-400">
          Dominio: {formData.slug}.tecuida.es
        </p>
      </div>

      {/* Suscripción */}
      <div>
        <label htmlFor="tipo_suscripcion" className="block text-sm font-medium text-gray-700">
          Tipo de suscripción
        </label>
        <select
          id="tipo_suscripcion"
          value={formData.tipo_suscripcion}
          onChange={(e) => updateField('tipo_suscripcion', e.target.value)}
          className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
        >
          <option value="basico">Básico</option>
          <option value="estandar">Estándar</option>
          <option value="premium">Premium</option>
        </select>
      </div>

      {/* Colores */}
      <div>
        <p className="text-sm font-medium text-gray-700 mb-3">Colores corporativos</p>
        <div className="grid grid-cols-3 gap-3">
          {(['color_primary', 'color_secondary', 'color_accent'] as const).map((key) => (
            <div key={key}>
              <label className="block text-xs text-gray-500 mb-1">
                {key === 'color_primary' ? 'Primario' : key === 'color_secondary' ? 'Secundario' : 'Acento'}
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={formData[key]}
                  onChange={(e) => updateField(key, e.target.value)}
                  className="h-9 w-9 rounded border border-gray-300 cursor-pointer"
                />
                <input
                  type="text"
                  value={formData[key]}
                  onChange={(e) => updateField(key, e.target.value)}
                  className="flex-1 rounded border border-gray-300 px-2 py-1.5 text-xs font-mono focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Acciones */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
        <button
          type="button"
          onClick={handleDelete}
          disabled={loading}
          className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors"
        >
          Eliminar municipio
        </button>
        <div className="flex gap-3">
          <Link
            href="/admin/municipios"
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </form>
  )
}
