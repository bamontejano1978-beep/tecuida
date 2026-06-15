/**
 * ModuleAccordion — Acordeón de módulos con lecciones
 *
 * Client Component que muestra los módulos de un programa como
 * secciones expandibles con la lista de lecciones dentro.
 *
 * Props:
 *   - modules: ProgramModule[] con lessons anidadas
 *   - currentLessonId: id de la lección activa (opcional)
 *   - completedLessons: Set de IDs de lecciones completadas
 *   - onSelectLesson: callback al seleccionar una lección
 *   - primaryColor: color primario del tenant
 *
 * Requisitos: 7.1
 */

'use client'

import { useState } from 'react'
import type { ProgramModule, Lesson, LessonType } from '@/types'

// ---------------------------------------------------------------------------
// Iconos por tipo de lección
// ---------------------------------------------------------------------------

const lessonIcons: Record<LessonType, React.ReactNode> = {
  texto: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
    </svg>
  ),
  audio: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 0 1 0 12.728M16.463 8.288a5.25 5.25 0 0 1 0 7.424M6.75 8.25l4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.009 9.009 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z" />
    </svg>
  ),
  video: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
    </svg>
  ),
  ejercicio: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
    </svg>
  ),
  combinado: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 0 0-5.78 1.128 2.25 2.25 0 0 1-2.4 2.245 4.5 4.5 0 0 0 8.4-2.245c0-.399-.078-.78-.22-1.128Zm0 0a15.998 15.998 0 0 0 3.388-1.62m-5.043-.025a15.994 15.994 0 0 1 1.622-3.395m3.42 3.42a15.995 15.995 0 0 0 4.764-4.648l3.876-5.814a1.151 1.151 0 0 0-1.597-1.597L14.146 6.32a15.996 15.996 0 0 0-4.649 4.763m3.42 3.42a6.776 6.776 0 0 0-3.42-3.42" />
    </svg>
  ),
}

const lessonTypeLabels: Record<LessonType, string> = {
  texto: 'Lectura',
  audio: 'Audio',
  video: 'Video',
  ejercicio: 'Ejercicio',
  combinado: 'Mixto',
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ModuleAccordionProps {
  modules: ProgramModule[]
  currentLessonId?: string
  completedLessons: Set<string>
  onSelectLesson: (lesson: Lesson) => void
  primaryColor?: string
}

// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------

export default function ModuleAccordion({
  modules,
  currentLessonId,
  completedLessons,
  onSelectLesson,
  primaryColor = '#4f46e5',
}: ModuleAccordionProps) {
  const [expandedModules, setExpandedModules] = useState<Set<string>>(
    // Expandir por defecto el primer módulo
    new Set(modules.length > 0 ? [modules[0].id] : []),
  )

  const toggleModule = (id: string) => {
    setExpandedModules((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="space-y-2">
      {modules.map((mod) => {
        const isExpanded = expandedModules.has(mod.id)
        const completedInModule = mod.lessons.filter((l) => completedLessons.has(l.id)).length
        const totalInModule = mod.lessons.length

        return (
          <div
            key={mod.id}
            className="rounded-lg border border-gray-200 bg-white overflow-hidden"
          >
            {/* Cabecera del módulo */}
            <button
              type="button"
              onClick={() => toggleModule(mod.id)}
              className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-inset"
              style={{ '--focus-ring-color': primaryColor } as React.CSSProperties}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                  style={{ backgroundColor: primaryColor }}
                >
                  {mod.numero}
                </span>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-gray-900 truncate">
                    {mod.nombre}
                  </h3>
                  <p className="text-xs text-gray-500">
                    {completedInModule}/{totalInModule} completadas
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                {/* Barra de progreso mini */}
                <div className="hidden sm:flex items-center gap-1.5">
                  <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${totalInModule > 0 ? (completedInModule / totalInModule) * 100 : 0}%`,
                        backgroundColor: primaryColor,
                      }}
                    />
                  </div>
                  <span className="text-xs text-gray-400">
                    {totalInModule > 0 ? Math.round((completedInModule / totalInModule) * 100) : 0}%
                  </span>
                </div>
                {/* Chevron */}
                <svg
                  className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                </svg>
              </div>
            </button>

            {/* Lecciones */}
            {isExpanded && (
              <div className="border-t border-gray-100 divide-y divide-gray-50">
                {mod.lessons.map((lesson) => {
                  const isCompleted = completedLessons.has(lesson.id)
                  const isActive = lesson.id === currentLessonId

                  return (
                    <button
                      key={lesson.id}
                      type="button"
                      onClick={() => onSelectLesson(lesson)}
                      className={`w-full flex items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-gray-50 focus:outline-none ${
                        isActive ? 'bg-indigo-50 border-l-2' : 'border-l-2 border-transparent'
                      }`}
                      style={
                        isActive
                          ? {
                              borderLeftColor: primaryColor,
                              backgroundColor: `${primaryColor}10`,
                            }
                          : undefined
                      }
                    >
                      {/* Icono de tipo */}
                      <span
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                          isCompleted ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-50 text-gray-400'
                        }`}
                      >
                        {isCompleted ? (
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                          </svg>
                        ) : (
                          lessonIcons[lesson.tipo] || lessonIcons.texto
                        )}
                      </span>

                      <div className="min-w-0 flex-1">
                        <p className={`text-sm truncate ${isActive ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
                          {lesson.titulo}
                        </p>
                        <p className="text-xs text-gray-400">
                          {lessonTypeLabels[lesson.tipo]} · {lesson.duracion_minutos} min
                        </p>
                      </div>

                      {/* Indicador de activo */}
                      {isActive && (
                        <div
                          className="h-2 w-2 rounded-full shrink-0"
                          style={{ backgroundColor: primaryColor }}
                        />
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
