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
  instrucciones: string
  url_acceso: string
  activa: boolean
  app_slug: string
  brand_color: string
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
    instrucciones: '',
    url_acceso: '',
    activa: true,
    app_slug: '',
    brand_color: '',
  })
  const [errors, setErrors] = useState<FormError[]>([])
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [zipFile, setZipFile] = useState<File | null>(null)
  const [uploadMode, setUploadMode] = useState<'url' | 'zip'>('url')
  const [uploadProgress, setUploadProgress] = useState<string>('')
  const [zipSizeError, setZipSizeError] = useState<string | null>(null)
  /**
   * Mensaje que se muestra bajo el dropdown de tipo cuando `handleModeSwitch`
   * ha auto-ajustado el tipo de `'programa'` a `'herramienta'` para evitar
   * el bug del 404. Se persiste hasta que el admin cambie el tipo a mano.
   */
  const [tipoAutoAdjustedNote, setTipoAutoAdjustedNote] = useState<string | null>(
    null,
  )

  const MAX_ZIP_MB = 4

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

  /**
   * Cambia el modo de landing entre URL externa y subida de ZIP.
   *
   * Defensa en profundidad contra el bug de 404: si tras crear la app el
   * `tipo` sigue siendo el default problemático `'programa'` (que sin registro
   * asociado en `programs` provoca un 404 al hacer click desde el dashboard),
   * automáticamente lo cambiamos a `'herramienta'` cuando el usuario entra
   * en estos modos. Si el admin seleccionó manualmente otro tipo, lo respetamos.
   *
   * El fix principal vive en `/app/[id]/page.tsx` y `/apps/[appSlug]/page.tsx`
   * (fallback a GenericLanding). Esto es sólo una mejora UX para evitar
   * que el admin se confunda al ver el dropdown de tipo sin sentido.
   */
  function handleModeSwitch(mode: 'url' | 'zip') {
    setUploadMode(mode)
    if (mode === 'url') {
      setZipFile(null)
      setUploadProgress('')
    } else {
      updateField('url_acceso', '')
    }
    // Defensa en profundidad contra el bug de 404: si el tipo sigue
    // siendo el default 'programa' (que sin programa asociado daría 404
    // al hacer click desde el dashboard), lo cambiamos a 'herramienta'.
    // Si el admin seleccionó manualmente otro tipo, lo respetamos.
    if (formData.tipo === 'programa') {
      updateField('tipo', 'herramienta')
      setTipoAutoAdjustedNote(
        '🛠️ Ajustado a “herramienta” porque elegiste un modo de landing sin programa asociado. Las apps tipo “programa” necesitan módulos/ lecciones; con “URL externa” o “Subir ZIP” funciona mejor cualquier otro tipo. Puedes cambiarlo manualmente si lo necesitas.',
      )
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitError(null)
    setLoading(true)

    try {
      let res: Response

      if (uploadMode === 'zip' && zipFile) {
        // Validación extra: el ZIP requiere slug
        if (!formData.app_slug.trim()) {
          setErrors([{ field: 'app_slug', message: 'El slug es obligatorio para subir un ZIP.' }])
          setLoading(false)
          return
        }

        setUploadProgress('Subiendo...')
        const payload = new FormData()
        payload.append('zip', zipFile)
        payload.append(
          'metadata',
          JSON.stringify({
            nombre: formData.nombre.trim(),
            descripcion: formData.descripcion.trim(),
            category_id: formData.category_id,
            thumbnail_url: formData.thumbnail_url.trim() || undefined,
            tipo: formData.tipo,
            instrucciones: formData.instrucciones.trim() || undefined,
            activa: formData.activa,
            app_slug: formData.app_slug.trim(),
            brand_color: formData.brand_color.trim() || undefined,
          }),
        )

        res = await fetch('/api/admin/applications/upload', {
          method: 'POST',
          body: payload,
        })
      } else {
        res = await fetch('/api/admin/applications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nombre: formData.nombre.trim(),
            descripcion: formData.descripcion.trim(),
            category_id: formData.category_id,
            // '' se manda como undefined → API rule hace ?? null → null en BD
            thumbnail_url: formData.thumbnail_url.trim() || undefined,
            tipo: formData.tipo,
            instrucciones: formData.instrucciones.trim() || undefined,
            url_acceso: formData.url_acceso.trim() || undefined,
            activa: formData.activa,
            app_slug: formData.app_slug.trim() || undefined,
            brand_color: formData.brand_color.trim() || undefined,
          }),
        })
      }

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        const errMsg =
          (body as { error?: string; suggestion?: string }).error ??
            'Error al crear la aplicación'
        const suggestion = (body as { suggestion?: string }).suggestion
        throw new Error(suggestion ? `${errMsg} ${suggestion}` : errMsg)
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
          Tipo *
        </label>
        <select
          id="tipo"
          value={formData.tipo}
          onChange={(e) => {
            updateField('tipo', e.target.value as FormData['tipo'])
            // El admin ha tomado una decisión explícita sobre el tipo:
            // la nota de auto-ajuste ya no aplica.
            setTipoAutoAdjustedNote(null)
          }}
          className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
        >
          <option value="programa">Programa</option>
          <option value="herramienta">Herramienta</option>
          <option value="encuesta">Encuesta</option>
          <option value="recurso">Recurso</option>
        </select>
        {tipoAutoAdjustedNote && (
          <p
            role="status"
            aria-live="polite"
            className="mt-2 rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800"
          >
            {tipoAutoAdjustedNote}
          </p>
        )}
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

      {/* Landing: instrucciones + enlace / subida ZIP */}
      <div className="rounded-lg bg-gray-50 border border-gray-200 p-4 space-y-4">
        <p className="text-sm font-medium text-gray-700">
          🌐 Landing de la aplicación
        </p>
        <p className="text-xs text-gray-400 -mt-2">
          Define cómo los ciudadanos accederán a esta aplicación.
        </p>

        {/* Toggle: URL externa vs Subir ZIP */}
        <div className="flex gap-2 rounded-lg bg-white border border-gray-200 p-1">
          <button
            type="button"
            onClick={() => handleModeSwitch('url')}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              uploadMode === 'url'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            🔗 URL externa
          </button>
          <button
            type="button"
            onClick={() => handleModeSwitch('zip')}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              uploadMode === 'zip'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            📦 Subir ZIP
          </button>
        </div>

        {uploadMode === 'url' ? (
          <>
            <div>
              <label
                htmlFor="url_acceso"
                className="block text-sm font-medium text-gray-700"
              >
                Enlace a la aplicación web{' '}
                <span className="text-xs font-normal text-gray-400">(opcional)</span>
              </label>
              <input
                id="url_acceso"
                type="url"
                value={formData.url_acceso}
                onChange={(e) => updateField('url_acceso', e.target.value)}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none font-mono"
                placeholder="https://app.ejemplo.com"
              />
            </div>
          </>
        ) : (
          <>
            <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3">
              <p className="text-xs text-emerald-700">
                📦 Sube un ZIP con los archivos compilados de tu app web (HTML, CSS, JS).
                Debe contener un <code className="bg-emerald-100 px-1 rounded">index.html</code> en la raíz.
                La app se servirá en <code className="bg-emerald-100 px-1 rounded">/a/{formData.app_slug || 'tu-slug'}</code>.
              </p>
            </div>
            <div>
              <label
                htmlFor="zipFile"
                className="block text-sm font-medium text-gray-700"
              >
                Archivo ZIP *
              </label>
              <input
                id="zipFile"
                type="file"
                accept=".zip,application/zip,application/x-zip-compressed"
                onChange={(e) => {
                  const file = e.target.files?.[0] || null
                  if (file && file.size > MAX_ZIP_MB * 1024 * 1024) {
                    setZipFile(null)
                    setUploadProgress('')
                    setZipSizeError(
                      `El archivo pesa ${(file.size / (1024 * 1024)).toFixed(1)} MB. El límite es ${MAX_ZIP_MB} MB por restricciones de Vercel. Para apps más grandes, usa la opción "🔗 URL externa" y aloja la app en Vercel, Netlify o similar.`,
                    )
                    e.target.value = ''
                  } else {
                    setZipFile(file)
                    setZipSizeError(null)
                    setUploadProgress(file ? `${(file.size / 1024).toFixed(0)} KB listo para subir` : '')
                  }
                }}
                className="mt-1 block w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 file:cursor-pointer file:transition-colors"
              />
              {zipSizeError && (
                <div className="mt-2 rounded-md bg-amber-50 border border-amber-200 p-3">
                  <p className="text-xs text-amber-800">{zipSizeError}</p>
                </div>
              )}
              {!zipSizeError && uploadProgress && (
                <p className="mt-1 text-xs text-emerald-600">{uploadProgress}</p>
              )}
            </div>
            {formData.app_slug && (
              <p className="text-xs text-gray-500">
                🌐 Se servirá en:{' '}
                <code className="bg-gray-100 px-1 rounded font-mono">
                  /a/{formData.app_slug}
                </code>
              </p>
            )}
          </>
        )}

        <div>
          <label
            htmlFor="instrucciones"
            className="block text-sm font-medium text-gray-700"
          >
            Instrucciones de uso y descarga{' '}
            <span className="text-xs font-normal text-gray-400">(opcional)</span>
          </label>
          <textarea
            id="instrucciones"
            rows={4}
            value={formData.instrucciones}
            onChange={(e) => updateField('instrucciones', e.target.value)}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none resize-none"
            placeholder="Ej: 1. Regístrate en la web oficial. 2. Descarga la app desde Google Play o App Store. 3. Sigue el plan diario..."
          />
        </div>
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
