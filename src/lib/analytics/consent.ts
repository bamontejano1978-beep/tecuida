/**
 * Cookie Consent — Utilidad RGPD para gestionar el consentimiento de cookies
 *
 * Almacena el estado en localStorage bajo la clave `tecuida-cookie-consent`.
 * Valores posibles:
 *   - `undefined` → aún no ha decidido (se muestra el banner)
 *   - `"accepted"` → aceptó cookies analíticas
 *   - `"rejected"` → rechazó cookies analíticas
 *
 * Uso desde Client Components:
 * ```ts
 * import { useCookieConsent, acceptCookies, rejectCookies } from '@/lib/analytics/consent'
 * const { consent, hasDecided } = useCookieConsent()
 * ```
 */

'use client'

import { useState, useEffect, useCallback } from 'react'

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'tecuida-cookie-consent'
export type ConsentState = 'accepted' | 'rejected'

// ---------------------------------------------------------------------------
// Lectura síncrona (útil fuera de React, p.ej. en tracker)
// ---------------------------------------------------------------------------

/** Lee el consentimiento directamente de localStorage (sin React). Devuelve null si no se ha decidido aún. */
export function getConsentSync(): ConsentState | null {
  if (typeof window === 'undefined') return null
  const value = window.localStorage.getItem(STORAGE_KEY)
  if (value === 'accepted' || value === 'rejected') return value
  return null
}

// ---------------------------------------------------------------------------
// Escritura (exportadas para que el banner las use)
// ---------------------------------------------------------------------------

/** Guarda "accepted" en localStorage */
export function persistConsent(consent: ConsentState): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, consent)
}

// ---------------------------------------------------------------------------
// Hook React (para componentes que necesitan reaccionar a cambios)
// ---------------------------------------------------------------------------

export function useCookieConsent() {
  const [consent, setConsent] = useState<ConsentState | null>(() =>
    getConsentSync(),
  )
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)

    // Sincronizar con storage (por si se cambió en otra pestaña)
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        const value = e.newValue
        if (value === 'accepted' || value === 'rejected') {
          setConsent(value)
        } else {
          setConsent(null)
        }
      }
    }
    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [])

  const accept = useCallback(() => {
    persistConsent('accepted')
    setConsent('accepted')
  }, [])

  const reject = useCallback(() => {
    persistConsent('rejected')
    setConsent('rejected')
  }, [])

  // Solo considerar la decisión tras el montaje en cliente para evitar
  // hydration mismatch entre server (sin localStorage) y cliente (con localStorage).
  // Si no hay montaje aún, siempre se muestra el banner para igualar el HTML del servidor.
  const hasDecided = mounted && consent !== null

  return { consent, hasDecided, accept, reject }
}
