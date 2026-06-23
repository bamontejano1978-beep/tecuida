'use client'

/**
 * NotificationSettings — Configuración de notificaciones del ciudadano
 *
 * Client Component que permite al ciudadano activar/desactivar
 * recordatorios por email y configurar la frecuencia.
 *
 * Guarda automáticamente al cambiar cualquier toggle o selector
 * (sin botón de guardar — los cambios son inmediatos).
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export interface NotificationPrefs {
  recordatorio_activo: boolean
  frecuencia: 'diaria' | 'semanal'
  hora: string
}

// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------

interface NotificationSettingsProps {
  userId: string
  initialPrefs: NotificationPrefs
}

export default function NotificationSettings({
  userId,
  initialPrefs,
}: NotificationSettingsProps) {
  const [prefs, setPrefs] = useState<NotificationPrefs>(initialPrefs)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<
    { type: 'ok' | 'error'; text: string } | null
  >(null)
  const lastSavedRef = useRef(initialPrefs)

  const save = useCallback(
    async (newPrefs: NotificationPrefs) => {
      setSaving(true)
      setMessage(null)

      try {
        const supabase = createClient()
        const { error } = await supabase
          .from('users')
          .update({
            notificaciones: newPrefs as unknown as Record<string, unknown>,
          })
          .eq('id', userId)

        if (error) throw new Error(error.message)

        lastSavedRef.current = newPrefs
        setMessage({ type: 'ok', text: 'Preferencias guardadas.' })
      } catch (err) {
        setMessage({
          type: 'error',
          text:
            err instanceof Error ? err.message : 'Error al guardar.',
        })
      } finally {
        setSaving(false)
      }
    },
    [userId],
  )

  // Debounce: guardar 500ms después del último cambio
  useEffect(() => {
    // No guardar si las preferencias no han cambiado respecto a lo ya guardado
    if (
      prefs.recordatorio_activo === lastSavedRef.current.recordatorio_activo &&
      prefs.frecuencia === lastSavedRef.current.frecuencia &&
      prefs.hora === lastSavedRef.current.hora
    ) {
      return
    }

    const timer = setTimeout(() => save(prefs), 500)
    return () => clearTimeout(timer)
  }, [prefs, save])

  function updatePref<K extends keyof NotificationPrefs>(
    key: K,
    value: NotificationPrefs[K],
  ) {
    setPrefs((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
      <div>
        <h2 className="text-lg font-bold text-gray-900">🔔 Notificaciones</h2>
        <p className="mt-1 text-xs text-gray-400">
          Configura cómo quieres recibir recordatorios sobre tus aplicaciones.
        </p>
      </div>

      {message && (
        <div
          className={`rounded-md p-3 ${
            message.type === 'ok'
              ? 'bg-emerald-50 border border-emerald-200'
              : 'bg-red-50 border border-red-200'
          }`}
        >
          <p
            className={`text-sm ${
              message.type === 'ok' ? 'text-emerald-700' : 'text-red-700'
            }`}
          >
            {message.text}
          </p>
        </div>
      )}

      {/* Toggle principal */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-900">
            Recordatorios por email
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            Te avisaremos de las apps disponibles en tu municipio.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={prefs.recordatorio_activo}
          aria-label="Activar recordatorios por email"
          onClick={() =>
            updatePref('recordatorio_activo', !prefs.recordatorio_activo)
          }
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
            prefs.recordatorio_activo ? 'bg-indigo-600' : 'bg-gray-200'
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ${
              prefs.recordatorio_activo ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      {/* Opciones de frecuencia (solo visibles cuando está activo) */}
      {prefs.recordatorio_activo && (
        <div className="space-y-4 pl-1 border-l-2 border-indigo-100">
          {/* Frecuencia */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Frecuencia
            </label>
            <div className="flex gap-2" role="radiogroup" aria-label="Frecuencia de los recordatorios">
              {(['diaria', 'semanal'] as const).map((freq) => (
                <button
                  key={freq}
                  type="button"
                  role="radio"
                  aria-checked={prefs.frecuencia === freq}
                  onClick={() => updatePref('frecuencia', freq)}
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                    prefs.frecuencia === freq
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {freq === 'diaria' ? 'Cada día' : 'Cada semana'}
                </button>
              ))}
            </div>
          </div>

          {/* Hora */}
          <div className="max-w-[180px]">
            <label
              htmlFor="hora-recordatorio"
              className="block text-sm font-medium text-gray-700 mb-1.5"
            >
              A las
            </label>
            <input
              id="hora-recordatorio"
              type="time"
              value={prefs.hora}
              onChange={(e) => updatePref('hora', e.target.value)}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
            />
          </div>

          {/* Vista previa del mensaje */}
          <div className="rounded-lg bg-amber-50 border border-amber-100 p-4">
            <p className="text-xs font-medium text-amber-700 mb-1">
              📬 Así será tu recordatorio:
            </p>
            <p className="text-xs text-amber-600">
              {prefs.frecuencia === 'diaria'
                ? `Recibirás un email cada día a las ${prefs.hora} con un resumen de las apps disponibles en tu municipio.`
                : `Recibirás un email cada semana a las ${prefs.hora} con un resumen de las apps disponibles en tu municipio.`}
            </p>
          </div>
        </div>
      )}

      {/* Indicador de guardado */}
      {saving && (
        <p className="text-xs text-gray-400 flex items-center gap-1.5">
          <svg
            className="animate-spin h-3 w-3"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          Guardando…
        </p>
      )}
    </div>
  )
}
