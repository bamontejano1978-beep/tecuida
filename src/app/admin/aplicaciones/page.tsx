/**
 * Admin — Lista de aplicaciones (catálogo global)
 *
 * Muestra todas las aplicaciones del catálogo, permite filtrar
 * por estado (activa/inactiva) y buscar por nombre. El CRUD
 * de cada fila se hace en /admin/aplicaciones/[id].
 *
 * Requisitos: 10.1, 10.2, 14.1
 */

import { createAdminClient } from '@/lib/supabase/server'
import Link from 'next/link'

// ---------------------------------------------------------------------------
// Tipos (espejo de las filas de `public.applications`)
// ---------------------------------------------------------------------------

interface CategoryRow {
  id: string
  nombre: string
}

interface ApplicationRow {
  id: string
  nombre: string
  descripcion: string
  category_id: string
  thumbnail_url: string | null
  tipo: string
  nivel_suscripcion: string
  activa: boolean
}

// ---------------------------------------------------------------------------
// Mapeos de etiquetas humanas
// ---------------------------------------------------------------------------

const tipoLabels: Record<string, string> = {
  programa: 'Programa',
  herramienta: 'Herramienta',
  encuesta: 'Encuesta',
  recurso: 'Recurso',
}

const nivelLabels: Record<string, string> = {
  basico: 'Básico',
  estandar: 'Estándar',
  premium: 'Premium',
}

// ---------------------------------------------------------------------------
// Página
// ---------------------------------------------------------------------------

interface AplicacionesPageProps {
  searchParams: Record<string, string | string[] | undefined>
}

export default async function AplicacionesPage({
  searchParams,
}: AplicacionesPageProps) {
  const page = Math.max(
    1,
    parseInt(
      typeof searchParams['page'] === 'string' ? searchParams['page'] : '1',
      10,
    ),
  )
  const limit = 20
  const offset = (page - 1) * limit
  const filterActiva =
    typeof searchParams['activa'] === 'string' ? searchParams['activa'] : ''
  const search =
    typeof searchParams['q'] === 'string' ? searchParams['q'] : ''

  const supabase = createAdminClient()

  // Cargamos categorías para resolver el nombre en la tabla (cheap: 6 filas).
  const { data: categories } = await supabase
    .from('categories')
    .select('id, nombre')
    .order('orden', { ascending: true })
  const categoriesById = new Map<string, string>(
    ((categories || []) as unknown as CategoryRow[]).map((c) => [
      c.id,
      c.nombre,
    ]),
  )

  // Cargamos aplicaciones con count para paginación
  let query = supabase
    .from('applications')
    .select('*', { count: 'exact' })
    .order('nombre', { ascending: true })
    .range(offset, offset + limit - 1)

  if (filterActiva === 'true') {
    query = query.eq('activa', true)
  } else if (filterActiva === 'false') {
    query = query.eq('activa', false)
  }
  if (search) {
    query = query.ilike('nombre', `%${search}%`)
  }

  const { data, error, count } = await query

  if (error) {
    console.error('[Admin Aplicaciones]', error.message)
    return (
      <div className="px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold text-gray-900">Aplicaciones</h1>
        <div className="mt-4 rounded-lg bg-red-50 border border-red-200 p-4">
          <p className="text-sm text-red-700">
            Error al cargar las aplicaciones.
          </p>
        </div>
      </div>
    )
  }

  const applications: ApplicationRow[] = (data ||
    []) as unknown as ApplicationRow[]
  const totalPages = Math.ceil((count || 0) / limit)

  // Helper para construir links de paginación preservando filtros
  const buildPageUrl = (p: number) => {
    const params = new URLSearchParams()
    if (p > 1) params.set('page', String(p))
    if (search) params.set('q', search)
    if (filterActiva) params.set('activa', filterActiva)
    const qs = params.toString()
    return `/admin/aplicaciones${qs ? `?${qs}` : ''}`
  }

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Aplicaciones
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Catálogo global de aplicaciones disponibles para los municipios.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/admin/aplicaciones/bulk"
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 transition-colors"
          >
            Modo Bulk
          </Link>
          <Link
            href="/admin/aplicaciones/crear"
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 transition-colors"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              aria-hidden="true"
              focusable="false"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 4.5v15m7.5-7.5h-15"
              />
            </svg>
            Nueva aplicación
          </Link>
        </div>
      </div>

      {/* Filtros */}
      <div className="mb-6 flex flex-col sm:flex-row gap-3">
        <form
          className="flex-1 flex gap-3"
          method="GET"
          action="/admin/aplicaciones"
        >
          <input
            type="text"
            name="q"
            defaultValue={search}
            placeholder="Buscar por nombre..."
            className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
          />
          <select
            name="activa"
            defaultValue={filterActiva}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
          >
            <option value="">Todos los estados</option>
            <option value="true">Activos</option>
            <option value="false">Desactivados</option>
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
      {applications.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <svg
            className="mx-auto h-12 w-12 text-gray-300"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1}
            stroke="currentColor"
            aria-hidden="true"
            focusable="false"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
            />
          </svg>
          <h3 className="mt-4 text-sm font-semibold text-gray-900">
            Sin resultados
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            {search || filterActiva
              ? 'No se encontraron aplicaciones con los filtros actuales.'
              : 'Aún no hay aplicaciones en el catálogo. Crea la primera con "Nueva aplicación".'}
          </p>
          {!search && !filterActiva && (
            <Link
              href="/admin/aplicaciones/crear"
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 transition-colors"
            >
              Crear la primera
            </Link>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Aplicación
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Categoría
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Tipo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Nivel
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
                {applications.map((app) => (
                  <tr
                    key={app.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="max-w-xs">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {app.nombre}
                        </p>
                        <p className="text-xs text-gray-500 line-clamp-2">
                          {app.descripcion}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {categoriesById.get(app.category_id) ?? '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {tipoLabels[app.tipo] ?? app.tipo}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700">
                        {nivelLabels[app.nivel_suscripcion] ??
                          app.nivel_suscripcion}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${
                          app.activa
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                            : 'bg-gray-50 border-gray-200 text-gray-600'
                        }`}
                      >
                        {app.activa ? 'Activa' : 'Desactivada'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <Link
                        href={`/admin/aplicaciones/${app.id}`}
                        className="text-sm font-medium text-indigo-600 hover:text-indigo-500 transition-colors"
                      >
                        Editar
                      </Link>
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
                Página {page} de {totalPages} ·{' '}
                {count || 0} aplicación
                {(count || 0) !== 1 ? 'es' : ''} en total
              </p>
              <div className="flex gap-2">
                {page > 1 && (
                  <Link
                    href={buildPageUrl(page - 1)}
                    className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Anterior
                  </Link>
                )}
                {page < totalPages && (
                  <Link
                    href={buildPageUrl(page + 1)}
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
