/**
 * CreateApplicationForm — Client Component para crear una
 * nueva aplicación en el catálogo global.
 *
 * Cliente → API POST /api/admin/applications.
 * Tras éxito, redirige a /admin/aplicaciones.
 */

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

interface CategoryOption {
  id: string
  nombre: string
}

interface FormData {
  nombre: string
  descripcion: string
  category_id: string
  thumbnail_url: string
  tipo: 'programa' | 'herramienta' | 'encuesta' | 'recurso'
  activa: boolean
}

interface FormError {
  field: string
  message: string
}

// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------

export default function CreateApplicationForm({
  categories,
}: {
  categories: CategoryOption[]
}) {
  const router = useRouter()
  const [formData, setFormData] = useState<FormData>({
    nombre: '',
    descripcion: '',
    category_id: categories[0]?.id ?? '',
    thumbnail_url: '',
    tipo: 'programa',
    activa: true,
  })
  const [errors, setErrors] = useState<FormError[]>([])
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  function updateField<K extends keyof FormData>(
    field: K,
    value: FormData[K],
  ) {
    setFormData((prev) => ({ ...prev, [field]: value }))
    // Limpia el error de ese campo al editar
    setErrors((prev) => prev.filter((e) => e.field !== field))
  }

  function getFieldError(field: string): string | null {
    return errors.find((e) => e.field === field)?.message ?? null
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitError(null)
    setLoading(true)

    try {
      const res = await fetch('/api/admin/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: formData.nombre.trim(),
          descripcion: formData.descripcion.trim(),
          category_id: formData.category_id,
          // '' se manda como undefined → API rule hace ?? null → null en BD
          thumbnail_url: formData.thumbnail_url.trim() || undefined,
          tipo: formData.tipo,
          activa: formData.activa,
        }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(
          (body as { error?: string }).error ??
            'Error al crear la aplicación',
        )
      }

      setSuccess(true)
      setTimeout(() => router.push('/admin/aplicaciones'), 1500)
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Error inesperado')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-6 text-center">
        <svg
          className="mx-auto h-12 w-12 text-emerald-500"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          aria-hidden="true"
          focusable="false"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
          />
        </svg>
        <p className="mt-3 text-sm font-semibold text-emerald-800">
          Aplicación creada correctamente
        </p>
        <p className="mt-1 text-sm text-emerald-600">
          Redirigiendo al catálogo...
        </p>
      </div>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-xl border border-gray-200 p-6 space-y-6"
    >
      {submitError && (
        <div className="rounded-md bg-red-50 border border-red-200 p-3">
          <p className="text-sm text-red-700">{submitError}</p>
        </div>
      )}

      {/* Nombre */}
      <div>
        <label
          htmlFor="nombre"
          className="block text-sm font-medium text-gray-700"
        >
          Nombre de la aplicación *
        </label>
        <input
          id="nombre"
          type="text"
          value={formData.nombre}
          onChange={(e) => updateField('nombre', e.target.value)}
          className={`mt-1 block w-full rounded-lg border px-3 py-2 text-sm shadow-sm focus:ring-2 outline-none ${
            getFieldError('nombre')
              ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
              : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-200'
          }`}
          placeholder="Ej: Mindful30 Adolescentes"
        />
        {getFieldError('nombre') && (
          <p className="mt-1 text-xs text-red-600">
            {getFieldError('nombre')}
          </p>
        )}
      </div>

      {/* Descripción */}
      <div>
        <label
          htmlFor="descripcion"
          className="block text-sm font-medium text-gray-700"
        >
          Descripción *
        </label>
        <textarea
          id="descripcion"
          rows={3}
          value={formData.descripcion}
          onChange={(e) => updateField('descripcion', e.target.value)}
          className={`mt-1 block w-full rounded-lg border px-3 py-2 text-sm shadow-sm focus:ring-2 outline-none resize-none ${
            getFieldError('descripcion')
              ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
              : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-200'
          }`}
          placeholder="Resumen del propósito, audiencia y método de la aplicación."
        />
        {getFieldError('descripcion') && (
          <p className="mt-1 text-xs text-red-600">
            {getFieldError('descripcion')}
          </p>
        )}
      </div>

      {/* Categoría */}
      <div>
        <label
          htmlFor="category_id"
          className="block text-sm font-medium text-gray-700"
        >
          Categoría *
        </label>
        <select
          id="category_id"
          value={formData.category_id}
          onChange={(e) => updateField('category_id', e.target.value)}
          className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
        >
          {categories.length === 0 ? (
            <option value="">— No hay categorías disponibles —</option>
          ) : (
            categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))
          )}
        </select>
      </div>

      {/* Tipo */}
      <div>
        <label
          htmlFor="tipo"
          className="block text-sm font-medium text-gray-700"
        >
          Tipo *
        </label>
        <select
          id="tipo"
          value={formData.tipo}
          onChange={(e) =>
            updateField(
              'tipo',
              e.target.value as FormData['tipo'],
            )
          }
          className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
        >
          <option value="programa">Programa</option>
          <option value="herramienta">Herramienta</option>
          <option value="encuesta">Encuesta</option>
          <option value="recurso">Recurso</option>
        </select>
      </div>

      {/* Thumbnail URL (opcional) */}
      <div>
        <label
          htmlFor="thumbnail_url"
          className="block text-sm font-medium text-gray-700"
        >
          URL de miniatura{' '}
          <span className="text-xs font-normal text-gray-400">
            (opcional)
          </span>
        </label>
        <input
          id="thumbnail_url"
          type="url"
          value={formData.thumbnail_url}
          onChange={(e) => updateField('thumbnail_url', e.target.value)}
          className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none font-mono"
          placeholder="https://..."
        />
        <p className="mt-1 text-xs text-gray-400">
          Si la dejas vacía, la aplicación se mostrará sin miniatura.
        </p>
      </div>

      {/* Activa */}
      <div className="flex items-center gap-3 rounded-lg bg-gray-50 border border-gray-200 px-4 py-3">
        <input
          id="activa"
          type="checkbox"
          checked={formData.activa}
          onChange={(e) => updateField('activa', e.target.checked)}
          className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
        />
        <label
          htmlFor="activa"
          className="text-sm font-medium text-gray-700"
        >
          Activa al crear
          <span className="block text-xs font-normal text-gray-500">
            Si la activas, aparecerá inmediatamente en el catálogo y
            podrá asignarse a municipios. Puedes desactivarla después.
          </span>
        </label>
      </div>

      {/* Submit */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
        <Link
          href="/admin/aplicaciones"
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Cancelar
        </Link>
        <button
          type="submit"
          disabled={loading || categories.length === 0}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Creando...' : 'Crear aplicación'}
        </button>
      </div>
    </form>
  )
}
