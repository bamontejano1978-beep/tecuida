'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function FavoriteButton({ applicationId, name, initial = false }: {
  applicationId: string; name: string; initial?: boolean
}) {
  const [favorite, setFavorite] = useState(initial)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  async function toggle() {
    setPending(true)
    setError('')
    try {
      const response = await fetch('/api/citizen/applications', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ application_id: applicationId, action: 'favorite', favorite: !favorite }),
      })
      if (!response.ok) throw new Error('No se pudo guardar el favorito. Vuelve a intentarlo.')
      setFavorite(!favorite)
      router.refresh()
    } catch { setError('No se pudo guardar el favorito. Vuelve a intentarlo.') }
    finally { setPending(false) }
  }
  return <div className="p-3">
    <button type="button" disabled={pending} aria-pressed={favorite} onClick={toggle}
      title={`${favorite ? 'Quitar de' : 'Añadir a'} favoritos: ${name}`}
      aria-label={`${favorite ? 'Quitar de' : 'Añadir a'} favoritos: ${name}`}
      className="flex min-h-11 items-center gap-2 rounded-md px-3 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50">
      <span aria-hidden="true" className="text-xl">{favorite ? '♥' : '♡'}</span>{favorite ? 'Favorita' : 'Guardar'}
    </button>
    {error && <p role="alert" className="text-xs text-red-700">{error}</p>}
  </div>
}
