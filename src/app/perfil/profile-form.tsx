'use client'

/**
 * ProfileForm — Formulario de edición de perfil
 *
 * Client Component que permite al ciudadano actualizar sus
 * datos personales (nombre, apellidos, teléfono, fecha nacimiento).
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface ProfileData {
  alias: string
  nombre: string
  apellidos: string
  email: string
  genero: string
  anio_nacimiento: string
  telefono: string
  fecha_nacimiento: string
  created_at: string
}

interface ProfileFormProps {
  userId: string
  initialData: ProfileData
}

export default function ProfileForm({ userId, initialData }: ProfileFormProps) {
  const router = useRouter()
  const [formData, setFormData] = useState({
    alias: initialData.alias || initialData.nombre || '',
    genero: initialData.genero || '',
    anio_nacimiento: initialData.anio_nacimiento || '',
  })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'ok' | 'error'; text: string } | null>(null)

  function updateField(field: keyof typeof formData, value: string) {
    setFormData((prev) => ({ ...prev, [field]: value }))
    setMessage(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    try {
      const supabase = createClient()

      const { error } = await supabase
        .from('users')
        .update({
          alias: formData.alias.trim() || null,
          genero: formData.genero || null,
          anio_nacimiento: formData.anio_nacimiento ? parseInt(formData.anio_nacimiento, 10) : null,
        })
        .eq('id', userId)

      if (error) throw new Error(error.message)

      setMessage({ type: 'ok', text: 'Perfil actualizado correctamente.' })
      router.refresh()
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Error al guardar los cambios.',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
      <h2 className="text-lg font-bold text-gray-900">Información de tu cuenta</h2>
      <p className="text-xs text-gray-400 -mt-4">
        Tus datos de acceso. El alias es un pseudónimo opcional — no uses tu nombre real si prefieres mantener el anonimato.
      </p>

      {/* Email (solo lectura) */}
      <div className="text-sm">
        <span className="text-gray-400">Tu correo: </span>
        <span className="text-gray-700 font-medium">{initialData.email}</span>
      </div>

      {message && (
        <div
          className={`rounded-md p-3 ${
            message.type === 'ok'
              ? 'bg-emerald-50 border border-emerald-200'
              : 'bg-red-50 border border-red-200'
          }`}
        >
          <p className={`text-sm ${message.type === 'ok' ? 'text-emerald-700' : 'text-red-700'}`}>
            {message.text}
          </p>
        </div>
      )}

      <div>
        <label htmlFor="alias" className="block text-sm font-medium text-gray-700">
          Alias{' '}
          <span className="text-gray-400 font-normal">(opcional)</span>
        </label>
        <input
          id="alias"
          type="text"
          value={formData.alias}
          onChange={(e) => updateField('alias', e.target.value)}
          className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
          placeholder="¿Cómo quieres que te llamemos?"
          maxLength={60}
        />
        <p className="mt-1 text-xs text-gray-400">
          Así aparecerás en el dashboard. Puedes cambiarlo cuando quieras.
        </p>
      </div>

      {/* ── Datos estadísticos anónimos ── */}
      <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 space-y-3">
        <p className="text-sm font-medium text-amber-800">
          📊 Datos estadísticos anónimos
        </p>
        <p className="text-xs text-amber-600 -mt-1">
          Nos ayudan a medir el impacto de los programas. Son opcionales y nunca se muestran de forma individual.
        </p>

        {/* Género */}
        <div>
          <label htmlFor="genero" className="block text-sm font-medium text-gray-700">
            Género{' '}
            <span className="text-gray-400 font-normal">(opcional)</span>
          </label>
          <select
            id="genero"
            value={formData.genero}
            onChange={(e) => updateField('genero', e.target.value)}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
          >
            <option value="">Prefiero no responder</option>
            <option value="hombre">Hombre</option>
            <option value="mujer">Mujer</option>
            <option value="no_binario">No binario</option>
          </select>
        </div>

        {/* Año de nacimiento */}
        <div>
          <label htmlFor="anio_nacimiento" className="block text-sm font-medium text-gray-700">
            Año de nacimiento{' '}
            <span className="text-gray-400 font-normal">(opcional)</span>
          </label>
          <select
            id="anio_nacimiento"
            value={formData.anio_nacimiento}
            onChange={(e) => updateField('anio_nacimiento', e.target.value)}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
          >
            <option value="">Prefiero no responder</option>
            {Array.from({ length: 83 }, (_, i) => new Date().getFullYear() - 17 - i).map((year) => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
          <p className="mt-1 text-xs text-gray-400">
            Solo guardamos el año. Lo usamos para estadísticas anónimas de impacto.
          </p>
        </div>
      </div>

      {/* Datos opcionales — colapsados por defecto */}
      <details className="group">
        <summary className="cursor-pointer text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors list-none flex items-center gap-1.5">
          <svg className="w-4 h-4 transition-transform group-open:rotate-90" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
          </svg>
          Datos adicionales (solo lectura — registro legacy)
        </summary>
        <div className="mt-4 space-y-4">
          {/* Nombre (solo lectura) */}
          {initialData.nombre && (
            <div>
              <label className="block text-sm font-medium text-gray-500">Nombre</label>
              <p className="mt-1 text-sm text-gray-700">{initialData.nombre}</p>
            </div>
          )}
          {/* Apellidos (solo lectura) */}
          {initialData.apellidos && (
            <div>
              <label className="block text-sm font-medium text-gray-500">Apellidos</label>
              <p className="mt-1 text-sm text-gray-700">{initialData.apellidos}</p>
            </div>
          )}
          {/* Teléfono (solo lectura) */}
          {initialData.telefono && (
            <div>
              <label className="block text-sm font-medium text-gray-500">Teléfono</label>
              <p className="mt-1 text-sm text-gray-700">{initialData.telefono}</p>
            </div>
          )}
          {/* Fecha nacimiento (solo lectura) */}
          {initialData.fecha_nacimiento && (
            <div>
              <label className="block text-sm font-medium text-gray-500">Fecha de nacimiento</label>
              <p className="mt-1 text-sm text-gray-700">{initialData.fecha_nacimiento}</p>
            </div>
          )}
        </div>
      </details>

      {/* Botón de guardar */}
      <div className="flex items-center justify-end pt-4 border-t border-gray-100">
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </div>
    </form>
  )
}
