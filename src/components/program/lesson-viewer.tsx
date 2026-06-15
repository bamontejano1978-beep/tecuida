/**
 * LessonViewer — Visor de contenido de lección
 *
 * Client Component que muestra el contenido de una lección
 * según su tipo (texto, audio, video, ejercicio, combinado)
 * e incluye navegación prev/next.
 *
 * Props:
 *   - lesson: la lección activa
 *   - programId: id del programa (para marcar progreso)
 *   - onPrev / onNext: callbacks de navegación
 *   - hasPrev / hasNext: flags de navegación
 *   - onComplete: callback al marcar como completada
 *   - primaryColor: color primario del tenant
 *
 * Requisitos: 7.1
 */

'use client'

import type { Lesson } from '@/types'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface LessonViewerProps {
  lesson: Lesson
  programId: string
  onPrev?: () => void
  onNext?: () => void
  hasPrev: boolean
  hasNext: boolean
  onComplete?: () => void
  isCompleted?: boolean
  primaryColor?: string
}

// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------

export default function LessonViewer({
  lesson,
  onPrev,
  onNext,
  hasPrev,
  hasNext,
  onComplete,
  isCompleted = false,
  primaryColor = '#4f46e5',
}: LessonViewerProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Cabecera de lección */}
      <div className="px-6 py-5 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">
              {lesson.tipo}
            </p>
            <h2 className="mt-1 text-xl font-bold text-gray-900">
              {lesson.titulo}
            </h2>
          </div>
          <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
            {lesson.duracion_minutos} min
          </span>
        </div>
      </div>

      {/* Contenido según tipo */}
      <div className="px-6 py-6">
        {/* Contenido textual (siempre presente en tipo combinado/texto/ejercicio) */}
        {lesson.contenido_texto && (
          <div className="prose prose-sm max-w-none text-gray-600">
            {lesson.contenido_texto.split('\n').map((p, i) => (
              <p key={i} className="mb-3 leading-relaxed">
                {p}
              </p>
            ))}
          </div>
        )}

        {/* Audio */}
        {lesson.audio_url && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3 mb-2">
              <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 0 1 0 12.728M16.463 8.288a5.25 5.25 0 0 1 0 7.424M6.75 8.25l4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.009 9.009 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z" />
              </svg>
              <span className="text-sm font-medium text-gray-700">Audio de la sesión</span>
            </div>
            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
            <audio controls className="w-full mt-2" src={lesson.audio_url}>
              Tu navegador no soporta el elemento de audio.
            </audio>
          </div>
        )}

        {/* Video */}
        {lesson.video_url && (
          <div className="mt-4 aspect-video rounded-lg overflow-hidden bg-black">
            <iframe
              src={lesson.video_url}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title={lesson.titulo}
            />
          </div>
        )}

        {/* Ejercicio */}
        {lesson.ejercicio && (
          <div className="mt-4 p-5 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-center gap-2 mb-3">
              <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
              </svg>
              <span className="text-sm font-semibold text-amber-800">
                {lesson.ejercicio.tipo === 'reflexion' && 'Ejercicio de reflexión'}
                {lesson.ejercicio.tipo === 'cuestionario' && 'Cuestionario'}
                {lesson.ejercicio.tipo === 'respiracion' && 'Ejercicio de respiración'}
                {lesson.ejercicio.tipo === 'escritura' && 'Ejercicio de escritura'}
              </span>
            </div>
            <p className="text-sm text-amber-700 mb-4">{lesson.ejercicio.instrucciones}</p>
            {lesson.ejercicio.preguntas?.map((q) => (
              <div key={q.id} className="mt-3">
                <p className="text-sm font-medium text-gray-800">{q.texto}</p>
                {q.opciones && q.tipo === 'opciones' && (
                  <div className="mt-2 space-y-1">
                    {q.opciones.map((opt, i) => (
                      <label key={i} className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                        <input type="radio" name={q.id} className="text-amber-600" />
                        {opt}
                      </label>
                    ))}
                  </div>
                )}
                {q.tipo === 'abierta' && (
                  <textarea
                    className="mt-2 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                    rows={3}
                    placeholder="Escribe tu respuesta aquí..."
                  />
                )}
                {q.tipo === 'escala' && (
                  <div className="mt-2 flex gap-3">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                      <button
                        key={n}
                        type="button"
                        className="h-9 w-9 rounded-full border border-gray-300 text-sm text-gray-600 hover:border-amber-400 hover:bg-amber-50 transition-colors"
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Barra de navegación inferior */}
      <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
        <button
          type="button"
          onClick={onPrev}
          disabled={!hasPrev}
          className="inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-white hover:shadow-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
          Anterior
        </button>

        {/* Botón de completar */}
        {onComplete && (
          <button
            type="button"
            onClick={onComplete}
            disabled={isCompleted}
            className="inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed hover:shadow-md"
            style={{
              backgroundColor: isCompleted ? '#10b981' : primaryColor,
            }}
          >
            {isCompleted ? (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                </svg>
                Completada
              </>
            ) : (
              'Marcar como completada'
            )}
          </button>
        )}

        <button
          type="button"
          onClick={onNext}
          disabled={!hasNext}
          className="inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-white hover:shadow-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Siguiente
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
          </svg>
        </button>
      </div>
    </div>
  )
}
