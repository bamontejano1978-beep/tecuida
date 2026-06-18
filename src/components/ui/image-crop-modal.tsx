/**
 * ImageCropModal — Modal de recorte de imagen con react-image-crop.
 *
 * Flujo:
 *   1. Se abre con una imageSrc (blob URL de la imagen seleccionada).
 *   2. El usuario arrastra/redimensiona el rectángulo de recorte.
 *   3. Al pulsar "Aplicar recorte", se renderiza el área recortada
 *      en un <canvas> y se convierte a un File (JPEG, calidad 0.9).
 *   4. El File resultante se entrega vía onCrop y el modal se cierra.
 *
 * SVG: los archivos SVG no pasan por el modal de recorte porque son
 * vectoriales; el ImageUploadField lo gestiona directamente.
 */

'use client'

import { useState, useRef, useCallback, useMemo } from 'react'
import ReactCrop, {
  type Crop,
  type PixelCrop,
  centerCrop,
  makeAspectCrop,
} from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Genera un rectángulo de recorte inicial centrado que respeta
 * la relación de aspecto deseada y cubre el 80 % del área visible.
 */
function defaultCrop(aspect: number): Crop {
  return centerCrop(
    makeAspectCrop(
      { unit: '%', width: 80 },
      aspect,
      80,  // width (%)
      80,  // height (%)
    ),
    80,
    80,
  )
}

/**
 * Renderiza el área recortada sobre un <canvas> oculto y
 * devuelve un Blob JPEG con la calidad indicada.
 */
function canvasCropToBlob(
  image: HTMLImageElement,
  crop: PixelCrop,
  quality: number = 0.9,
): Promise<Blob> {
  const canvas = document.createElement('canvas')
  const scaleX = image.naturalWidth / image.width
  const scaleY = image.naturalHeight / image.height

  canvas.width = Math.round(crop.width * scaleX)
  canvas.height = Math.round(crop.height * scaleY)

  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas no disponible')

  ctx.drawImage(
    image,
    crop.x * scaleX,
    crop.y * scaleY,
    crop.width * scaleX,
    crop.height * scaleY,
    0,
    0,
    canvas.width,
    canvas.height,
  )

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob)
        else reject(new Error('No se pudo generar el recorte'))
      },
      'image/jpeg',
      quality,
    )
  })
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface ImageCropModalProps {
  /** Si el modal está visible. */
  open: boolean
  /** Blob URL de la imagen a recortar. */
  imageSrc: string | null
  /** Relación de aspecto del recorte (ancho/alto). P.ej. 2.5 para hero. */
  aspect?: number
  /** Callback con el File recortado. */
  onCrop: (file: File) => void
  /** Cierra el modal sin recortar. */
  onClose: () => void
}

// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------

export function ImageCropModal({
  open,
  imageSrc,
  aspect = 2.5,
  onCrop,
  onClose,
}: ImageCropModalProps) {
  const imgRef = useRef<HTMLImageElement>(null)
  const [crop, setCrop] = useState<Crop>(() => defaultCrop(aspect))
  const [completedCrop, setCompletedCrop] = useState<PixelCrop | null>(null)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Reset cuando se abre con una imagen nueva
  const imgKey = useMemo(() => imageSrc ?? '', [imageSrc])

  const handleImageLoad = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      const { naturalWidth: w, naturalHeight: h } = e.currentTarget
      const initial = centerCrop(
        makeAspectCrop({ unit: '%', width: 80 }, aspect, w, h),
        w,
        h,
      )
      setCrop(initial)
      setCompletedCrop(null)
      setError(null)
    },
    [aspect],
  )

  const handleCropComplete = useCallback(
    (c: PixelCrop) => {
      setCompletedCrop(c)
    },
    [],
  )

  const handleApply = useCallback(async () => {
    if (!imgRef.current || !completedCrop) {
      setError('Ajusta el recorte antes de aplicar.')
      return
    }

    setProcessing(true)
    setError(null)

    try {
      const blob = await canvasCropToBlob(imgRef.current, completedCrop, 0.9)
      const file = new File([blob], 'recorte.jpg', { type: 'image/jpeg' })
      onCrop(file)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al recortar la imagen')
    } finally {
      setProcessing(false)
    }
  }, [completedCrop, onCrop, onClose])

  if (!open || !imageSrc) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h3 className="text-base font-semibold text-gray-900">
            Recortar imagen
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Crop area */}
        <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-gray-100">
          <ReactCrop
            crop={crop}
            onChange={(c) => setCrop(c)}
            onComplete={handleCropComplete}
            aspect={aspect}
            minWidth={80}
            minHeight={40}
            className="max-h-[55vh]"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              key={imgKey}
              ref={imgRef}
              src={imageSrc}
              alt="Recortar imagen"
              onLoad={handleImageLoad}
              className="max-h-[55vh] object-contain"
            />
          </ReactCrop>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
          <p className="text-xs text-gray-400">
            Arrastra las esquinas para ajustar el recorte
          </p>
          <div className="flex items-center gap-3">
            {error && (
              <p className="text-xs text-red-600">{error}</p>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleApply}
              disabled={processing || !completedCrop}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {processing ? 'Procesando...' : 'Aplicar recorte'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
