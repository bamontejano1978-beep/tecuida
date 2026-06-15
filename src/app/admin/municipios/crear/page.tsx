/**
 * Admin — Crear municipio
 *
 * Formulario para dar de alta un nuevo municipio en la plataforma.
 * Client Component con Server Action para el envío.
 *
 * Requisitos: 10.1, 11.5, 11.6
 */

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

interface FormData {
  nombre_municipio: string
  nombre_ayuntamiento: string
  slug: string
  provincia: string
  tipo_suscripcion: string
  color_primary: string
  color_secondary: string
  color_accent: string
}

interface FormErrors {
  field: string
  message: string
}

// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------

export default function CrearMunicipioPage() {
  const router = useRouter()
  const [formData, setFormData] = useState<FormData>({
    nombre_municipio: '',
    nombre_ayuntamiento: '',
    slug: '',
    provincia: '',
    tipo_suscripcion: 'basico',
    color_primary: '#1e40af',
    color_secondary: '#3b82f6',
    color_accent: '#f59e0b',
  })
  const [errors, setErrors] = useState<FormErrors[]>([])
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  function updateField(field: keyof FormData, value: string) {
    setFormData((prev) => ({ ...prev, [field]: value }))
    // Auto-generar slug desde nombre_municipio
    if (field === 'nombre_municipio' && !formData.slug) {
      setFormData((prev) => ({
        ...prev,
        [field]: value,
        slug: value
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '') // quitar tildes
          .replace(/[^a-z0-9\s-]/g, '')
          .replace(/\s+/g, '-')
          .replace(/-+/g, '-'),
      }))
    }
    setErrors((prev) => prev.filter((e) => e.field !== field))
  }

  function validate(): FormErrors[] {
    const errs: FormErrors[] = []
    if (!formData.nombre_municipio.trim()) {
      errs.push({ field: 'nombre_municipio', message: 'El nombre del municipio es obligatorio' })
    }
    if (!formData.nombre_ayuntamiento.trim()) {
      errs.push({ field: 'nombre_ayuntamiento', message: 'El nombre del ayuntamiento es obligatorio' })
    }
    if (!formData.slug.trim()) {
      errs.push({ field: 'slug', message: 'El slug es obligatorio' })
    } else if (!/^[a-z0-9-]+$/.test(formData.slug)) {
      errs.push({ field: 'slug', message: 'Solo letras minúsculas, números y guiones' })
    } else if (['admin', 'www', 'api', 'static', 'assets'].includes(formData.slug)) {
      errs.push({ field: 'slug', message: 'Este slug está reservado' })
    }
    if (!formData.provincia.trim()) {
      errs.push({ field: 'provincia', message: 'La provincia es obligatoria' })
    }
    return errs
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitError(null)

    const errs = validate()
    if (errs.length > 0) {
      setErrors(errs)
      return
    }

    setLoading(true)

    try {
      const res = await fetch('/api/admin/municipalities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre_municipio: formData.nombre_municipio.trim(),
          nombre_ayuntamiento: formData.nombre_ayuntamiento.trim(),
          slug: formData.slug.trim(),
          provincia: formData.provincia.trim(),
          pais: 'España',
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
        throw new Error(body.error || 'Error al crear el municipio')
      }

      setSuccess(true)
      setTimeout(() => {
        router.push('/admin/municipios')
      }, 1500)
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Error inesperado')
    } finally {
      setLoading(false)
    }
  }

  function getFieldError(field: string): string | null {
    return errors.find((e) => e.field === field)?.message || null
  }

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8 max-w-2xl">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/admin/municipios"
          className="text-sm font-medium text-indigo-600 hover:text-indigo-500 transition-colors"
        >
          ← Volver a municipios
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">Nuevo municipio</h1>
        <p className="mt-1 text-sm text-gray-500">
          Completa los datos para dar de alta un nuevo municipio en la plataforma.
        </p>
      </div>

      {success ? (
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-6 text-center">
          <svg className="mx-auto h-12 w-12 text-emerald-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
          <p className="mt-3 text-sm font-semibold text-emerald-800">
            Municipio creado correctamente
          </p>
          <p className="mt-1 text-sm text-emerald-600">Redirigiendo a la lista...</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
          {/* Error general */}
          {submitError && (
            <div className="rounded-md bg-red-50 border border-red-200 p-3">
              <p className="text-sm text-red-700">{submitError}</p>
            </div>
          )}

          {/* Nombre del municipio */}
          <div>
            <label htmlFor="nombre_municipio" className="block text-sm font-medium text-gray-700">
              Nombre del municipio *
            </label>
            <input
              id="nombre_municipio"
              type="text"
              value={formData.nombre_municipio}
              onChange={(e) => updateField('nombre_municipio', e.target.value)}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
              placeholder="Ej: Calamonte"
            />
            {getFieldError('nombre_municipio') && (
              <p className="mt-1 text-xs text-red-600">{getFieldError('nombre_municipio')}</p>
            )}
          </div>

          {/* Nombre del ayuntamiento */}
          <div>
            <label htmlFor="nombre_ayuntamiento" className="block text-sm font-medium text-gray-700">
              Nombre del ayuntamiento *
            </label>
            <input
              id="nombre_ayuntamiento"
              type="text"
              value={formData.nombre_ayuntamiento}
              onChange={(e) => updateField('nombre_ayuntamiento', e.target.value)}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
              placeholder="Ej: Ayuntamiento de Calamonte"
            />
            {getFieldError('nombre_ayuntamiento') && (
              <p className="mt-1 text-xs text-red-600">{getFieldError('nombre_ayuntamiento')}</p>
            )}
          </div>

          {/* Slug + provincia */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="slug" className="block text-sm font-medium text-gray-700">
                Slug *
              </label>
              <input
                id="slug"
                type="text"
                value={formData.slug}
                onChange={(e) => updateField('slug', e.target.value)}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none font-mono"
                placeholder="calamonte"
              />
              {getFieldError('slug') && (
                <p className="mt-1 text-xs text-red-600">{getFieldError('slug')}</p>
              )}
              {formData.slug && !getFieldError('slug') && (
                <p className="mt-1 text-xs text-gray-400">
                  Dominio: {formData.slug}.tecuida.group
                </p>
              )}
            </div>
            <div>
              <label htmlFor="provincia" className="block text-sm font-medium text-gray-700">
                Provincia *
              </label>
              <input
                id="provincia"
                type="text"
                value={formData.provincia}
                onChange={(e) => updateField('provincia', e.target.value)}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
                placeholder="Ej: Badajoz"
              />
              {getFieldError('provincia') && (
                <p className="mt-1 text-xs text-red-600">{getFieldError('provincia')}</p>
              )}
            </div>
          </div>

          {/* Tipo de suscripción */}
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

          {/* Colores corporativos */}
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

          {/* Submit */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
            <Link
              href="/admin/municipios"
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Creando...' : 'Crear municipio'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
