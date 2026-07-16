'use client'

/**
 * EditActivityForm — formulario para editar actividad marketplace.
 *
 * Permite:
 *   - Editar todos los campos de la actividad
 *   - Cambiar estado directamente (publicar si está pendiente, cancelar si publicado)
 *   - Borrar (solo si estado no es 'publicada')
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Activity {
  id: string
  professional_id: string
  category_id: string
  nombre: string
  descripcion: string
  thumbnail_url: string | null
  modalidad: string
  fecha_inicio: string
  fecha_fin: string | null
  horario_texto: string | null
  direccion_texto: string | null
  url_reunion: string | null
  aforo: number | null
  plazas_inscritas: number
  precio_texto: string | null
  nota_pago: string | null
  impacto_objetivo: string | null
  impacto_beneficiarios_estimados: number | null
  impacto_ambito: string | null
  impacto_indicadores: string | null
  estado: string
  destacada: boolean
  motivo_rechazo: string | null
  motivo_cancelacion: string | null
}

interface FormData {
  professional_id: string
  category_id: string
  nombre: string
  descripcion: string
  modalidad: 'presencial' | 'online' | 'mixta'
  fecha_inicio: string
  fecha_fin: string
  horario_texto: string
  direccion_texto: string
  url_reunion: string
  aforo: string
  precio_texto: string
  nota_pago: string
  impacto_objetivo: string
  impacto_beneficiarios_estimados: string
  impacto_ambito: string
  impacto_indicadores: string
  destacada: boolean
  motivo_rechazo: string
  motivo_cancelacion: string
}

export default function EditActivityForm({
  activity,
  professionals,
  categories,
}: {
  activity: Activity
  professionals: Array<{ id: string; nombre: string; tipo: string }>
  categories: Array<{ id: string; nombre: string }>
}) {
  const router = useRouter()
  const [data, setData] = useState<FormData>({
    professional_id: activity.professional_id,
    category_id: activity.category_id,
    nombre: activity.nombre,
    descripcion: activity.descripcion,
    modalidad: activity.modalidad as FormData['modalidad'],
    fecha_inicio: activity.fecha_inicio,
    fecha_fin: activity.fecha_fin ?? '',
    horario_texto: activity.horario_texto ?? '',
    direccion_texto: activity.direccion_texto ?? '',
    url_reunion: activity.url_reunion ?? '',
    aforo: activity.aforo !== null ? String(activity.aforo) : '',
    precio_texto: activity.precio_texto ?? '',
    nota_pago: activity.nota_pago ?? '',
    impacto_objetivo: activity.impacto_objetivo ?? '',
    impacto_beneficiarios_estimados:
      activity.impacto_beneficiarios_estimados !== null
        ? String(activity.impacto_beneficiarios_estimados)
        : '',
    impacto_ambito: activity.impacto_ambito ?? '',
    impacto_indicadores: activity.impacto_indicadores ?? '',
    destacada: activity.destacada,
    motivo_rechazo: '',
    motivo_cancelacion: '',
  })

  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  function update<K extends keyof FormData>(k: K, v: FormData[K]) {
    setData((prev) => ({ ...prev, [k]: v }))
  }

  async function handleSave(opts?: { estado?: string; motivo?: string }) {
    setError(null)
    setNotice(null)
    setSubmitting(true)
    try {
      const payload: Record<string, unknown> = {
        professional_id: data.professional_id,
        category_id: data.category_id,
        nombre: data.nombre.trim(),
        descripcion: data.descripcion.trim(),
        modalidad: data.modalidad,
        fecha_inicio: data.fecha_inicio,
        fecha_fin: data.fecha_fin || undefined,
        horario_texto: data.horario_texto || undefined,
        direccion_texto: data.direccion_texto || undefined,
        url_reunion: data.url_reunion || undefined,
        aforo: data.aforo ? Number(data.aforo) : undefined,
        precio_texto: data.precio_texto || undefined,
        nota_pago: data.nota_pago || undefined,
        impacto_objetivo: data.impacto_objetivo || undefined,
        impacto_beneficiarios_estimados: data.impacto_beneficiarios_estimados
          ? Number(data.impacto_beneficiarios_estimados)
          : undefined,
        impacto_ambito: data.impacto_ambito || undefined,
        impacto_indicadores: data.impacto_indicadores || undefined,
        destacada: data.destacada,
      }

      if (opts?.estado) payload.estado = opts.estado
      if (opts?.estado === 'rechazada') payload.motivo_rechazo = opts.motivo
      if (opts?.estado === 'cancelada') payload.motivo_cancelacion = opts.motivo

      const res = await fetch(`/api/admin/activities/${activity.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}))
        throw new Error(errBody.error ?? errBody.suggestion ?? 'Error al guardar')
      }

      setNotice(opts?.estado ? `Estado cambiado a "${opts.estado}".` : 'Cambios guardados.')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    handleSave()
  }

  async function handleReject() {
    if (!data.motivo_rechazo.trim()) {
      setError('Indica el motivo de rechazo.')
      return
    }
    handleSave({ estado: 'rechazada', motivo: data.motivo_rechazo })
  }

  async function handleCancel() {
    if (!data.motivo_cancelacion.trim()) {
      setError('Indica el motivo de cancelación.')
      return
    }
    handleSave({ estado: 'cancelada', motivo: data.motivo_cancelacion })
  }

  async function handleDelete() {
    if (!confirm('¿Eliminar definitivamente esta actividad? Solo es posible si no está publicada.')) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/admin/activities/${activity.id}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}))
        throw new Error(errBody.error ?? 'No se pudo eliminar')
      }
      router.push('/admin/actividades')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error')
      setSubmitting(false)
    }
  }

  const canEdit = !['finalizada', 'cancelada'].includes(activity.estado)
  const canDelete = ['borrador', 'rechazada', 'cancelada'].includes(activity.estado)

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Banner informativo de estado */}
      {activity.estado === 'publicada' && (
        <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3">
          <p className="text-sm text-emerald-800">
            ✅ <strong>Publicada.</strong> Visible para los ciudadanos del municipio.
            Hay <strong>{activity.plazas_inscritas}</strong> inscripciones
            {activity.aforo !== null ? ` de ${activity.aforo} plazas` : ''}.
          </p>
        </div>
      )}

      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 p-3">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}
      {notice && (
        <div className="rounded-md bg-emerald-50 border border-emerald-200 p-3">
          <p className="text-sm text-emerald-700">{notice}</p>
        </div>
      )}

      {/* Banderas de moderación */}
      {activity.estado === 'pendiente_validacion' && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 p-4">
          <p className="text-sm font-medium text-amber-800">⚠️ Pendiente de validación</p>
          <p className="mt-1 text-xs text-amber-700">
            Si los datos del profesional y del taller son correctos, ya está &ldquo;publicada&rdquo; automáticamente al crearse desde /admin. Si necesitas revertir o rechazar:
          </p>
          <div className="mt-3">
            <label htmlFor="motivo_rechazo" className="block text-xs font-medium text-amber-900">
              Motivo de rechazo
            </label>
            <textarea
              id="motivo_rechazo"
              rows={2}
              value={data.motivo_rechazo}
              onChange={(e) => update('motivo_rechazo', e.target.value)}
              className="mt-1 block w-full rounded-lg border border-amber-300 px-3 py-2 text-sm shadow-sm focus:border-red-500 focus:ring-2 focus:ring-red-200 outline-none"
              placeholder="Ej: No aprobado por falta de número de colegiado válido"
            />
            <button
              type="button"
              onClick={handleReject}
              disabled={submitting}
              className="mt-2 inline-flex items-center gap-2 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-red-500 disabled:opacity-50 transition-colors"
            >
              Rechazar
            </button>
          </div>
        </div>
      )}

      {activity.estado === 'publicada' && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 p-4">
          <p className="text-sm font-medium text-amber-900">¿Necesitas cancelar?</p>
          <label htmlFor="motivo_cancelacion" className="block mt-2 text-xs font-medium text-amber-900">
            Motivo de cancelación
          </label>
          <textarea
            id="motivo_cancelacion"
            rows={2}
            value={data.motivo_cancelacion}
            onChange={(e) => update('motivo_cancelacion', e.target.value)}
            className="mt-1 block w-full rounded-lg border border-amber-300 px-3 py-2 text-sm shadow-sm focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none"
            placeholder="Explica por qué se cancela (se mostrará al ciudadano)"
          />
          <button
            type="button"
            onClick={handleCancel}
            disabled={submitting}
            className="mt-2 inline-flex items-center gap-2 rounded-lg bg-amber-700 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-amber-600 disabled:opacity-50 transition-colors"
          >
            Cancelar actividad
          </button>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
        <fieldset disabled={!canEdit} className={!canEdit ? 'opacity-60' : ''}>
          {/* Profesional + categoría */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="professional_id" className="block text-sm font-medium text-gray-700">
                Profesional *
              </label>
              <select
                id="professional_id"
                required
                value={data.professional_id}
                onChange={(e) => update('professional_id', e.target.value)}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
              >
                {professionals.map((p) => (
                  <option key={p.id} value={p.id}>{p.nombre} · {p.tipo}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="category_id" className="block text-sm font-medium text-gray-700">
                Categoría *
              </label>
              <select
                id="category_id"
                required
                value={data.category_id}
                onChange={(e) => update('category_id', e.target.value)}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Nombre + descripción */}
          <div>
            <label htmlFor="nombre" className="block text-sm font-medium text-gray-700">Nombre *</label>
            <input
              id="nombre" required value={data.nombre}
              onChange={(e) => update('nombre', e.target.value)}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
            />
          </div>
          <div>
            <label htmlFor="descripcion" className="block text-sm font-medium text-gray-700">Descripción *</label>
            <textarea
              id="descripcion" required rows={4} value={data.descripcion}
              onChange={(e) => update('descripcion', e.target.value)}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none resize-none"
            />
          </div>

          {/* Modalidad */}
          <div>
            <label htmlFor="modalidad-edit" className="block text-sm font-medium text-gray-700">Modalidad</label>
            <select
              id="modalidad-edit"
              value={data.modalidad}
              onChange={(e) => update('modalidad', e.target.value as FormData['modalidad'])}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
            >
              <option value="presencial">Presencial</option>
              <option value="online">Online</option>
              <option value="mixta">Mixta</option>
            </select>

            {(data.modalidad === 'presencial' || data.modalidad === 'mixta') && (
              <div className="mt-3">
                <label htmlFor="direccion_texto-edit" className="block text-sm font-medium text-gray-700">Dirección</label>
                <input
                  id="direccion_texto-edit"
                  type="text"
                  value={data.direccion_texto}
                  onChange={(e) => update('direccion_texto', e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
                />
              </div>
            )}
            {(data.modalidad === 'online' || data.modalidad === 'mixta') && (
              <div className="mt-3">
                <label htmlFor="url_reunion-edit" className="block text-sm font-medium text-gray-700">URL de reunión</label>
                <input
                  id="url_reunion-edit"
                  type="url"
                  value={data.url_reunion}
                  onChange={(e) => update('url_reunion', e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
                />
              </div>
            )}
          </div>

          {/* Fechas + horario + aforo */}
          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="fecha_inicio-edit" className="block text-sm font-medium text-gray-700">Fecha inicio *</label>
              <input
                id="fecha_inicio-edit"
                type="date"
                required
                value={data.fecha_inicio}
                onChange={(e) => update('fecha_inicio', e.target.value)}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
              />
            </div>
            <div>
              <label htmlFor="fecha_fin-edit" className="block text-sm font-medium text-gray-700">Fecha fin</label>
              <input
                id="fecha_fin-edit"
                type="date"
                value={data.fecha_fin}
                onChange={(e) => update('fecha_fin', e.target.value)}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
              />
            </div>
            <div>
              <label htmlFor="horario_texto-edit" className="block text-sm font-medium text-gray-700">Horario</label>
              <input
                id="horario_texto-edit"
                type="text"
                value={data.horario_texto}
                onChange={(e) => update('horario_texto', e.target.value)}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
              />
            </div>
          </div>

          <div>
            <label htmlFor="aforo" className="block text-sm font-medium text-gray-700">Aforo</label>
            <input
              id="aforo" type="number" min="1"
              value={data.aforo}
              onChange={(e) => update('aforo', e.target.value)}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
            />
            {activity.aforo !== null && (
              <p className="mt-1 text-xs text-gray-500">
                Inscritas actualmente: {activity.plazas_inscritas} / {activity.aforo}
              </p>
            )}
          </div>

          {/* Precio + nota */}
          <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-4 space-y-3">
            <label htmlFor="precio_texto-edit" className="block text-sm font-medium text-emerald-900">Precio (texto libre)</label>
            <input
              id="precio_texto-edit"
              type="text"
              value={data.precio_texto}
              onChange={(e) => update('precio_texto', e.target.value)}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
            />
            <label htmlFor="nota_pago-edit" className="block text-sm font-medium text-emerald-900">Instrucciones de pago al profesional</label>
            <textarea
              id="nota_pago-edit"
              rows={2}
              value={data.nota_pago}
              onChange={(e) => update('nota_pago', e.target.value)}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none resize-none"
            />
          </div>

          {/* Impacto */}
          <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 space-y-3">
            <label htmlFor="impacto_objetivo-edit" className="block text-sm font-medium text-amber-900">Objetivo social</label>
            <input
              id="impacto_objetivo-edit"
              type="text"
              value={data.impacto_objetivo}
              onChange={(e) => update('impacto_objetivo', e.target.value)}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
            />
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="impacto_beneficiarios-edit" className="block text-sm font-medium text-amber-900">Beneficiarios estimados</label>
                <input
                  id="impacto_beneficiarios-edit"
                  type="number" min="1"
                  value={data.impacto_beneficiarios_estimados}
                  onChange={(e) => update('impacto_beneficiarios_estimados', e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
                />
              </div>
              <div>
                <label htmlFor="impacto_ambito-edit" className="block text-sm font-medium text-amber-900">Ámbito</label>
                <input
                  id="impacto_ambito-edit"
                  type="text"
                  value={data.impacto_ambito}
                  onChange={(e) => update('impacto_ambito', e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
                />
              </div>
            </div>
            <label htmlFor="impacto_indicadores-edit" className="block text-sm font-medium text-amber-900">Indicadores de éxito</label>
            <input
              id="impacto_indicadores-edit"
              type="text"
              value={data.impacto_indicadores}
              onChange={(e) => update('impacto_indicadores', e.target.value)}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
            />
          </div>

          <label className="flex items-center gap-3 rounded-lg bg-gray-50 border border-gray-200 px-4 py-3 cursor-pointer">
            <input
              type="checkbox"
              checked={data.destacada}
              onChange={(e) => update('destacada', e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="text-sm font-medium text-gray-700">⭐ Destacar actividad en el listado del municipio</span>
          </label>
        </fieldset>
      </div>

      <div className="flex items-center justify-between gap-3 pt-4 border-t border-gray-100">
        <div className="flex gap-2">
          {canDelete && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={submitting}
              className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50 transition-colors"
            >
              Eliminar
            </button>
          )}
        </div>
        <div className="flex gap-3">
          <Link
            href="/admin/actividades"
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Volver
          </Link>
          <button
            type="submit"
            disabled={!canEdit || submitting}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </form>
  )
}
