'use client'

/**
 * CreateActivityForm — formulario cliente para crear actividad marketplace.
 *
 * Campos cubiertos:
 *   - Categoría, profesional, nombre, descripción
 *   - Modalidad (presencial/online/mixta) + campos condicionales (dirección / URL reunión)
 *   - Fechas inicio/fin, horario, aforo
 *   - Precio (texto libre) + nota de pago
 *   - Ficha de impacto (4 campos: objetivo, beneficiarios, ámbito, indicadores)
 *   - Destacada
 *
 * Envía a POST /api/admin/activities. Para superadmin sin municipality_id
 * propio, el form muestra un selector explícito.
 */

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Professional { id: string; nombre: string; tipo: string }
interface Category { id: string; nombre: string }
interface Municipality { id: string; nombre_municipio: string }

interface Access {
  is_superadmin: boolean
  municipality_id: string | null
}

interface CreateActivityFormProps {
  access: Access
  professionals: Professional[]
  categories: Category[]
  municipalities: Municipality[]
}

interface FormData {
  municipality_id: string
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
}

export default function CreateActivityForm(props: CreateActivityFormProps) {
  const router = useRouter()
  const categoriasOrden = useMemo(() => props.categories, [props.categories])
  const profesionalesOrden = useMemo(() => props.professionals, [props.professionals])

  const [data, setData] = useState<FormData>({
    municipality_id: props.access.municipality_id ?? '',
    professional_id: '',
    category_id: categoriasOrden[0]?.id ?? '',
    nombre: '',
    descripcion: '',
    modalidad: 'presencial',
    fecha_inicio: '',
    fecha_fin: '',
    horario_texto: '',
    direccion_texto: '',
    url_reunion: '',
    aforo: '',
    precio_texto: 'Gratuito',
    nota_pago: '',
    impacto_objetivo: '',
    impacto_beneficiarios_estimados: '',
    impacto_ambito: 'Exclusivamente el municipio',
    impacto_indicadores: '',
    destacada: false,
  })

  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  function update<K extends keyof FormData>(k: K, v: FormData[K]) {
    setData((prev) => ({ ...prev, [k]: v }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const payload = {
        professional_id: data.professional_id,
        category_id: data.category_id,
        nombre: data.nombre.trim(),
        descripcion: data.descripcion.trim(),
        modalidad: data.modalidad,
        fecha_inicio: data.fecha_inicio,
        fecha_fin: data.fecha_fin || undefined,
        horario_texto: data.horario_texto || undefined,
        direccion_texto: data.modalidad === 'presencial' || data.modalidad === 'mixta'
          ? (data.direccion_texto || undefined)
          : undefined,
        url_reunion: data.modalidad === 'online' || data.modalidad === 'mixta'
          ? (data.url_reunion || undefined)
          : undefined,
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

      // Para superadmin, body incluye municipality_id
      const body: Record<string, unknown> = payload
      if (props.access.is_superadmin) {
        body.municipality_id = data.municipality_id
      }

      const res = await fetch('/api/admin/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}))
        throw new Error(errBody.error ?? errBody.suggestion ?? 'Error al crear la actividad.')
      }
      const created = await res.json()
      router.push(`/admin/actividades/${created.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado')
    } finally {
      setSubmitting(false)
    }
  }

  if (profesionalesOrden.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="rounded-lg bg-amber-50 border border-amber-200 p-4">
          <p className="text-sm text-amber-800">
            <strong>Necesitas un profesional antes de publicar una actividad.</strong>{' '}
            Crea primero el profesional o entidad que impartirá las actividades.
          </p>
        </div>
        <div className="mt-4 flex justify-end">
          <Link
            href="/admin/professionals/crear"
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 transition-colors"
          >
            Crear profesional
          </Link>
        </div>
      </div>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-xl border border-gray-200 p-6 space-y-6"
    >
      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 p-3">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Selector de municipio para superadmin */}
      {props.access.is_superadmin && (
        <div>
          <label htmlFor="municipality_id" className="block text-sm font-medium text-gray-700">
            Municipio *
          </label>
          <select
            id="municipality_id"
            required
            value={data.municipality_id}
            onChange={(e) => update('municipality_id', e.target.value)}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
          >
            <option value="">— Selecciona municipio —</option>
            {props.municipalities.map((m) => (
              <option key={m.id} value={m.id}>{m.nombre_municipio}</option>
            ))}
          </select>
        </div>
      )}

      {/* Profesional */}
      <div>
        <label htmlFor="professional_id" className="block text-sm font-medium text-gray-700">
          Profesional o entidad *
        </label>
        <select
          id="professional_id"
          required
          value={data.professional_id}
          onChange={(e) => update('professional_id', e.target.value)}
          className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
        >
          <option value="">— Selecciona profesional —</option>
          {profesionalesOrden.map((p) => (
            <option key={p.id} value={p.id}>{p.nombre} · {p.tipo}</option>
          ))}
        </select>
        <p className="mt-1 text-xs text-gray-500">
          ¿No existe? <Link href="/admin/professionals/crear" className="text-indigo-600 hover:text-indigo-500">Crea uno primero</Link>.
        </p>
      </div>

      {/* Categoría + nombre */}
      <div className="grid sm:grid-cols-2 gap-4">
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
            {categoriasOrden.map((c) => (
              <option key={c.id} value={c.id}>{c.nombre}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="nombre" className="block text-sm font-medium text-gray-700">
            Nombre de la actividad *
          </label>
          <input
            id="nombre"
            required
            type="text"
            value={data.nombre}
            onChange={(e) => update('nombre', e.target.value)}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
            placeholder="Ej: Taller de memoria para mayores"
          />
        </div>
      </div>

      {/* Descripción */}
      <div>
        <label htmlFor="descripcion" className="block text-sm font-medium text-gray-700">
          Descripción *
        </label>
        <textarea
          id="descripcion"
          required
          rows={4}
          value={data.descripcion}
          onChange={(e) => update('descripcion', e.target.value)}
          className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none resize-none"
          placeholder="Explica qué incluye la actividad, a quién va dirigida y qué se necesita traer."
        />
      </div>

      {/* Modalidad */}
      <div>
        <label htmlFor="modalidad" className="block text-sm font-medium text-gray-700">
          Modalidad *
        </label>
        <select
          id="modalidad"
          required
          value={data.modalidad}
          onChange={(e) => update('modalidad', e.target.value as FormData['modalidad'])}
          className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
        >
          <option value="presencial">📍 Presencial</option>
          <option value="online">💻 Online</option>
          <option value="mixta">🔀 Mixta (presencial + online)</option>
        </select>

        {(data.modalidad === 'presencial' || data.modalidad === 'mixta') && (
          <div className="mt-3">
            <label htmlFor="direccion_texto" className="block text-sm font-medium text-gray-700">
              Dirección o lugar *
            </label>
            <input
              id="direccion_texto"
              required
              type="text"
              value={data.direccion_texto}
              onChange={(e) => update('direccion_texto', e.target.value)}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
              placeholder="Centro cívico · Calle Mayor 12, salón de actos"
            />
          </div>
        )}

        {(data.modalidad === 'online' || data.modalidad === 'mixta') && (
          <div className="mt-3">
            <label htmlFor="url_reunion" className="block text-sm font-medium text-gray-700">
              URL de la reunión online *
            </label>
            <input
              id="url_reunion"
              required
              type="url"
              value={data.url_reunion}
              onChange={(e) => update('url_reunion', e.target.value)}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
              placeholder="https://meet.google.com/abc-defg-hij"
            />
          </div>
        )}
      </div>

      {/* Fechas + horario + aforo */}
      <div className="grid sm:grid-cols-3 gap-4">
        <div>
          <label htmlFor="fecha_inicio" className="block text-sm font-medium text-gray-700">
            Fecha inicio *
          </label>
          <input
            id="fecha_inicio"
            required
            type="date"
            value={data.fecha_inicio}
            onChange={(e) => update('fecha_inicio', e.target.value)}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
          />
        </div>
        <div>
          <label htmlFor="fecha_fin" className="block text-sm font-medium text-gray-700">
            Fecha fin <span className="text-xs font-normal text-gray-400">(opcional)</span>
          </label>
          <input
            id="fecha_fin"
            type="date"
            value={data.fecha_fin}
            onChange={(e) => update('fecha_fin', e.target.value)}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
          />
        </div>
        <div>
          <label htmlFor="aforo" className="block text-sm font-medium text-gray-700">
            Aforo máximo <span className="text-xs font-normal text-gray-400">(opcional)</span>
          </label>
          <input
            id="aforo"
            type="number"
            min="1"
            value={data.aforo}
            onChange={(e) => update('aforo', e.target.value)}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
            placeholder="Sin límite"
          />
        </div>
      </div>

      <div>
        <label htmlFor="horario_texto" className="block text-sm font-medium text-gray-700">
          Horario
        </label>
        <input
          id="horario_texto"
          type="text"
          value={data.horario_texto}
          onChange={(e) => update('horario_texto', e.target.value)}
          className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
          placeholder="Martes y jueves, 18:00–20:00"
        />
      </div>

      {/* Precio + nota de pago */}
      <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-4 space-y-3">
        <p className="text-sm font-medium text-emerald-800">
          💸 Precio y pago (fuera de TE CUIDA)
        </p>
        <p className="text-xs text-emerald-700">
          El pago NO se gestiona en la plataforma. El profesional cobra aparte; sólo indicamos precio y cómo pagar.
        </p>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="precio_texto" className="block text-sm font-medium text-gray-700">Precio</label>
            <input
              id="precio_texto"
              type="text"
              value={data.precio_texto}
              onChange={(e) => update('precio_texto', e.target.value)}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
              placeholder='Ej: "Gratuito", "15 €", "Aporte voluntario"'
            />
          </div>
          <div>
            <label htmlFor="impacto_beneficiarios_estimados" className="block text-sm font-medium text-gray-700">Beneficiarios estimados</label>
            <input
              id="impacto_beneficiarios_estimados"
              type="number"
              min="1"
              value={data.impacto_beneficiarios_estimados}
              onChange={(e) => update('impacto_beneficiarios_estimados', e.target.value)}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
              placeholder="120"
            />
          </div>
        </div>
        <div>
          <label htmlFor="nota_pago" className="block text-sm font-medium text-gray-700">
            Instrucciones de pago al profesional
          </label>
          <textarea
            id="nota_pago"
            rows={2}
            value={data.nota_pago}
            onChange={(e) => update('nota_pago', e.target.value)}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none resize-none"
            placeholder="Bizum al 6XX XXX XXX o transferencia a ES00 0000 0000 0000 0000 0000"
          />
        </div>
      </div>

      {/* Ficha de impacto */}
      <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 space-y-3">
        <p className="text-sm font-medium text-amber-900">
          🌱 Ficha de impacto (diferenciador TE CUIDA)
        </p>
        <p className="text-xs text-amber-800">
          Lo que la ciudadanía aporta NO es sólo dinero; es un cambio concreto para el municipio.
        </p>
        <div>
          <label htmlFor="impacto_objetivo" className="block text-sm font-medium text-gray-700">
            Objetivo social
          </label>
          <input
            id="impacto_objetivo"
            type="text"
            value={data.impacto_objetivo}
            onChange={(e) => update('impacto_objetivo', e.target.value)}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
            placeholder="Ej: Reducir el aislamiento de las personas mayores"
          />
        </div>
        <div>
          <label htmlFor="impacto_ambito" className="block text-sm font-medium text-gray-700">Ámbito</label>
          <input
            id="impacto_ambito"
            type="text"
            value={data.impacto_ambito}
            onChange={(e) => update('impacto_ambito', e.target.value)}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
            placeholder="Exclusivamente el municipio"
          />
        </div>
        <div>
          <label htmlFor="impacto_indicadores" className="block text-sm font-medium text-gray-700">
            Indicadores de éxito
          </label>
          <input
            id="impacto_indicadores"
            type="text"
            value={data.impacto_indicadores}
            onChange={(e) => update('impacto_indicadores', e.target.value)}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
            placeholder="Nº talleres realizados, personas atendidas, satisfacción"
          />
        </div>
      </div>

      {/* Destacada */}
      <label className="flex items-center gap-3 rounded-lg bg-gray-50 border border-gray-200 px-4 py-3 cursor-pointer">
        <input
          id="destacada"
          type="checkbox"
          checked={data.destacada}
          onChange={(e) => update('destacada', e.target.checked)}
          className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
        />
        <span className="text-sm font-medium text-gray-700">
          ⭐ Destacar esta actividad en el listado del municipio
        </span>
      </label>

      {/* Submit */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
        <Link
          href="/admin/actividades"
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Cancelar
        </Link>
        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {submitting ? 'Creando...' : 'Crear actividad'}
        </button>
      </div>
    </form>
  )
}
