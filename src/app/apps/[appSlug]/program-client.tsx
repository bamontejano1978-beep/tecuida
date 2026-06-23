/**
 * AppProgramClient — Visor interactivo de programa para el PWA
 *
 * Client Component que combina:
 *   - ModuleAccordion: acordeón de módulos con lecciones
 *   - LessonViewer: visor de contenido de lección seleccionada
 *
 * Gestiona el estado: módulo expandido, lección activa.
 * Sin tracking de progreso en el PWA público (solo visualización).
 */

'use client'

import { useState } from 'react'
import ModuleAccordion from '@/components/program/module-accordion'
import LessonViewer from '@/components/program/lesson-viewer'
import type { ProgramModule, Lesson } from '@/types'

interface AppProgramClientProps {
  modules: ProgramModule[]
  programId: string
  appBrandColor: string
}

export default function AppProgramClient({
  modules,
  programId,
  appBrandColor,
}: AppProgramClientProps) {
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null)
  const [completedLessons] = useState<Set<string>>(new Set())

  // Encontrar el índice de la lección actual
  const allLessons = modules.flatMap((m) => m.lessons)
  const currentIndex = selectedLesson
    ? allLessons.findIndex((l) => l.id === selectedLesson.id)
    : -1

  const hasPrev = currentIndex > 0
  const hasNext = currentIndex >= 0 && currentIndex < allLessons.length - 1

  function handlePrev() {
    if (hasPrev) setSelectedLesson(allLessons[currentIndex - 1])
  }

  function handleNext() {
    if (hasNext) setSelectedLesson(allLessons[currentIndex + 1])
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Columna izquierda: acordeón de módulos */}
      <div className="lg:col-span-1">
        <div className="sticky top-20">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
            Contenido del programa
          </h3>
          <ModuleAccordion
            modules={modules}
            currentLessonId={selectedLesson?.id}
            completedLessons={completedLessons}
            onSelectLesson={setSelectedLesson}
            primaryColor={appBrandColor}
          />
        </div>
      </div>

      {/* Columna derecha: visor de lección */}
      <div className="lg:col-span-2">
        {selectedLesson ? (
          <LessonViewer
            lesson={selectedLesson}
            programId={programId}
            hasPrev={hasPrev}
            hasNext={hasNext}
            onPrev={handlePrev}
            onNext={handleNext}
            primaryColor={appBrandColor}
          />
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <div
              className="mx-auto grid h-16 w-16 place-items-center rounded-2xl mb-4 text-2xl"
              style={{ backgroundColor: `${appBrandColor}15` }}
            >
              📋
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Selecciona una lección
            </h3>
            <p className="text-sm text-gray-500 max-w-sm mx-auto">
              Elige un módulo y una lección del panel izquierdo para empezar a explorar el contenido del programa.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
