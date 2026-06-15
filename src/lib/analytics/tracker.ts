/**
 * Analytics Tracker — Registro de eventos de uso (CLIENT-SIDE ONLY)
 *
 * Hook para registrar eventos analíticos desde Client Components.
 * Los eventos se envían a la tabla analytics_events de Supabase.
 *
 * Uso:
 * ```ts
 * import { useAnalytics } from '@/lib/analytics/tracker'
 *
 * const { track } = useAnalytics(userId, municipalityId)
 * track('lesson_started', { lesson_id: '123' })
 * ```
 *
 * Requisitos: 14.1, 14.2
 */

import { useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

/** Nombres de eventos estándar */
export type AnalyticsEventName =
  | 'page_view'
  | 'catalog_search'
  | 'category_filter'
  | 'app_view'
  | 'lesson_started'
  | 'lesson_completed'
  | 'program_enrolled'
  | 'program_completed'
  | 'achievement_unlocked'
  | 'login'
  | 'register'
  | 'logout'

/** Payload flexible para cada evento */
export interface AnalyticsPayload {
  [key: string]: unknown
}

// ---------------------------------------------------------------------------
// Hook principal (CLIENT-ONLY)
// ---------------------------------------------------------------------------

/**
 * Hook para registrar eventos analíticos desde Client Components.
 *
 * Encola eventos en lotes cada 5 segundos para reducir peticiones.
 * Si userId es null/undefined, los eventos se registran como anónimos.
 *
 * @param userId - ID del usuario autenticado (puede ser null para anónimo)
 * @param municipalityId - ID del municipio (tenant)
 */
export function useAnalytics(
  userId: string | null | undefined,
  municipalityId: string | null | undefined,
) {
  const queueRef = useRef<Array<{ evento: string; payload: AnalyticsPayload }>>(
    [],
  )
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const flush = useCallback(async () => {
    const events = queueRef.current
    if (events.length === 0) return

    queueRef.current = []

    try {
      const supabase = createClient()

      const rows = events.map((e) => ({
        municipality_id: municipalityId || '00000000-0000-0000-0000-000000000000',
        user_id: userId || null,
        evento: e.evento,
        payload: e.payload,
      }))

      await supabase.from('analytics_events').insert(rows)
    } catch {
      // Silencioso: no interrumpir la UX por errores de analytics
    }
  }, [userId, municipalityId])

  const track = useCallback(
    (evento: AnalyticsEventName, payload: AnalyticsPayload = {}) => {
      queueRef.current.push({
        evento,
        payload: {
          ...payload,
          url: typeof window !== 'undefined' ? window.location.pathname : '',
          timestamp: new Date().toISOString(),
        },
      })

      if (!flushTimerRef.current) {
        flushTimerRef.current = setTimeout(() => {
          flushTimerRef.current = null
          flush()
        }, 5000)
      }
    },
    [flush],
  )

  const flushNow = useCallback(async () => {
    if (flushTimerRef.current) {
      clearTimeout(flushTimerRef.current)
      flushTimerRef.current = null
    }
    await flush()
  }, [flush])

  return { track, flushNow }
}
