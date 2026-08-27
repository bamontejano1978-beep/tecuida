/**
 * Admin — Listado de actividades marketplace (Fase 1).
 *
 * Server Component que:
 *   1. Verifica que el usuario es superadmin
 *   2. Lee las actividades de todos los municipios
 *   3. Renderiza tabla con filtros por estado / búsqueda / categoría
 */

import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/server'
import { getAdminAccess } from '@/lib/admin/activities'
import { redirect } from 'next/navigation'

interface ActRow {
  id: string
  nombre: string
  estado: string
  modalidad: string
  fecha_inicio: string
  plazas_inscritas: number
  aforo: number | null
  destacada: boolean
  professional: { nombre: string; tipo: string } | null
  categoria: { nombre: string } | null
}

interface CatRow {
  id: string
  nombre: string
}

interface SearchParams {
  estado?: string
  categoria_id?: string
  q?: string
}

const estadoBadge: Record<string, string> = {
  pendiente_validacion:
    'bg-amber-50 border-amber-200 text-amber-700',
  publicada: 'bg-emerald-50 border-emerald-200 text-emerald-700',
  rechazada: 'bg-red-50 border-red-200 text-red-700',
  cancelada: 'bg-gray-50 border-gray-200 text-gray-600',
  finalizada: 'bg-violet-50 border-violet-200 text-violet-700',
  borrador: 'bg-slate-50 border-slate-200 text-slate-700',
}

const estadoLabel: Record<string, string> = {
  pendiente_validacion: 'Pendiente',
  publicada: 'Publicada',
  rechazada: 'Rechazada',
  cancelada: 'Cancelada',
  finalizada: 'Finalizada',
  borrador: 'Borrador',
}

const modalidadIcon: Record<string, string> = {
  presencial: '📍',
  online: '💻',
  mixta: '🔀',
}

export default async function AdminActivitiesPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const access = await getAdminAccess({ superadminOnly: true })
  if (!access) redirect('/login?error=unauthorized')

  const supabase = createAdminClient()
  let query = supabase
    .from('activities')
    .select(
      `id, nombre, estado, modalidad, fecha_inicio, plazas_inscritas, aforo,
       destacada, professional:professionals(nombre, tipo),
       categoria:categories(nombre)`,
    )
    .order('fecha_inicio', { ascending: false })

  if (!access.is_superadmin && access.municipality_id) {
    query = query.eq('municipality_id', access.municipality_id)
  }

  if (searchParams.estado) {
    query = query.eq('estado', searchParams.estado)
  }
  if (searchParams.categoria_id) {
    query = query.eq('category_id', searchParams.categoria_id)
  }
  if (searchParams.q) {
    query = query.ilike('nombre', `%${searchParams.q}%`)
  }

  const { data, error } = await query
  const { data: cats } = await supabase
    .from('categories')
    .select('id, nombre')
    .order('orden', { ascending: true })

  const activities: ActRow[] = (data || []) as unknown as ActRow[]
  const catsList: CatRow[] = (cats || []) as unknown as CatRow[]

  // Métricas rápidas
  const total = activities.length
  const pendientes = activities.filter((a) => a.estado === 'pendiente_validacion').length
  const publicadas = activities.filter((a) => a.estado === 'publicada').length
  const plazas = activities.reduce((sum, a) => sum + (a.plazas_inscritas || 0), 0)

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Actividades</h1>
          <p className="mt-1 text-sm text-gray-500">
            Marketplace de actividades profesionales de tu municipio. Publica talleres, eventos y cursos.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/admin/professionals"
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 transition-colors"
          >
            Profesionales
          </Link>
          <Link
            href="/admin/actividades/crear"
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Nueva actividad
          </Link>
        </div>
      </div>

      {/* Métricas rápidas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs font-medium text-gray-500 uppercase">Total</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{total}</p>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-xs font-medium text-amber-700 uppercase">Por validar</p>
          <p className="mt-1 text-2xl font-bold text-amber-700">{pendientes}</p>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-xs font-medium text-emerald-700 uppercase">Publicadas</p>
          <p className="mt-1 text-2xl font-bold text-emerald-700">{publicadas}</p>
        </div>
        <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4">
          <p className="text-xs font-medium text-indigo-700 uppercase">Inscritos</p>
          <p className="mt-1 text-2xl font-bold text-indigo-700">{plazas}</p>
        </div>
      </div>

      {/* Filtros */}
      <form method="GET" className="mb-6 flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          name="q"
          defaultValue={searchParams.q ?? ''}
          placeholder="Buscar actividad…"
          className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
        />
        <select
          name="estado"
          defaultValue={searchParams.estado ?? ''}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
        >
          <option value="">Todos los estados</option>
          <option value="pendiente_validacion">Pendientes</option>
          <option value="publicada">Publicadas</option>
          <option value="rechazada">Rechazadas</option>
          <option value="cancelada">Canceladas</option>
          <option value="finalizada">Finalizadas</option>
        </select>
        <select
          name="categoria_id"
          defaultValue={searchParams.categoria_id ?? ''}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
        >
          <option value="">Todas las categorías</option>
          {catsList.map((c) => (
            <option key={c.id} value={c.id}>{c.nombre}</option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Filtrar
        </button>
      </form>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4 mb-6">
          <p className="text-sm text-red-700">Error al cargar las actividades.</p>
        </div>
      )}

      {/* Tabla */}
      {activities.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <p className="text-sm text-gray-500 mb-2">
            {searchParams.estado
              ? 'No hay actividades con el filtro seleccionado.'
              : 'Aún no hay actividades. Crea la primera con "Nueva actividad".'}
          </p>
          <Link
            href="/admin/actividades/crear"
            className="mt-3 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 transition-colors"
          >
            Crear la primera
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Actividad</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Quién</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Categoría</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Modalidad</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Fecha</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Plazas</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Estado</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {activities.map((a) => (
                  <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-gray-900 truncate max-w-xs">
                          {a.nombre}
                        </p>
                        {a.destacada && (
                          <span aria-label="Destacada" title="Destacada" className="text-amber-500">⭐</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700 whitespace-nowrap">
                      {a.professional?.nombre ?? <span className="text-gray-400 italic">Sin profesional</span>}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700 whitespace-nowrap">
                      {a.categoria?.nombre ?? '—'}
                    </td>
                    <td className="px-6 py-4 text-sm whitespace-nowrap">
                      {modalidadIcon[a.modalidad] ?? '·'} {a.modalidad}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700 whitespace-nowrap">
                      {a.fecha_inicio}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700 whitespace-nowrap">
                      {a.plazas_inscritas}
                      {a.aforo !== null ? ` / ${a.aforo}` : ''}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${estadoBadge[a.estado] ?? 'bg-gray-50 border-gray-200 text-gray-600'}`}>
                        {estadoLabel[a.estado] ?? a.estado}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <Link
                        href={`/admin/actividades/${a.id}`}
                        className="text-sm font-medium text-indigo-600 hover:text-indigo-500 transition-colors"
                      >
                        Gestionar →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
