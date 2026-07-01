/**
 * AppThumbnailUploader — Componente reutilizable para subir miniaturas
 *
 * Usado en los formularios de crear y editar aplicación del panel admin.
 *
 * - Sube imagen a /api/admin/applications/upload-thumbnail
 * - Vista previa con spinner y manejo de errores
 * - Limpia blob URLs al desmontar (sin memory leaks)
 * - Soporta modo "create" (quitar = vaciar) y "edit" (quitar = revertir a URL anterior)
 */

'use client'

import { useState, useRef, useEffect, useCallback } from 'react'

interface AppThumbnailUploaderProps {
  /** URL actual (modo edición) o '' (modo creación) */
  currentUrl: string
  /** Slug o ID de la aplicación para el path en storage */
  appSlug: string
  /** Callback con la URL pública tras subir */
  onUploaded: (url: string) => void
  /** Comportamiento del botón quitar: 'clear' vacía, 'revert' vuelve a currentUrl */
  mode?: 'clear' | 'revert'
}

export default function AppThumbnailUploader({
  currentUrl,
  appSlug,
  onUploaded,
  mode = 'clear',
}: AppThumbnailUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // ── Cleanup blob URLs on unmount ─────────────────────────
  const previewRef = useRef<string | null>(null)
  useEffect(() => {
    return () => {
      if (previewRef.current?.startsWith('blob:')) {
        URL.revokeObjectURL(previewRef.current)
      }
    }
  }, [])

  function setPreviewSafe(url: string | null) {
    // Revocar blob URL anterior si existe
    if (previewRef.current?.startsWith('blob:')) {
      URL.revokeObjectURL(previewRef.current)
    }
    previewRef.current = url
    setPreview(url)
  }

  // ── File selection + upload ─────────────────────────────
  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return

      if (file.size > 5 * 1024 * 1024) {
        setError('La imagen no puede superar 5 MB.')
        return
      }

      const allowed = ['image/jpeg', 'image/png', 'image/svg+xml', 'image/webp']
      if (!allowed.includes(file.type)) {
        setError('Formato no permitido. Usa JPEG, PNG, SVG o WebP.')
        return
      }

      setError(null)

      // Vista previa local
      const blobUrl = URL.createObjectURL(file)
      setPreviewSafe(blobUrl)

      setUploading(true)
      try {
        const body = new FormData()
        body.append('file', file)
        body.append(
          'appSlug',
          appSlug || crypto.randomUUID().slice(0, 8),
        )

        const res = await fetch('/api/admin/applications/upload-thumbnail', {
          method: 'POST',
          body,
        })

        if (!res.ok) {
          const errBody = await res.json().catch(() => ({ error: 'Error al subir' }))
          throw new Error(errBody.error || 'Error al subir la imagen')
        }

        const data = await res.json()
        const publicUrl = (data as { publicUrl: string }).publicUrl
        onUploaded(publicUrl)
        setPreviewSafe(publicUrl)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al subir')
        setPreviewSafe(null)
      } finally {
        setUploading(false)
      }
    },
    [appSlug, onUploaded],
  )

  // ── Quitar / revertir ──────────────────────────────────
  function handleRemove() {
    if (mode === 'revert') {
      onUploaded(currentUrl)
      setPreviewSafe(currentUrl || null)
    } else {
      onUploaded('')
      setPreviewSafe(null)
    }
    setError(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  // ── Derive display URL ─────────────────────────────────
  const displayUrl = preview || (mode === 'revert' ? currentUrl : null)

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/svg+xml,image/webp"
        onChange={handleFileChange}
        className="block w-full text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 file:cursor-pointer file:transition-colors cursor-pointer"
      />

      {uploading && (
        <p className="text-xs text-indigo-600 flex items-center gap-1">
          <svg className="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Subiendo…
        </p>
      )}

      {displayUrl && !uploading && (
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={displayUrl}
            alt="Miniatura"
            className="h-16 w-16 rounded-lg object-cover border border-gray-200"
          />
          <button
            type="button"
            onClick={handleRemove}
            className="text-xs text-red-500 hover:text-red-700"
          >
            {mode === 'revert' ? 'Quitar (volver a anterior)' : 'Quitar'}
          </button>
        </div>
      )}

      {error && (
        <p className="text-xs text-red-600">{error}</p>
      )}
    </div>
  )
}
