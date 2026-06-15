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
      <h2 className="text-lg font-bold text-gray-900">Editar información</h2>

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

      {/* Email (solo lectura) */}
      <div>
        <label className="block text-sm font-medium text-gray-700">Correo electrónico</label>
        <input
          type="email"
          value={initialData.email}
          disabled
          className="mt-1 block w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-500 cursor-not-allowed"
        />
        <p className="mt-1 text-xs text-gray-400">
          El correo electrónico no se puede cambiar.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Nombre */}
        <div>
          <label htmlFor="nombre" className="block text-sm font-medium text-gray-700">
            Nombre
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
            Apellidos
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
