/**
 * ProgramPageClient — Envoltorio client-side del programa
 *
 * Gestiona el estado de la lección actual (selección en sidebar → visor),
 * la navegación prev/next y el tracking de lecciones completadas localmente.
 */

'use client'

import { useState, useMemo, useCallback } from 'react'
import ModuleAccordion from '@/components/program/module-accordion'
import LessonViewer from '@/components/program/lesson-viewer'
import type { Program, ProgramModule, Lesson } from '@/types'

interface ProgramPageClientProps {
  program: Program
  modules: ProgramModule[]
  allLessons: Lesson[]
  completedLessonIds: string[]
  primaryColor: string
}

export default function ProgramPageClient({
  program,
  modules,
  allLessons,
  completedLessonIds: initialCompleted,
  primaryColor,
}: ProgramPageClientProps) {
  const [currentLessonId, setCurrentLessonId] = useState<string | null>(
    allLessons[0]?.id || null,
  )
  const [completedSet, setCompletedSet] = useState<Set<string>>(
    new Set(initialCompleted),
  )

  const currentLesson = useMemo(
    () => allLessons.find((l) => l.id === currentLessonId) || null,
    [allLessons, currentLessonId],
  )

  const currentIndex = useMemo(
    () => allLessons.findIndex((l) => l.id === currentLessonId),
    [allLessons, currentLessonId],
  )

  const handleSelectLesson = useCallback((lesson: Lesson) => {
    setCurrentLessonId(lesson.id)
  }, [])

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentLessonId(allLessons[currentIndex - 1].id)
    }
  }, [currentIndex, allLessons])

  const handleNext = useCallback(() => {
    if (currentIndex < allLessons.length - 1) {
      setCurrentLessonId(allLessons[currentIndex + 1].id)
    }
  }, [currentIndex, allLessons])

  const handleComplete = useCallback(() => {
    if (!currentLessonId) return
    setCompletedSet((prev) => {
      const next = new Set(prev)
      next.add(currentLessonId)
      return next
    })
    // Avanzar automáticamente a la siguiente lección
    handleNext()
  }, [currentLessonId, handleNext])

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar: acordeón de módulos */}
        <aside className="lg:w-80 shrink-0">
          <div className="sticky top-4">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
              Contenido del programa
            </h3>
            <ModuleAccordion
              modules={modules}
              currentLessonId={currentLessonId || undefined}
              completedLessons={completedSet}
              onSelectLesson={handleSelectLesson}
              primaryColor={primaryColor}
            />
          </div>
        </aside>

        {/* Contenido principal: visor de lección */}
        <main className="flex-1 min-w-0">
          {currentLesson ? (
            <LessonViewer
              lesson={currentLesson}
              programId={program.id}
              onPrev={handlePrev}
              onNext={handleNext}
              hasPrev={currentIndex > 0}
              hasNext={currentIndex < allLessons.length - 1}
              onComplete={handleComplete}
              isCompleted={completedSet.has(currentLesson.id)}
              primaryColor={primaryColor}
            />
          ) : (
            <div className="flex items-center justify-center h-64 bg-white rounded-xl border border-gray-200">
              <p className="text-gray-400">
                Selecciona una lección para comenzar
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
