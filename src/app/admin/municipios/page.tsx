/**
 * Admin — Lista de municipios
 *
 * Muestra tabla paginada con todos los municipios registrados.
 * Permite buscar, filtrar por estado y acceder a la edición.
 *
 * Requisitos: 10.1, 10.2
 */

import { createAdminClient } from '@/lib/supabase/server'
import Link from 'next/link'

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

interface MunicipalityRow {
  id: string
  slug: string
  nombre_municipio: string
  nombre_ayuntamiento: string
  dominio: string
  tipo_suscripcion: string
  estado_suscripcion: string
  created_at: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const statusBadgeClasses: Record<string, string> = {
  activa: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  suspendida: 'bg-red-50 text-red-700 border-red-200',
  cancelada: 'bg-gray-50 text-gray-600 border-gray-200',
  prueba: 'bg-amber-50 text-amber-700 border-amber-200',
}

const statusLabels: Record<string, string> = {
  activa: 'Activa',
  suspendida: 'Suspendida',
  cancelada: 'Cancelada',
  prueba: 'Prueba',
}

const tierLabels: Record<string, string> = {
  basico: 'Básico',
  estandar: 'Estándar',
  premium: 'Premium',
}

// ---------------------------------------------------------------------------
// Página
// ---------------------------------------------------------------------------

interface MunicipiosPageProps {
  searchParams: Record<string, string | string[] | undefined>
}

export default async function MunicipiosPage({ searchParams }: MunicipiosPageProps) {
  const page = Math.max(1, parseInt(
    typeof searchParams['page'] === 'string' ? searchParams['page'] : '1',
    10,
  ))
  const limit = 20
  const offset = (page - 1) * limit
  const search = typeof searchParams['q'] === 'string' ? searchParams['q'] : ''
  const filter = typeof searchParams['estado'] === 'string' ? searchParams['estado'] : ''

  const supabase = createAdminClient()

  let query = supabase
    .from('municipalities')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (filter) {
    query = query.eq('estado_suscripcion', filter)
  }

  if (search) {
    query = query.or(
      `nombre_municipio.ilike.%${search}%,slug.ilike.%${search}%,nombre_ayuntamiento.ilike.%${search}%`,
    )
  }

  const { data, error, count } = await query

  if (error) {
    console.error('[Admin Municipios]', error.message)
    return (
      <div className="px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold text-gray-900">Municipios</h1>
        <div className="mt-4 rounded-lg bg-red-50 border border-red-200 p-4">
          <p className="text-sm text-red-700">Error al cargar los municipios.</p>
        </div>
      </div>
    )
  }

  const municipalities: MunicipalityRow[] = (data || []) as unknown as MunicipalityRow[]
  const totalPages = Math.ceil((count || 0) / limit)

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Municipios</h1>
          <p className="mt-1 text-sm text-gray-500">
            {count || 0} municipio{(count || 0) !== 1 ? 's' : ''} registrado{(count || 0) !== 1 ? 's' : ''}
          </p>
        </div>
        <Link
          href="/admin/municipios/crear"
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Nuevo municipio
        </Link>
      </div>

      {/* Filtros */}
      <div className="mb-6 flex flex-col sm:flex-row gap-3">
        <form className="flex-1 flex gap-3" method="GET" action="/admin/municipios">
          <input
            type="text"
            name="q"
            defaultValue={search}
            placeholder="Buscar por nombre, slug o ayuntamiento..."
            className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
          />
          <select
            name="estado"
            defaultValue={filter}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
          >
            <option value="">Todos los estados</option>
            <option value="activa">Activa</option>
            <option value="prueba">Prueba</option>
            <option value="suspendida">Suspendida</option>
            <option value="cancelada">Cancelada</option>
          </select>
          <button
            type="submit"
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Filtrar
          </button>
        </form>
      </div>

      {/* Tabla */}
      {municipalities.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <svg className="mx-auto h-12 w-12 text-gray-300" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <h3 className="mt-4 text-sm font-semibold text-gray-900">Sin resultados</h3>
          <p className="mt-1 text-sm text-gray-500">
            {search || filter
              ? 'No se encontraron municipios con los filtros actuales.'
              : 'No hay municipios registrados aún.'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Municipio
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Slug / Dominio
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Suscripción
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {municipalities.map((mun) => (
                  <tr key={mun.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {mun.nombre_municipio}
                        </p>
                        <p className="text-xs text-gray-500">{mun.nombre_ayuntamiento}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <code className="text-sm bg-gray-100 px-1.5 py-0.5 rounded text-gray-700">
                        {mun.slug}
                      </code>
                      <p className="text-xs text-gray-400 mt-0.5">{mun.dominio}</p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700">
                        {tierLabels[mun.tipo_suscripcion] || mun.tipo_suscripcion}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${
                          statusBadgeClasses[mun.estado_suscripcion] || statusBadgeClasses.prueba
                        }`}
                      >
                        {statusLabels[mun.estado_suscripcion] || mun.estado_suscripcion}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/admin/municipios/${mun.id}`}
                          className="text-sm font-medium text-indigo-600 hover:text-indigo-500 transition-colors"
                        >
                          Editar
                        </Link>
                        <Link
                          href={`/admin/municipios/${mun.id}/aplicaciones`}
                          className="text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors"
                        >
                          Apps
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Paginación */}
          {totalPages > 1 && (
            <div className="px-6 py-3 border-t border-gray-200 flex items-center justify-between bg-gray-50">
              <p className="text-sm text-gray-500">
                Página {page} de {totalPages}
              </p>
              <div className="flex gap-2">
                {page > 1 && (
                  <Link
                    href={`/admin/municipios?page=${page - 1}${search ? `&q=${search}` : ''}${filter ? `&estado=${filter}` : ''}`}
                    className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Anterior
                  </Link>
                )}
                {page < totalPages && (
                  <Link
                    href={`/admin/municipios?page=${page + 1}${search ? `&q=${search}` : ''}${filter ? `&estado=${filter}` : ''}`}
                    className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Siguiente
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
