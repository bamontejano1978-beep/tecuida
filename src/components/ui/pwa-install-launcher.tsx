'use client'

import { useEffect, useState } from 'react'

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

function isStandalone() {
  if (typeof window === 'undefined') return false
  const matchesDisplayMode =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(display-mode: standalone)').matches

  return (
    matchesDisplayMode ||
    ('standalone' in window.navigator &&
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true)
  )
}

export default function PwaInstallLauncher({
  municipalityName,
  primaryColor,
}: {
  municipalityName: string
  primaryColor: string
}) {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [hidden, setHidden] = useState(true)

  useEffect(() => {
    if (typeof window === 'undefined') return

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/', updateViaCache: 'none' })
        .then((registration) => registration.update())
        .catch((error) => {
          console.error('[PWA] Error registrando Service Worker:', error)
        })
    }

    const dismissed = window.localStorage.getItem('tecuida-launcher-install-dismissed') === '1'
    if (isStandalone() || dismissed) return

    const handlePrompt = (event: Event) => {
      event.preventDefault()
      setInstallPrompt(event as BeforeInstallPromptEvent)
      setHidden(false)
    }

    const handleInstalled = () => {
      setInstallPrompt(null)
      setHidden(true)
    }

    window.addEventListener('beforeinstallprompt', handlePrompt)
    window.addEventListener('appinstalled', handleInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handlePrompt)
      window.removeEventListener('appinstalled', handleInstalled)
    }
  }, [])

  if (hidden || !installPrompt) return null

  async function install() {
    if (!installPrompt) return
    await installPrompt.prompt()
    const choice = await installPrompt.userChoice
    if (choice.outcome === 'accepted') {
      setHidden(true)
    }
    setInstallPrompt(null)
  }

  function dismiss() {
    window.localStorage.setItem('tecuida-launcher-install-dismissed', '1')
    setHidden(true)
  }

  return (
    <section className="mb-5 overflow-hidden rounded-lg border border-slate-200 bg-slate-950 text-white shadow-lg shadow-slate-900/10">
      <div className="h-1" style={{ backgroundColor: primaryColor }} />
      <div className="p-4 sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-sky-300">
              Acceso rápido
            </p>
            <h2 className="mt-1 text-lg font-black tracking-tight">
              Instala tu lanzadera municipal
            </h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-300">
              Tendrás las aplicaciones de {municipalityName} en la pantalla de inicio, como una app más.
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={dismiss}
              className="min-h-11 rounded-md border border-white/15 px-4 text-sm font-bold text-slate-300 transition hover:bg-white/10"
            >
              Ahora no
            </button>
            <button
              type="button"
              onClick={install}
              className="min-h-11 rounded-md bg-white px-4 text-sm font-black text-slate-950 transition hover:bg-sky-50"
            >
              Instalar
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
