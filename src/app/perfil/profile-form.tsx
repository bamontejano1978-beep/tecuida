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
  nombre: string
  apellidos: string
  email: string
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
    nombre: initialData.nombre,
    apellidos: initialData.apellidos,
    telefono: initialData.telefono,
    fecha_nacimiento: initialData.fecha_nacimiento,
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
          nombre: formData.nombre.trim(),
          apellidos: formData.apellidos.trim(),
          telefono: formData.telefono.trim() || null,
          fecha_nacimiento: formData.fecha_nacimiento || null,
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
        Tus datos personales. Los campos marcados con * son obligatorios.
      </p>

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

      {/* Email (solo lectura) — dato principal */}
      <div className="rounded-lg bg-indigo-50 border border-indigo-100 p-4">
        <div className="flex items-center gap-3">
          <svg className="w-5 h-5 text-indigo-400 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
          </svg>
          <div>
            <p className="text-xs font-medium text-indigo-600 uppercase tracking-wide">
              Correo electrónico
            </p>
            <p className="text-sm font-semibold text-gray-900">{initialData.email}</p>
          </div>
        </div>
        <p className="mt-2 text-xs text-gray-400">
          El correo electrónico no se puede cambiar. Es tu identificador en la plataforma.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Nombre */}
        <div>
          <label htmlFor="nombre" className="block text-sm font-medium text-gray-700">
            Nombre *
          </label>
          <input
            id="nombre"
            type="text"
            value={formData.nombre}
            onChange={(e) => updateField('nombre', e.target.value)}
            required
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
          />
        </div>

        {/* Apellidos */}
        <div>
          <label htmlFor="apellidos" className="block text-sm font-medium text-gray-700">
            Apellidos *
          </label>
          <input
            id="apellidos"
            type="text"
            value={formData.apellidos}
            onChange={(e) => updateField('apellidos', e.target.value)}
            required
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
          />
        </div>
      </div>

      {/* Datos opcionales — colapsados por defecto */}
      <details className="group">
        <summary className="cursor-pointer text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors list-none flex items-center gap-1.5">
          <svg className="w-4 h-4 transition-transform group-open:rotate-90" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
          </svg>
          Datos adicionales (opcionales)
        </summary>
        <div className="mt-4 space-y-4">
          {/* Teléfono */}
          <div>
            <label htmlFor="telefono" className="block text-sm font-medium text-gray-700">
              Teléfono
            </label>
            <input
              id="telefono"
              type="tel"
              value={formData.telefono}
              onChange={(e) => updateField('telefono', e.target.value)}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
              placeholder="+34 600 000 000"
            />
          </div>

          {/* Fecha de nacimiento */}
          <div>
            <label htmlFor="fecha_nacimiento" className="block text-sm font-medium text-gray-700">
              Fecha de nacimiento
            </label>
            <input
              id="fecha_nacimiento"
              type="date"
              value={formData.fecha_nacimiento}
              onChange={(e) => updateField('fecha_nacimiento', e.target.value)}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
            />
          </div>
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
