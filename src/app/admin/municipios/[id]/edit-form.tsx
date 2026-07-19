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
  logo_url: string | null
  email_contacto: string | null
  telefono_contacto: string | null
  layout_variant: 'classic' | 'editorial'
  textos_institucionales: {
    bienvenida: string
    descripcion: string
    pie_pagina: string
    stats_titulo?: string
    stats_subtitulo?: string
    programas_titulo?: string
    programas_subtitulo?: string
    cta_titulo?: string
    cta_texto?: string
    seccion_stats_visible?: boolean
    seccion_programas_visible?: boolean
    seccion_cta_visible?: boolean
    editorial_subtitle?: string
    editorial_intro?: string
    editorial_body?: string
    editorial_tags?: string[]
    editorial_ods?: number[]
    editorial_sections?: Array<'programas' | 'ods'>
    seccion_ods_visible?: boolean
  }
}

// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------

export default function EditMunicipioForm({ municipio }: { municipio: MunicipioData }) {
  const router = useRouter()
  const heroRef = useRef<ImageUploadFieldHandle>(null)
  const escudoRef = useRef<ImageUploadFieldHandle>(null)
  const logoRef = useRef<ImageUploadFieldHandle>(null)

  const [formData, setFormData] = useState({
    nombre_municipio: municipio.nombre_municipio,
    nombre_ayuntamiento: municipio.nombre_ayuntamiento,
    slug: municipio.slug,
    color_primary: municipio.colores_corporativos.primary,
    color_secondary: municipio.colores_corporativos.secondary,
    color_accent: municipio.colores_corporativos.accent,
    email_contacto: municipio.email_contacto || '',
    telefono_contacto: municipio.telefono_contacto || '',
    layout_variant: municipio.layout_variant || 'classic',
    // Textos institucionales
    texto_bienvenida: municipio.textos_institucionales.bienvenida || '',
    texto_descripcion: municipio.textos_institucionales.descripcion || '',
    texto_pie_pagina: municipio.textos_institucionales.pie_pagina || '',
    // Landing sections (P4)
    stats_titulo: municipio.textos_institucionales.stats_titulo || '',
    stats_subtitulo: municipio.textos_institucionales.stats_subtitulo || '',
    programas_titulo: municipio.textos_institucionales.programas_titulo || '',
    programas_subtitulo: municipio.textos_institucionales.programas_subtitulo || '',
    cta_titulo: municipio.textos_institucionales.cta_titulo || '',
    cta_texto: municipio.textos_institucionales.cta_texto || '',
    editorial_subtitle: municipio.textos_institucionales.editorial_subtitle || '',
    editorial_intro: municipio.textos_institucionales.editorial_intro || '',
    editorial_body: municipio.textos_institucionales.editorial_body || '',
    editorial_tags: (municipio.textos_institucionales.editorial_tags || []).join(', '),
    editorial_ods: (municipio.textos_institucionales.editorial_ods || [3, 4, 5, 10, 11, 16, 17]).join(', '),
    editorial_sections: (municipio.textos_institucionales.editorial_sections || ['programas', 'ods']).join(','),
    seccion_programas_visible: municipio.textos_institucionales.seccion_programas_visible !== false,
    seccion_ods_visible: municipio.textos_institucionales.seccion_ods_visible !== false,
  })
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitOk, setSubmitOk] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  function updateField(field: keyof typeof formData, value: string | boolean) {
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
        logoRef.current?.upload(slug) ?? Promise.resolve(null),
      ]
      const [heroUrl, escudoUrl, logoUrl] = await Promise.all(uploadPromises)

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
        logo_url: logoUrl || null,
        email_contacto: formData.email_contacto.trim() || null,
        telefono_contacto: formData.telefono_contacto.trim() || null,
        layout_variant: formData.layout_variant,
        textos_institucionales: {
          bienvenida: formData.texto_bienvenida.trim() || undefined,
          descripcion: formData.texto_descripcion.trim() || undefined,
          pie_pagina: formData.texto_pie_pagina.trim() || undefined,
          stats_titulo: formData.stats_titulo.trim() || undefined,
          stats_subtitulo: formData.stats_subtitulo.trim() || undefined,
          programas_titulo: formData.programas_titulo.trim() || undefined,
          programas_subtitulo: formData.programas_subtitulo.trim() || undefined,
          cta_titulo: formData.cta_titulo.trim() || undefined,
          cta_texto: formData.cta_texto.trim() || undefined,
          editorial_subtitle: formData.editorial_subtitle.trim() || undefined,
          editorial_intro: formData.editorial_intro.trim() || undefined,
          editorial_body: formData.editorial_body.trim() || undefined,
          editorial_tags: formData.editorial_tags.split(',').map((value) => value.trim()).filter(Boolean),
          editorial_ods: formData.editorial_ods.split(',').map(Number).filter((value) => Number.isInteger(value) && value >= 1 && value <= 17),
          editorial_sections: formData.editorial_sections.split(',').filter((value): value is 'programas' | 'ods' => value === 'programas' || value === 'ods'),
          seccion_programas_visible: formData.seccion_programas_visible,
          seccion_ods_visible: formData.seccion_ods_visible,
        },
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

      {/* Diseño de landing */}
      <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex-1 min-w-[220px]">
            <label htmlFor="layout_variant" className="block text-sm font-medium text-indigo-900">
              Diseño de la landing
            </label>
            <select
              id="layout_variant"
              value={formData.layout_variant}
              onChange={(e) => updateField('layout_variant', e.target.value)}
              className="mt-1 block w-full rounded-lg border border-indigo-200 bg-white px-3 py-2 text-sm"
            >
              <option value="classic">Clásico institucional</option>
              <option value="editorial">Editorial personalizable</option>
            </select>
          </div>
          <a
            href={`https://${formData.slug}.tecuida.group`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg border border-indigo-300 bg-white px-4 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-100"
          >
            Previsualizar landing ↗
          </a>
        </div>
        <p className="mt-2 text-xs text-indigo-600">
          El modo editorial permite adaptar textos, principios, ODS, visibilidad y orden sin modificar código.
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

      {/* ── Logo del municipio ── */}
      <ImageUploadField
        ref={logoRef}
        label="Logo del municipio"
        description="Logo institucional (JPEG, PNG, SVG o WebP, máx. 5 MB). Se muestra en la topbar."
        kind="logo"
        currentUrl={municipio.logo_url}
        aspect={3}
      />

      {/* ── Campos de contacto ── */}
      <div>
        <p className="text-sm font-medium text-gray-700 mb-3">Datos de contacto públicos</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="email_contacto" className="block text-xs text-gray-500 mb-1">
              Email de contacto
            </label>
            <input
              id="email_contacto"
              type="email"
              value={formData.email_contacto}
              onChange={(e) => updateField('email_contacto', e.target.value)}
              placeholder="info@ayuntamiento.es"
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
            />
          </div>
          <div>
            <label htmlFor="telefono_contacto" className="block text-xs text-gray-500 mb-1">
              Teléfono de contacto
            </label>
            <input
              id="telefono_contacto"
              type="text"
              value={formData.telefono_contacto}
              onChange={(e) => updateField('telefono_contacto', e.target.value)}
              placeholder="+34 924 00 00 00"
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
            />
          </div>
        </div>
      </div>

      {/* ── Textos institucionales ── */}
      <div>
        <p className="text-sm font-medium text-gray-700 mb-3">Textos institucionales de la landing</p>
        <div className="space-y-3">
          <div>
            <label htmlFor="texto_bienvenida" className="block text-xs text-gray-500 mb-1">
              Mensaje de bienvenida (hero)
            </label>
            <textarea
              id="texto_bienvenida"
              rows={2}
              value={formData.texto_bienvenida}
              onChange={(e) => updateField('texto_bienvenida', e.target.value)}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none resize-y"
              placeholder="Programas y recursos para el bienestar de nuestros vecinos..."
            />
          </div>
          <div>
            <label htmlFor="texto_descripcion" className="block text-xs text-gray-500 mb-1">
              Descripción del portal
            </label>
            <textarea
              id="texto_descripcion"
              rows={2}
              value={formData.texto_descripcion}
              onChange={(e) => updateField('texto_descripcion', e.target.value)}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none resize-y"
              placeholder="Portal de salud y bienestar del municipio..."
            />
          </div>
          <div>
            <label htmlFor="texto_pie_pagina" className="block text-xs text-gray-500 mb-1">
              Pie de página (copyright)
            </label>
            <input
              id="texto_pie_pagina"
              type="text"
              value={formData.texto_pie_pagina}
              onChange={(e) => updateField('texto_pie_pagina', e.target.value)}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
              placeholder={`© ${new Date().getFullYear()} Ayuntamiento — TE CUIDA`}
            />
          </div>
        </div>
      </div>

      {/* ── Personalización de secciones de la landing (P4) ── */}
      <div>
        <p className="text-sm font-medium text-gray-700 mb-3">
          Personalización avanzada de la landing
          <span className="ml-1.5 inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">Opcional</span>
        </p>
        <p className="text-xs text-gray-400 mb-3">
          Deja los campos vacíos para usar los textos por defecto.
        </p>
        <div className="space-y-4">
          {formData.layout_variant === 'editorial' && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 space-y-3">
              <p className="text-xs font-semibold text-emerald-800">Contenido editorial</p>
              <input
                type="text"
                value={formData.editorial_subtitle}
                onChange={(e) => updateField('editorial_subtitle', e.target.value)}
                className="block w-full rounded border border-emerald-200 px-3 py-2 text-sm"
                placeholder="Subtítulo: Sostenibilidad Social"
              />
              <textarea
                rows={2}
                value={formData.editorial_intro}
                onChange={(e) => updateField('editorial_intro', e.target.value)}
                className="block w-full rounded border border-emerald-200 px-3 py-2 text-sm"
                placeholder="Presentación principal"
              />
              <textarea
                rows={2}
                value={formData.editorial_body}
                onChange={(e) => updateField('editorial_body', e.target.value)}
                className="block w-full rounded border border-emerald-200 px-3 py-2 text-sm"
                placeholder="Descripción de programas, recursos y propósito"
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs text-emerald-700 mb-1">Principios, separados por comas</label>
                  <input
                    type="text"
                    value={formData.editorial_tags}
                    onChange={(e) => updateField('editorial_tags', e.target.value)}
                    className="block w-full rounded border border-emerald-200 px-3 py-2 text-sm"
                    placeholder="BIENESTAR, INCLUSIÓN, FUTURO"
                  />
                </div>
                <div>
                  <label className="block text-xs text-emerald-700 mb-1">ODS, separados por comas</label>
                  <input
                    type="text"
                    value={formData.editorial_ods}
                    onChange={(e) => updateField('editorial_ods', e.target.value)}
                    className="block w-full rounded border border-emerald-200 px-3 py-2 text-sm"
                    placeholder="3, 4, 5, 10, 11, 16, 17"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-emerald-700 mb-1">Orden de secciones</label>
                <select
                  value={formData.editorial_sections}
                  onChange={(e) => updateField('editorial_sections', e.target.value)}
                  className="block w-full rounded border border-emerald-200 bg-white px-3 py-2 text-sm"
                >
                  <option value="programas,ods">Programas → Agenda 2030</option>
                  <option value="ods,programas">Agenda 2030 → Programas</option>
                </select>
              </div>
              <div className="flex flex-wrap gap-5 text-sm text-emerald-900">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={formData.seccion_programas_visible} onChange={(e) => updateField('seccion_programas_visible', e.target.checked)} />
                  Mostrar programas
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={formData.seccion_ods_visible} onChange={(e) => updateField('seccion_ods_visible', e.target.checked)} />
                  Mostrar Agenda 2030
                </label>
              </div>
              <div className="rounded-lg border border-emerald-200 bg-white p-5" aria-label="Vista previa editorial">
                <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600">Vista previa sin publicar</p>
                <h3 className="mt-2 font-serif text-2xl font-bold text-emerald-950">
                  {formData.nombre_municipio || municipio.nombre_municipio} TE CUIDA
                </h3>
                <p className="mt-1 font-serif text-lg text-emerald-800">
                  {formData.editorial_subtitle || 'Sostenibilidad Social'}
                </p>
                <p className="mt-3 text-sm text-gray-700">
                  {formData.editorial_intro || 'Primera plataforma integral centrada en el cuidado de las personas'}
                </p>
                <p className="mt-2 text-xs text-gray-500">{formData.editorial_body}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {formData.editorial_tags.split(',').map((tag) => tag.trim()).filter(Boolean).map((tag) => (
                    <span key={tag} className="rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-bold text-emerald-800">{tag}</span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Sección Stats */}
          <div className="rounded-lg border border-gray-200 p-4">
            <p className="text-xs font-semibold text-gray-600 mb-2">📊 Sección de estadísticas</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Título</label>
                <input
                  type="text"
                  value={formData.stats_titulo}
                  onChange={(e) => updateField('stats_titulo', e.target.value)}
                  className="block w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
                  placeholder="Resumen del programa"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Subtítulo</label>
                <input
                  type="text"
                  value={formData.stats_subtitulo}
                  onChange={(e) => updateField('stats_subtitulo', e.target.value)}
                  className="block w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Sección Programas */}
          <div className="rounded-lg border border-gray-200 p-4">
            <p className="text-xs font-semibold text-gray-600 mb-2">🌿 Sección de programas</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Título</label>
                <input
                  type="text"
                  value={formData.programas_titulo}
                  onChange={(e) => updateField('programas_titulo', e.target.value)}
                  className="block w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
                  placeholder="Nuestros programas"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Subtítulo</label>
                <input
                  type="text"
                  value={formData.programas_subtitulo}
                  onChange={(e) => updateField('programas_subtitulo', e.target.value)}
                  className="block w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
                  placeholder="Iniciativas para tu bienestar..."
                />
              </div>
            </div>
          </div>

          {/* Sección CTA */}
          <div className="rounded-lg border border-gray-200 p-4">
            <p className="text-xs font-semibold text-gray-600 mb-2">🚀 Sección de acceso rápido (CTA)</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Título</label>
                <input
                  type="text"
                  value={formData.cta_titulo}
                  onChange={(e) => updateField('cta_titulo', e.target.value)}
                  className="block w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
                  placeholder="Todo lo que necesitas..."
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Texto descriptivo</label>
                <input
                  type="text"
                  value={formData.cta_texto}
                  onChange={(e) => updateField('cta_texto', e.target.value)}
                  className="block w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
                  placeholder="Texto bajo el título del CTA"
                />
              </div>
            </div>
          </div>
        </div>
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
