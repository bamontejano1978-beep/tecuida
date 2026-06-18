/**
 * ImageUploadField — Campo de imagen reutilizable con recorte.
 *
 * Encapsula selección de archivo, validación, vista previa,
 * recorte opcional (vía ImageCropModal) e indicadores de estado
 * (subiendo, error, listo). Se usa tanto en el formulario de
 * creación como en el de edición de municipio.
 *
 * El padre recibe el estado vía onChange y es responsable de
 * llamar a upload() en el momento adecuado (normalmente durante
 * el submit del formulario).
 */

'use client'

import {
  useState,
  useRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  forwardRef,
} from 'react'
import { ImageCropModal } from './image-crop-modal'

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export interface ImageUploadState {
  /** File listo para subir (original o recortado). */
  file: File | null
  /** Blob URL para la vista previa local. */
  previewUrl: string | null
  /** URL pública en Supabase Storage tras subida exitosa. */
  uploadedUrl: string | null
  /** Si la imagen se está subiendo ahora mismo. */
  uploading: boolean
  /** Mensaje de error de validación o subida. */
  error: string | null
  /** true si el usuario quitó explícitamente la imagen (solo edit). */
  removed: boolean
}

export interface ImageUploadFieldHandle {
  /** Sube la imagen a Supabase Storage y devuelve la URL pública. */
  upload: (slug: string) => Promise<string | null>
  /** Devuelve el estado actual completo. */
  getState: () => ImageUploadState
}

export interface ImageUploadFieldProps {
  /** Etiqueta visible del campo ("Imagen principal del municipio"). */
  label: string
  /** Descripción secundaria (formatos, tamaño). */
  description: string
  /** Tipo de imagen: determina el path en el bucket y el aspect ratio. */
  kind: 'hero' | 'escudo'
  /** URL actual de la imagen (modo edición). */
  currentUrl?: string | null
  /** Relación de aspecto para el recorte (hero = 2.5, escudo = 1). */
  aspect?: number
  /** Clase adicional para la preview (hero: wide, escudo: contained). */
  previewClassName?: string
  /** Mensaje cuando no hay imagen seleccionada. */
  emptyMessage?: string
  /** Se llama cada vez que el estado cambia. */
  onChange?: (state: ImageUploadState) => void
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/svg+xml', 'image/webp']
const MAX_SIZE = 5 * 1024 * 1024 // 5 MB

function isSvg(file: File): boolean {
  return file.type === 'image/svg+xml'
}

// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------

export const ImageUploadField = forwardRef<
  ImageUploadFieldHandle,
  ImageUploadFieldProps
>(function ImageUploadField(
  {
    label,
    description,
    kind,
    currentUrl = null,
    aspect = kind === 'hero' ? 2.5 : 1,
    previewClassName = kind === 'hero'
      ? 'w-full h-40 object-cover'
      : 'max-h-32 object-contain',
    emptyMessage,
    onChange,
  },
  ref,
) {
  const inputRef = useRef<HTMLInputElement>(null)

  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(currentUrl)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [removed, setRemoved] = useState(false)

  // Crop modal
  const [cropModalOpen, setCropModalOpen] = useState(false)
  const [cropSrc, setCropSrc] = useState<string | null>(null)

  // ── Cleanup blob URLs on unmount ─────────────────────────

  const previewUrlRef = useRef(previewUrl)
  previewUrlRef.current = previewUrl
  const cropSrcRef = useRef(cropSrc)
  cropSrcRef.current = cropSrc

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
      if (cropSrcRef.current) URL.revokeObjectURL(cropSrcRef.current)
    }
  }, [])

  // ── State helpers ────────────────────────────────────────

  const getState = useCallback((): ImageUploadState => {
    return { file, previewUrl, uploadedUrl, uploading, error, removed }
  }, [file, previewUrl, uploadedUrl, uploading, error, removed])

  function emit(overrides: Partial<ImageUploadState>) {
    const merged: ImageUploadState = {
      file: overrides.file !== undefined ? overrides.file : file,
      previewUrl: overrides.previewUrl !== undefined ? overrides.previewUrl : previewUrl,
      uploadedUrl: overrides.uploadedUrl !== undefined ? overrides.uploadedUrl : uploadedUrl,
      uploading: overrides.uploading !== undefined ? overrides.uploading : uploading,
      error: overrides.error !== undefined ? overrides.error : error,
      removed: overrides.removed !== undefined ? overrides.removed : removed,
    }
    onChange?.(merged)
  }

  // ── File selection ─────────────────────────────────────

  const handleFileSelect = useCallback(
    (selected: File | null) => {
      // Limpiar
      if (!selected) {
        if (previewUrl) URL.revokeObjectURL(previewUrl)
        setFile(null)
        setPreviewUrl(null)
        setUploadedUrl(currentUrl)
        setError(null)
        setRemoved(false)
        emit({ file: null, previewUrl: null, uploadedUrl: currentUrl, error: null, removed: false })
        return
      }

      // Validar tipo
      if (!ALLOWED_TYPES.includes(selected.type)) {
        setError('Formato no permitido (JPEG, PNG, SVG o WebP)')
        emit({ error: 'Formato no permitido (JPEG, PNG, SVG o WebP)' })
        return
      }

      // Validar tamaño
      if (selected.size > MAX_SIZE) {
        setError('El archivo no puede superar 5 MB')
        emit({ error: 'El archivo no puede superar 5 MB' })
        return
      }

      // SVG: aceptar directamente sin recorte
      if (isSvg(selected)) {
        if (previewUrl) URL.revokeObjectURL(previewUrl)
        const url = URL.createObjectURL(selected)
        setFile(selected)
        setPreviewUrl(url)
        setUploadedUrl(null)
        setError(null)
        setRemoved(false)
        emit({ file: selected, previewUrl: url, uploadedUrl: null, error: null, removed: false })
        return
      }

      // JPEG/PNG/WebP: abrir modal de recorte
      if (previewUrl) URL.revokeObjectURL(previewUrl)
      const url = URL.createObjectURL(selected)
      setCropSrc(url)
      setCropModalOpen(true)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentUrl, previewUrl],
  )

  // ── Crop callbacks ──────────────────────────────────────

  const handleCrop = useCallback(
    (croppedFile: File) => {
      // Liberar blob URL del crop source
      if (cropSrc) {
        URL.revokeObjectURL(cropSrc)
        setCropSrc(null)
      }

      const url = URL.createObjectURL(croppedFile)
      if (previewUrl) URL.revokeObjectURL(previewUrl)

      setFile(croppedFile)
      setPreviewUrl(url)
      setUploadedUrl(null)
      setError(null)
      setRemoved(false)
      emit({ file: croppedFile, previewUrl: url, uploadedUrl: null, error: null, removed: false })
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cropSrc, previewUrl],
  )

  const handleCropClose = useCallback(() => {
    setCropModalOpen(false)
    // Limpiar crop source (puede que ya se haya limpiado en handleCrop)
    if (cropSrc) {
      URL.revokeObjectURL(cropSrc)
      setCropSrc(null)
    }
    if (inputRef.current) inputRef.current.value = ''
  }, [cropSrc])

  // ── Remove ─────────────────────────────────────────────

  const handleRemove = useCallback(() => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setFile(null)
    setPreviewUrl(null)
    setUploadedUrl(null)
    setError(null)
    setRemoved(true)
    if (inputRef.current) inputRef.current.value = ''
    emit({ file: null, previewUrl: null, uploadedUrl: null, error: null, removed: true })
  }, [previewUrl])

  // ── Upload (called by parent via ref) ──────────────────

  const upload = useCallback(
    async (slug: string): Promise<string | null> => {
      if (!file || uploadedUrl) return uploadedUrl

      setUploading(true)
      setError(null)
      emit({ uploading: true, error: null })

      try {
        const body = new FormData()
        body.append('file', file)
        body.append('slug', slug)
        body.append('kind', kind)

        const res = await fetch('/api/admin/municipalities/upload-image', {
          method: 'POST',
          body,
        })

        if (!res.ok) {
          const errBody = await res.json().catch(() => ({ error: 'Error desconocido' }))
          throw new Error(errBody.error || 'Error al subir la imagen')
        }

        const { publicUrl } = await res.json()

        setUploadedUrl(publicUrl)
        setUploading(false)
        emit({ uploadedUrl: publicUrl, uploading: false })
        return publicUrl
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error al subir la imagen'
        setUploading(false)
        setError(message)
        emit({ uploading: false, error: message })
        throw err
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [file, uploadedUrl, kind],
  )

  // ── Expose methods to parent ───────────────────────────

  useImperativeHandle(ref, () => ({ upload, getState }), [upload, getState])

  // ── Derived ────────────────────────────────────────────

  const displayUrl = previewUrl || uploadedUrl || null
  const defaultEmptyMsg =
    kind === 'hero'
      ? 'Opcional. Si no se selecciona, se usará un fondo de color sólido.'
      : 'Opcional. Si no se selecciona, no se mostrará escudo en la landing page.'

  // ── Render ─────────────────────────────────────────────

  return (
    <>
      <div className="border border-gray-200 rounded-lg p-4 bg-gray-50/50">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium text-gray-700">{label}</p>
          <div className="flex items-center gap-2">
            {/* Solo mostrar Recortar si hay un archivo local (no una URL remota) */}
            {previewUrl && !removed && (
              <button
                type="button"
                onClick={() => setCropModalOpen(true)}
                className="text-xs text-indigo-500 hover:text-indigo-700 transition-colors"
              >
                Recortar
              </button>
            )}
            {displayUrl && (
              <button
                type="button"
                onClick={handleRemove}
                className="text-xs text-red-500 hover:text-red-700 transition-colors"
              >
                {kind === 'hero' ? 'Quitar imagen' : 'Quitar escudo'}
              </button>
            )}
          </div>
        </div>

        <p className="text-xs text-gray-400 -mt-1 mb-3">{description}</p>

        {/* Removed warning (edit mode) */}
        {removed && (
          <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2 mb-3">
            {kind === 'hero'
              ? 'Se eliminará la imagen principal al guardar. La landing usará fondo de color sólido.'
              : 'Se eliminará el escudo al guardar.'}
          </p>
        )}

        {/* Preview */}
        {displayUrl && !removed && (
          <div
            className={
              'relative mb-3 rounded-lg overflow-hidden border border-gray-200 bg-gray-100 ' +
              (kind === 'escudo' ? 'flex justify-center p-4' : '')
            }
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={displayUrl}
              alt={`Vista previa de ${label.toLowerCase()}`}
              className={previewClassName}
            />
            {uploadedUrl && !file && (
              <span className="absolute bottom-2 left-2 rounded-full bg-indigo-500 px-2 py-0.5 text-[10px] font-semibold text-white shadow">
                Actual
              </span>
            )}
            {file && !uploadedUrl && (
              <span className="absolute bottom-2 left-2 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-semibold text-white shadow">
                Pendiente
              </span>
            )}
          </div>
        )}

        {/* File input */}
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/svg+xml,image/webp"
          onChange={(e) => handleFileSelect(e.target.files?.[0] ?? null)}
          className="block w-full text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 file:transition-colors file:cursor-pointer cursor-pointer"
        />

        {/* Status */}
        {uploading && (
          <p className="mt-2 text-xs text-indigo-600 flex items-center gap-1">
            <svg className="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Subiendo imagen...
          </p>
        )}
        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
        {!file && !error && !removed && (
          <p className="mt-2 text-xs text-gray-400">
            {emptyMessage || defaultEmptyMsg}
          </p>
        )}
      </div>

      {/* Crop modal */}
      <ImageCropModal
        open={cropModalOpen}
        imageSrc={cropSrc}
        aspect={aspect}
        onCrop={handleCrop}
        onClose={handleCropClose}
      />
    </>
  )
})
