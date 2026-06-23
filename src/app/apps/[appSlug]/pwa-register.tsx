'use client'

/**
 * PwaRegister — Registra el service worker en el navegador
 *
 * Se monta una vez al cargar la app en el subdominio.
 * El service worker (public/sw.js) cachea assets estáticos
 * para funcionamiento offline.
 */

import { useEffect } from 'react'

export default function PwaRegister() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return
    }

    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((registration) => {
        console.log('[PWA] Service Worker registrado:', registration.scope)
      })
      .catch((err) => {
        console.error('[PWA] Error registrando Service Worker:', err)
      })
  }, [])

  return null
}
