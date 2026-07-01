/**
 * Admin — Crear municipio
 *
 * Formulario para dar de alta un nuevo municipio en la plataforma.
 * Client Component con Server Action para el envío.
 *
 * Requisitos: 10.1, 11.5, 11.6
 */

'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ImageUploadField, type ImageUploadFieldHandle } from '@/components/ui/image-upload-field'

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

interface FormData {
  nombre_municipio: string
  nombre_ayuntamiento: string
  slug: string
  provincia: string
  color_primary: string
  color_secondary: string
  color_accent: string
  email_contacto: string
  telefono_contacto: string
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
  const heroRef = useRef<ImageUploadFieldHandle>(null)
  const escudoRef = useRef<ImageUploadFieldHandle>(null)
  const logoRef = useRef<ImageUploadFieldHandle>(null)

  const [formData, setFormData] = useState<FormData>({
    nombre_municipio: '',
    nombre_ayuntamiento: '',
    slug: '',
    provincia: '',
    color_primary: '#1e40af',
    color_secondary: '#3b82f6',
    color_accent: '#f59e0b',
    email_contacto: '',
    telefono_contacto: '',
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
          .replace(/[\u0300-\u036f]/g, '')
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
      // 1. Subir imágenes (en paralelo)
      const slug = formData.slug.trim()
      const uploadPromises = [
        heroRef.current?.upload(slug) ?? Promise.resolve(null),
        escudoRef.current?.upload(slug) ?? Promise.resolve(null),
        logoRef.current?.upload(slug) ?? Promise.resolve(null),
      ]
      const [heroUrl, escudoUrl, logoUrl] = await Promise.all(uploadPromises)

      // 2. Crear el municipio
      const body: Record<string, unknown> = {
        nombre_municipio: formData.nombre_municipio.trim(),
        nombre_ayuntamiento: formData.nombre_ayuntamiento.trim(),
        slug,
        provincia: formData.provincia.trim(),
        pais: 'España',
        colores_corporativos: {
          primary: formData.color_primary,
          secondary: formData.color_secondary,
          accent: formData.color_accent,
          background: '#ffffff',
          text: '#111827',
        },
      }

      if (heroUrl) body.hero_image_url = heroUrl
      if (escudoUrl) body.escudo_url = escudoUrl
      if (logoUrl) body.logo_url = logoUrl

      // Campos de contacto opcionales (P3)
      if (formData.email_contacto.trim()) body.email_contacto = formData.email_contacto.trim()
      if (formData.telefono_contacto.trim()) body.telefono_contacto = formData.telefono_contacto.trim()

      const res = await fetch('/api/admin/municipalities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const errBody = await res.json()
        throw new Error(errBody.error || 'Error al crear el municipio')
      }

      setSuccess(true)
      setTimeout(() => {
        router.push('/admin/municipios')
      }, 2000)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error inesperado'
      if (message.startsWith('Error al crear') || message.startsWith('El slug')) {
        setSubmitError(message)
      } else {
        setSubmitError('No se pudo crear el municipio. Revisa los errores indicados en cada campo.')
      }
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

          {/* ── Imagen principal (hero) ── */}
          <ImageUploadField
            ref={heroRef}
            label="Imagen principal del municipio"
            description="Foto de fondo para la landing page (JPEG, PNG, SVG o WebP, máx. 5 MB)"
            kind="hero"
            aspect={2.5}
          />

          {/* ── Escudo institucional ── */}
          <ImageUploadField
            ref={escudoRef}
            label="Escudo del municipio"
            description="Imagen del escudo oficial (JPEG, PNG, SVG o WebP, máx. 5 MB)"
            kind="escudo"
            aspect={1}
          />

          {/* ── Logo del municipio ── */}
          <ImageUploadField
            ref={logoRef}
            label="Logo del municipio"
            description="Logo institucional (JPEG, PNG, SVG o WebP, máx. 5 MB). Se muestra en la topbar."
            kind="logo"
            aspect={3}
          />

          {/* ── Datos de contacto (opcionales al crear) ── */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-3">
              Datos de contacto públicos
              <span className="ml-1.5 inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-500">Opcional</span>
            </p>
            <p className="text-xs text-gray-400 mb-3">
              Podrás editarlos más adelante desde la ficha del municipio.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="email_contacto_new" className="block text-xs text-gray-500 mb-1">
                  Email de contacto
                </label>
                <input
                  id="email_contacto_new"
                  type="email"
                  value={formData.email_contacto}
                  onChange={(e) => updateField('email_contacto', e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
                  placeholder="info@ayuntamiento.es"
                />
              </div>
              <div>
                <label htmlFor="telefono_contacto_new" className="block text-xs text-gray-500 mb-1">
                  Teléfono de contacto
                </label>
                <input
                  id="telefono_contacto_new"
                  type="text"
                  value={formData.telefono_contacto}
                  onChange={(e) => updateField('telefono_contacto', e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
                  placeholder="+34 924 00 00 00"
                />
              </div>
            </div>
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
