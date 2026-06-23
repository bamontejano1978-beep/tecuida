/**
 * EditApplicationForm — Client Component para editar
 * (o desactivar) una aplicación del catálogo global.
 *
 * Cliente → API PUT  /api/admin/applications/[id] (guardar cambios)
 * Cliente → API DELETE /api/admin/applications/[id] (soft-delete: activa=false)
 *
 * Soft-delete decision: toggle activa=false en lugar de DELETE físico,
 * para preservar la integridad referencial con `municipality_applications`
 * y `user_progress`.
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

interface ApplicationData {
  id: string
  nombre: string
  descripcion: string
  category_id: string
  thumbnail_url: string
  tipo: 'programa' | 'herramienta' | 'encuesta' | 'recurso'
  instrucciones: string | null
  url_acceso: string | null
  activa: boolean
  app_slug: string | null
  brand_color: string | null
}

// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------

export default function EditApplicationForm({
  application,
  categories,
}: {
  application: ApplicationData
  categories: CategoryOption[]
}) {
  const router = useRouter()
  const [formData, setFormData] = useState({
    nombre: application.nombre,
    descripcion: application.descripcion,
    category_id: application.category_id,
    thumbnail_url: application.thumbnail_url,
    tipo: application.tipo,
    instrucciones: application.instrucciones || '',
    url_acceso: application.url_acceso || '',
    activa: application.activa,
    app_slug: application.app_slug || '',
    brand_color: application.brand_color || '',
  })
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitOk, setSubmitOk] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  function updateField<K extends keyof typeof formData>(
    field: K,
    value: (typeof formData)[K],
  ) {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitError(null)
    setSubmitOk(null)
    setLoading(true)

    try {
      const res = await fetch(
        `/api/admin/applications/${application.id}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nombre: formData.nombre.trim(),
            descripcion: formData.descripcion.trim(),
            category_id: formData.category_id,
            // '' → undefined → API rule ?? null → null en BD
            thumbnail_url: formData.thumbnail_url.trim() || undefined,
            tipo: formData.tipo,
            instrucciones: formData.instrucciones.trim() || undefined,
            url_acceso: formData.url_acceso.trim() || undefined,
            activa: formData.activa,
            app_slug: formData.app_slug.trim() || undefined,
            brand_color: formData.brand_color.trim() || undefined,
          }),
        },
      )

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(
          (body as { error?: string }).error ??
            'Error al actualizar la aplicación',
        )
      }

      setSubmitOk('Aplicación actualizada correctamente.')
      router.refresh()
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Error inesperado')
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete() {
    if (
      !confirm(
        '¿Desactivar esta aplicación? Permanecerá en la base de datos pero ya no aparecerá en los listados del catálogo ni podrá asignarse a municipios nuevos. Podrás reactivarla después.',
      )
    ) {
      return
    }

    setLoading(true)
    setSubmitError(null)
    setSubmitOk(null)
    try {
      const res = await fetch(
        `/api/admin/applications/${application.id}`,
        {
          method: 'DELETE',
        },
      )

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(
          (body as { error?: string }).error ??
            'Error al desactivar la aplicación',
        )
      }

      router.push('/admin/aplicaciones')
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Error inesperado')
      setLoading(false)
    }
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

      {submitOk && (
        <div className="rounded-md bg-emerald-50 border border-emerald-200 p-3">
          <p className="text-sm text-emerald-700">{submitOk}</p>
        </div>
      )}

      {/* Estado actual */}
      <div className="rounded-lg bg-gray-50 border border-gray-200 px-4 py-3 flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide">
            Estado actual en catálogo
          </p>
          <p
            className={`text-sm font-semibold ${
              formData.activa ? 'text-emerald-700' : 'text-gray-700'
            }`}
          >
            {formData.activa ? 'Activa' : 'Desactivada'}
          </p>
        </div>
        <span className="text-xs text-gray-400 font-mono">
          ID: {application.id.slice(0, 8)}…
        </span>
      </div>

      {/* Nombre */}
      <div>
        <label
          htmlFor="nombre"
          className="block text-sm font-medium text-gray-700"
        >
          Nombre de la aplicación
        </label>
        <input
          id="nombre"
          type="text"
          value={formData.nombre}
          onChange={(e) => updateField('nombre', e.target.value)}
          className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
        />
      </div>

      {/* Descripción */}
      <div>
        <label
          htmlFor="descripcion"
          className="block text-sm font-medium text-gray-700"
        >
          Descripción
        </label>
        <textarea
          id="descripcion"
          rows={3}
          value={formData.descripcion}
          onChange={(e) => updateField('descripcion', e.target.value)}
          className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none resize-none"
        />
      </div>

      {/* Categoría */}
      <div>
        <label
          htmlFor="category_id"
          className="block text-sm font-medium text-gray-700"
        >
          Categoría
        </label>
        <select
          id="category_id"
          value={formData.category_id}
          onChange={(e) => updateField('category_id', e.target.value)}
          className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
        >
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre}
            </option>
          ))}
        </select>
      </div>

      {/* Subdominio (slug) */}
      <div className="rounded-lg bg-indigo-50 border border-indigo-100 p-4 space-y-3">
        <p className="text-sm font-medium text-indigo-700">
          🔗 Subdominio de la aplicación
        </p>
        <p className="text-xs text-indigo-500 -mt-1">
          Define un slug para que la app sea accesible en <code className="bg-indigo-100 px-1 rounded">slug.tecuida.group</code>. Déjalo vacío si no necesita subdominio.
        </p>
        <div>
          <label htmlFor="app_slug" className="block text-sm font-medium text-gray-700">
            Slug{' '}
            <span className="text-xs font-normal text-gray-400">(opcional)</span>
          </label>
          <div className="mt-1 flex items-center gap-1">
            <input
              id="app_slug"
              type="text"
              value={formData.app_slug}
              onChange={(e) => updateField('app_slug', e.target.value)}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none font-mono"
              placeholder="ej: mindful30"
            />
            <span className="text-sm text-gray-400 shrink-0">.tecuida.group</span>
          </div>
          {formData.app_slug && (
            <p className="mt-1 text-xs text-emerald-600">
              ✓ {formData.app_slug}.tecuida.group
            </p>
          )}
        </div>
      </div>

      {/* Color de marca */}
      <div className="rounded-lg bg-purple-50 border border-purple-100 p-4 space-y-3">
        <p className="text-sm font-medium text-purple-700">
          🎨 Color de marca
        </p>
        <p className="text-xs text-purple-500 -mt-1">
          Define el color identificativo de esta app (formato hex). Se usa en el hero, topbar, acordeón y botones del PWA.
        </p>
        <div className="flex items-center gap-3">
          <input
            id="brand_color"
            type="color"
            value={formData.brand_color || '#4f46e5'}
            onChange={(e) => updateField('brand_color', e.target.value)}
            className="h-10 w-14 rounded-lg border border-gray-300 cursor-pointer"
          />
          <input
            type="text"
            value={formData.brand_color}
            onChange={(e) => updateField('brand_color', e.target.value)}
            className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono shadow-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none"
            placeholder="#7c3aed"
            maxLength={7}
          />
        </div>
        {formData.brand_color && /^#[0-9a-fA-F]{6}$/.test(formData.brand_color) && (
          <div className="flex items-center gap-2 mt-2">
            <div
              className="h-8 w-8 rounded-lg border border-gray-200 shadow-sm"
              style={{ backgroundColor: formData.brand_color }}
            />
            <span className="text-xs text-gray-500">Vista previa del color</span>
          </div>
        )}
      </div>

      {/* Tipo */}
      <div>
        <label
          htmlFor="tipo"
          className="block text-sm font-medium text-gray-700"
        >
          Tipo
        </label>
        <select
          id="tipo"
          value={formData.tipo}
          onChange={(e) =>
            updateField('tipo', e.target.value as typeof formData.tipo)
          }
          className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
        >
          <option value="programa">Programa</option>
          <option value="herramienta">Herramienta</option>
          <option value="encuesta">Encuesta</option>
          <option value="recurso">Recurso</option>
        </select>
      </div>

      {/* Landing: instrucciones + enlace */}
      <div className="rounded-lg bg-gray-50 border border-gray-200 p-4 space-y-4">
        <p className="text-sm font-medium text-gray-700">
          🌐 Landing de la aplicación
        </p>
        <p className="text-xs text-gray-400 -mt-2">
          Estos campos se muestran en la página pública de la aplicación.
        </p>

        <div>
          <label htmlFor="instrucciones" className="block text-sm font-medium text-gray-700">
            Instrucciones de uso y descarga{' '}
            <span className="text-xs font-normal text-gray-400">(opcional)</span>
          </label>
          <textarea
            id="instrucciones"
            rows={4}
            value={formData.instrucciones}
            onChange={(e) => updateField('instrucciones', e.target.value)}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none resize-none"
            placeholder="Instrucciones de uso y descarga..."
          />
        </div>

        <div>
          <label htmlFor="url_acceso" className="block text-sm font-medium text-gray-700">
            Enlace a la aplicación web{' '}
            <span className="text-xs font-normal text-gray-400">(opcional)</span>
          </label>
          <input
            id="url_acceso"
            type="url"
            value={formData.url_acceso}
            onChange={(e) => updateField('url_acceso', e.target.value)}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none font-mono"
            placeholder="https://..."
          />
        </div>
      </div>

      {/* Thumbnail URL */}
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
          Vacía = sin miniatura. Si cambias de opinión, borra el campo
          y guarda.
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
          Activa en catálogo
          <span className="block text-xs font-normal text-gray-500">
            Si la desactivas, no aparecerá en los listados para asignar a
            municipios, pero los municipios que ya la tengan activa
            podrán seguir viéndola (su activación es independiente).
          </span>
        </label>
      </div>

      {/* Acciones */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-100 flex-wrap gap-3">
        <button
          type="button"
          onClick={handleDelete}
          disabled={loading}
          className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors"
        >
          {formData.activa ? 'Desactivar aplicación' : 'Aplicación ya desactivada'}
        </button>
        <div className="flex gap-3">
          <Link
            href="/admin/aplicaciones"
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
