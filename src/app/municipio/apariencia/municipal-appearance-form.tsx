'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ImageUploadField, type ImageUploadFieldHandle } from '@/components/ui/image-upload-field'

export interface MunicipalAppearanceData {
  slug: string
  nombre_municipio: string
  nombre_ayuntamiento: string
  colores_corporativos: {
    primary: string
    secondary: string
    accent: string
    background?: string
    text?: string
  }
  hero_image_url: string | null
  escudo_url: string | null
  logo_url: string | null
  layout_variant: 'classic' | 'editorial'
  textos_institucionales: {
    bienvenida?: string
    descripcion?: string
    pie_pagina?: string
    programas_titulo?: string
    programas_subtitulo?: string
    cta_titulo?: string
    cta_texto?: string
    editorial_subtitle?: string
    editorial_intro?: string
    editorial_body?: string
    editorial_tags?: string[]
    editorial_ods?: number[]
    editorial_sections?: Array<'programas' | 'ods'>
    seccion_programas_visible?: boolean
    seccion_ods_visible?: boolean
  }
}

export default function MunicipalAppearanceForm({
  municipality,
  landingUrl,
}: {
  municipality: MunicipalAppearanceData
  landingUrl: string
}) {
  const router = useRouter()
  const heroRef = useRef<ImageUploadFieldHandle>(null)
  const escudoRef = useRef<ImageUploadFieldHandle>(null)
  const logoRef = useRef<ImageUploadFieldHandle>(null)
  const texts = municipality.textos_institucionales || {}

  const [formData, setFormData] = useState({
    primary: municipality.colores_corporativos.primary || '#0f766e',
    secondary: municipality.colores_corporativos.secondary || '#2563eb',
    accent: municipality.colores_corporativos.accent || '#f59e0b',
    layout_variant: municipality.layout_variant || 'classic',
    bienvenida: texts.bienvenida || '',
    descripcion: texts.descripcion || '',
    pie_pagina: texts.pie_pagina || '',
    programas_titulo: texts.programas_titulo || '',
    programas_subtitulo: texts.programas_subtitulo || '',
    cta_titulo: texts.cta_titulo || '',
    cta_texto: texts.cta_texto || '',
    editorial_subtitle: texts.editorial_subtitle || '',
    editorial_intro: texts.editorial_intro || '',
    editorial_body: texts.editorial_body || '',
    editorial_tags: (texts.editorial_tags || []).join(', '),
    editorial_ods: (texts.editorial_ods || [3, 4, 5, 10, 11, 16, 17]).join(', '),
    editorial_sections: (texts.editorial_sections || ['programas', 'ods']).join(','),
    seccion_programas_visible: texts.seccion_programas_visible !== false,
    seccion_ods_visible: texts.seccion_ods_visible !== false,
  })
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'ok' | 'error'; text: string } | null>(null)

  function updateField<K extends keyof typeof formData>(field: K, value: (typeof formData)[K]) {
    setFormData((current) => ({ ...current, [field]: value }))
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setSaving(true)
    setMessage(null)

    try {
      const [heroUrl, escudoUrl, logoUrl] = await Promise.all([
        heroRef.current?.upload(municipality.slug) ?? Promise.resolve(null),
        escudoRef.current?.upload(municipality.slug) ?? Promise.resolve(null),
        logoRef.current?.upload(municipality.slug) ?? Promise.resolve(null),
      ])

      const heroState = heroRef.current?.getState()
      const escudoState = escudoRef.current?.getState()
      const logoState = logoRef.current?.getState()

      const payload = {
        colores_corporativos: {
          primary: formData.primary,
          secondary: formData.secondary,
          accent: formData.accent,
          background: municipality.colores_corporativos.background || '#ffffff',
          text: municipality.colores_corporativos.text || '#111827',
        },
        hero_image_url: heroState?.removed ? null : (heroUrl ?? municipality.hero_image_url ?? null),
        escudo_url: escudoState?.removed ? null : (escudoUrl ?? municipality.escudo_url ?? null),
        logo_url: logoState?.removed ? null : (logoUrl ?? municipality.logo_url ?? null),
        layout_variant: formData.layout_variant,
        textos_institucionales: {
          ...texts,
          bienvenida: formData.bienvenida.trim() || undefined,
          descripcion: formData.descripcion.trim() || undefined,
          pie_pagina: formData.pie_pagina.trim() || undefined,
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

      const response = await fetch('/api/municipio/appearance', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const body = await response.json().catch(() => ({}))
        throw new Error(body.error || 'No se pudo guardar la apariencia.')
      }

      setMessage({ type: 'ok', text: 'Apariencia actualizada. La landing y la lanzadera ya usarán estos datos.' })
      router.refresh()
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Error inesperado.',
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {message && (
        <div className={`rounded-lg border px-4 py-3 text-sm ${message.type === 'ok' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-700'}`}>
          {message.text}
        </div>
      )}

      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Identidad visual</h2>
            <p className="mt-1 text-sm leading-6 text-gray-500">
              Estos elementos aparecen en la landing pública y en la lanzadera de aplicaciones del ciudadano.
            </p>
          </div>
          <a href={landingUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-10 items-center justify-center rounded-lg border border-gray-300 px-4 text-sm font-semibold text-gray-700 hover:bg-gray-50">
            Ver landing pública ↗
          </a>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          {([
            ['primary', 'Color primario'],
            ['secondary', 'Color secundario'],
            ['accent', 'Color de acento'],
          ] as const).map(([field, label]) => (
            <label key={field} className="block">
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</span>
              <span className="mt-2 flex items-center gap-2">
                <input type="color" value={formData[field]} onChange={(event) => updateField(field, event.target.value)} className="h-10 w-10 rounded border border-gray-300" />
                <input value={formData[field]} onChange={(event) => updateField(field, event.target.value)} className="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono" />
              </span>
            </label>
          ))}
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          <ImageUploadField ref={heroRef} label="Imagen principal" description="Fondo de la landing municipal." kind="hero" currentUrl={municipality.hero_image_url} aspect={2.5} />
          <ImageUploadField ref={escudoRef} label="Escudo municipal" description="Se muestra en landing y lanzadera." kind="escudo" currentUrl={municipality.escudo_url} aspect={1} />
          <ImageUploadField ref={logoRef} label="Logo institucional" description="Alternativa visual para cabeceras." kind="logo" currentUrl={municipality.logo_url} aspect={3} />
        </div>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="text-base font-semibold text-gray-900">Landing municipal</h2>
        <div className="mt-4">
          <label htmlFor="layout_variant" className="block text-xs font-semibold uppercase tracking-wide text-gray-500">Diseño</label>
          <select id="layout_variant" value={formData.layout_variant} onChange={(event) => updateField('layout_variant', event.target.value as 'classic' | 'editorial')} className="mt-2 block w-full max-w-sm rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm">
            <option value="classic">Clásico institucional</option>
            <option value="editorial">Editorial personalizable</option>
          </select>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <TextArea label="Mensaje de bienvenida" value={formData.bienvenida} onChange={(value) => updateField('bienvenida', value)} rows={3} />
          <TextArea label="Descripción del portal" value={formData.descripcion} onChange={(value) => updateField('descripcion', value)} rows={3} />
          <TextInput label="Título de programas" value={formData.programas_titulo} onChange={(value) => updateField('programas_titulo', value)} />
          <TextInput label="Subtítulo de programas" value={formData.programas_subtitulo} onChange={(value) => updateField('programas_subtitulo', value)} />
          <TextInput label="Título del acceso rápido" value={formData.cta_titulo} onChange={(value) => updateField('cta_titulo', value)} />
          <TextInput label="Texto del acceso rápido" value={formData.cta_texto} onChange={(value) => updateField('cta_texto', value)} />
        </div>

        <div className="mt-4">
          <TextInput label="Pie de página" value={formData.pie_pagina} onChange={(value) => updateField('pie_pagina', value)} />
        </div>

        {formData.layout_variant === 'editorial' && (
          <div className="mt-5 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
            <p className="text-sm font-semibold text-emerald-900">Contenido editorial</p>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <TextInput label="Subtítulo editorial" value={formData.editorial_subtitle} onChange={(value) => updateField('editorial_subtitle', value)} />
              <TextInput label="Principios, separados por comas" value={formData.editorial_tags} onChange={(value) => updateField('editorial_tags', value)} />
              <TextArea label="Introducción editorial" value={formData.editorial_intro} onChange={(value) => updateField('editorial_intro', value)} rows={3} />
              <TextArea label="Cuerpo editorial" value={formData.editorial_body} onChange={(value) => updateField('editorial_body', value)} rows={3} />
              <TextInput label="ODS, separados por comas" value={formData.editorial_ods} onChange={(value) => updateField('editorial_ods', value)} />
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Orden de secciones</span>
                <select value={formData.editorial_sections} onChange={(event) => updateField('editorial_sections', event.target.value)} className="mt-2 block w-full rounded-lg border border-emerald-200 bg-white px-3 py-2 text-sm">
                  <option value="programas,ods">Programas → Agenda 2030</option>
                  <option value="ods,programas">Agenda 2030 → Programas</option>
                </select>
              </label>
            </div>
            <div className="mt-4 flex flex-wrap gap-5 text-sm text-emerald-900">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={formData.seccion_programas_visible} onChange={(event) => updateField('seccion_programas_visible', event.target.checked)} />
                Mostrar programas
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={formData.seccion_ods_visible} onChange={(event) => updateField('seccion_ods_visible', event.target.checked)} />
                Mostrar Agenda 2030
              </label>
            </div>
          </div>
        )}
      </section>

      <div className="flex justify-end">
        <button type="submit" disabled={saving} className="inline-flex min-h-11 items-center justify-center rounded-lg bg-emerald-600 px-5 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50">
          {saving ? 'Guardando...' : 'Guardar apariencia'}
        </button>
      </div>
    </form>
  )
}

function TextInput({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</span>
      <input value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
    </label>
  )
}

function TextArea({
  label,
  value,
  onChange,
  rows,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  rows: number
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</span>
      <textarea value={value} rows={rows} onChange={(event) => onChange(event.target.value)} className="mt-2 block w-full resize-y rounded-lg border border-gray-300 px-3 py-2 text-sm" />
    </label>
  )
}
