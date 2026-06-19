/**
 * EditMunicipioForm — Client Component de edición de municipio
 *
 * Permite actualizar nombre, ayuntamiento, slug, colores,
 * tipo de suscripción e imágenes (hero y escudo) de un
 * municipio existente. Usa ImageUploadField para las imágenes.
 */

'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ImageUploadField, type ImageUploadFieldHandle } from '@/components/ui/image-upload-field'

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
  estado_suscripcion: string
  hero_image_url: string | null
  escudo_url: string | null
}

// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------

export default function EditMunicipioForm({ municipio }: { municipio: MunicipioData }) {
  const router = useRouter()
  const heroRef = useRef<ImageUploadFieldHandle>(null)
  const escudoRef = useRef<ImageUploadFieldHandle>(null)

  const [formData, setFormData] = useState({
    nombre_municipio: municipio.nombre_municipio,
    nombre_ayuntamiento: municipio.nombre_ayuntamiento,
    slug: municipio.slug,
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
      // 1. Subir imágenes (en paralelo)
      const slug = formData.slug.trim()
      const uploadPromises = [
        heroRef.current?.upload(slug) ?? Promise.resolve(null),
        escudoRef.current?.upload(slug) ?? Promise.resolve(null),
      ]
      const [heroUrl, escudoUrl] = await Promise.all(uploadPromises)

      // 2. Obtener estado completo para saber si se quitó alguna
      const heroState = heroRef.current?.getState()
      const escudoState = escudoRef.current?.getState()

      // 3. Construir payload
      const payload: Record<string, unknown> = {
        nombre_municipio: formData.nombre_municipio.trim(),
        nombre_ayuntamiento: formData.nombre_ayuntamiento.trim(),
        slug,
        colores_corporativos: {
          primary: formData.color_primary,
          secondary: formData.color_secondary,
          accent: formData.color_accent,
          background: '#ffffff',
          text: '#111827',
        },
        hero_image_url: heroState?.removed ? null : (heroUrl ?? null),
        escudo_url: escudoState?.removed ? null : (escudoUrl ?? null),
      }

      const res = await fetch(`/api/admin/municipalities/${municipio.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const body = await res.json()
        throw new Error(body.error || 'Error al actualizar')
      }

      setSubmitOk('Municipio actualizado correctamente.')
      router.refresh()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error inesperado'
      if (
        message.startsWith('Error al actualizar') ||
        message.startsWith('El slug') ||
        message.startsWith('Datos inválidos') ||
        message.startsWith('No se proporcionaron')
      ) {
        setSubmitError(message)
      } else {
        setSubmitError('No se pudo actualizar el municipio. Revisa los errores indicados en cada campo.')
      }
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
          Dominio: {formData.slug}.tecuida.group
        </p>
      </div>

      {/* ── Imagen principal (hero) ── */}
      <ImageUploadField
        ref={heroRef}
        label="Imagen principal del municipio"
        description="Foto de fondo para la landing page (JPEG, PNG, SVG o WebP, máx. 5 MB)"
        kind="hero"
        currentUrl={municipio.hero_image_url}
        aspect={2.5}
      />

      {/* ── Escudo institucional ── */}
      <ImageUploadField
        ref={escudoRef}
        label="Escudo del municipio"
        description="Imagen del escudo oficial (JPEG, PNG, SVG o WebP, máx. 5 MB)"
        kind="escudo"
        currentUrl={municipio.escudo_url}
        aspect={1}
      />

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
      <div className="flex items-center justify-between pt-4 border-t border-gray-100 flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleDelete}
            disabled={loading}
            className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors"
          >
            Eliminar municipio
          </button>
          <Link
            href={`/admin/municipios/${municipio.id}/aplicaciones`}
            className="rounded-lg border border-indigo-200 px-4 py-2 text-sm font-medium text-indigo-600 hover:bg-indigo-50 transition-colors"
          >
            Gestionar aplicaciones
          </Link>
        </div>
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
