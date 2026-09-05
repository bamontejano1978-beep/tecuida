'use client'

import { useEffect, useState } from 'react'
import ApplicationVisit from '@/components/dashboard/application-visit'

export default function ExternalApplication({ id, name, src }: { id: string; name: string; src: string }) {
  const [loaded, setLoaded] = useState(false)
  const [slow, setSlow] = useState(false)
  useEffect(() => { const timer = setTimeout(() => setSlow(true), 12000); return () => clearTimeout(timer) }, [])
  return <section className="flex min-h-[calc(100dvh-7rem)] flex-col bg-white">
    <ApplicationVisit applicationId={id} launch view={false} />
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 px-4 py-2 text-sm">
      <span role="status">{!loaded ? slow ? 'La carga está tardando más de lo habitual.' : 'Abriendo aplicación…' : name}</span>
      <a href={src} target="_blank" rel="noopener noreferrer" title="Abrir directamente, también si no aparecen tus avances anteriores" className="min-h-11 py-3 font-semibold text-emerald-800 underline">Abrir en otra pestaña</a>
    </div>
    <iframe title={name} src={src} onLoad={() => setLoaded(true)}
      className="min-h-[calc(100dvh-11rem)] w-full flex-1 border-0"
      sandbox="allow-scripts allow-same-origin allow-forms allow-downloads allow-popups allow-popups-to-escape-sandbox"
      allow="fullscreen" referrerPolicy="no-referrer" />
  </section>
}
