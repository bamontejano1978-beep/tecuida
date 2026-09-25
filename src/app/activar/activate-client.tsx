'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

/**
 * Activación de códigos ODS (programa VCA TE CUIDA).
 *
 * Paso 1: introducir el código recibido por correo.
 * Paso 2: elegir una aplicación de las que aún no se tienen.
 * Paso 3: confirmación con acceso directo.
 *
 * La regla semanal (una activación por semana ISO, siempre de una app
 * distinta) la aplica el backend; aquí solo se muestran sus mensajes.
 */

interface EligibleApp {
  id: string
  nombre: string
  descripcion: string | null
  thumbnail_url: string | null
  tipo: string
  app_slug: string | null
}

type Step = 'code' | 'choose' | 'done'

export default function ActivateOdsClient() {
  const [step, setStep] = useState<Step>('code')
  const [code, setCode] = useState('')
  const [apps, setApps] = useState<EligibleApp[]>([])
  const [weeklyUsed, setWeeklyUsed] = useState(false)
  const [grantedApp, setGrantedApp] = useState<EligibleApp | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Carga perezosa de elegibilidad al entrar al paso de elección.
    if (step !== 'choose' || apps.length > 0 || busy) return
    setBusy('eligibility')
    fetch('/api/ods/eligibility')
      .then(async (res) => {
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'No se pudieron cargar las aplicaciones.')
        setApps(data.applications || [])
        setWeeklyUsed(Boolean(data.weekly_used))
      })
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : 'Error inesperado'),
      )
      .finally(() => setBusy(null))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step])

  async function submitCode(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy('code')
    try {
      // Migración 069: si el lote del código tiene app pre-asignada, se
      // activa directamente sin paso de elección. Si no, flujo clásico.
      const res = await fetch(`/api/ods/resolve?code=${encodeURIComponent(code)}`)
      const data = await res.json()
      if (res.ok && data.assigned && data.application) {
        await activateCode(null, data.application as EligibleApp)
        return
      }
      setStep('choose')
    } catch {
      // Ante cualquier fallo del resolve, el flujo clásico sigue válido:
      // la validación real ocurre en /api/ods/activate.
      setStep('choose')
    } finally {
      setBusy(null)
    }
  }

  async function activateCode(applicationId: string | null, knownApp?: EligibleApp) {
    setError(null)
    try {
      const res = await fetch('/api/ods/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          applicationId ? { code, application_id: applicationId } : { code },
        ),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'No se pudo activar el código.')
      setGrantedApp(knownApp || apps.find((a) => a.id === data.application_id) || null)
      setStep('done')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error inesperado')
      throw err
    }
  }

  async function chooseApp(app: EligibleApp) {
    setBusy(`choose-${app.id}`)
    try {
      await activateCode(app.id)
    } catch {
      // el error ya se muestra en activateCode
    } finally {
      setBusy(null)
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="mx-auto max-w-2xl">
        <p className="text-sm font-semibold uppercase tracking-wide text-indigo-600">
          Programa ODS · VCA TE CUIDA
        </p>
        <h1 className="mt-1 text-3xl font-bold text-gray-900">
          Una idea para mejorar Villafranca. Un recurso para cuidarte a ti.
        </h1>

        {step === 'code' && (
          <form
            onSubmit={submitCode}
            className="mt-8 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
          >
            <label htmlFor="ods-code" className="block text-sm font-medium text-gray-700">
              Introduce el código que has recibido por correo
            </label>
            <input
              id="ods-code"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="XX-XXXX-XXXX-XXXX-XXXX"
              autoComplete="off"
              required
              className="mt-2 block w-full rounded-xl border border-gray-300 px-4 py-3 font-mono text-lg tracking-wider uppercase focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            />
            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={busy !== null || code.trim().length < 8}
              className="mt-4 w-full rounded-xl bg-indigo-600 px-4 py-3 font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50"
            >
              {busy === 'code' ? 'Comprobando…' : 'Continuar'}
            </button>
            <p className="mt-3 text-xs text-gray-500">
              Debes haber iniciado sesión con el mismo correo electrónico que escribiste en tu
              tarjeta. Si aún no tienes cuenta,{' '}
              <Link href="/register" className="font-medium text-indigo-600 hover:underline">
                regístrate aquí
              </Link>
              .
            </p>
          </form>
        )}

        {step === 'choose' && (
          <div className="mt-8">
            {weeklyUsed && (
              <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                Ya has activado un recurso esta semana. Podrás activar otro a partir del lunes.
              </div>
            )}
            {error && (
              <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {error}
              </div>
            )}
            <h2 className="text-lg font-semibold text-gray-900">
              Elige tu aplicación ({apps.length} disponibles para ti)
            </h2>
            {busy === 'eligibility' ? (
              <p className="mt-4 text-sm text-gray-500">Cargando aplicaciones…</p>
            ) : apps.length === 0 ? (
              <p className="mt-4 text-sm text-gray-500">
                Ya tienes todas las aplicaciones de tu municipio. ¡Gracias por participar!
              </p>
            ) : (
              <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                {apps.map((app) => (
                  <li key={app.id}>
                    <button
                      type="button"
                      onClick={() => chooseApp(app)}
                      disabled={weeklyUsed || busy !== null}
                      className="w-full rounded-2xl border border-gray-200 bg-white p-4 text-left shadow-sm transition hover:border-indigo-300 hover:shadow disabled:opacity-50"
                    >
                      <span className="block font-semibold text-gray-900">{app.nombre}</span>
                      <span className="mt-1 block line-clamp-2 text-sm text-gray-500">
                        {app.descripcion || ''}
                      </span>
                      <span className="mt-2 block text-xs font-semibold text-indigo-600">
                        {busy === `choose-${app.id}` ? 'Activando…' : 'Elegir esta'}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {step === 'done' && grantedApp && (
          <div className="mt-8 rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center">
            <h2 className="text-xl font-bold text-emerald-900">¡Tu recurso está activo!</h2>
            <p className="mt-2 text-sm text-emerald-800">
              Ya tienes acceso a <strong>{grantedApp.nombre}</strong>. La próxima semana puedes
              participar de nuevo con otra idea y elegir una aplicación distinta.
            </p>
            <Link
              href={grantedApp.app_slug ? `/apps/${grantedApp.app_slug}` : '/dashboard'}
              className="mt-4 inline-block rounded-xl bg-emerald-600 px-6 py-3 font-semibold text-white hover:bg-emerald-700"
            >
              Abrir {grantedApp.nombre}
            </Link>
          </div>
        )}
      </div>
    </main>
  )
}
