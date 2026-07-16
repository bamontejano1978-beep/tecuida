/**
 * Admin — Listado de profesionales marketplace.
 */

import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/server'
import { getAdminAccess } from '@/lib/admin/activities'
import { redirect } from 'next/navigation'

interface ProRow {
  id: string
  nombre: string
  tipo: string
  email: string
  telefono: string | null
  verificado: boolean
  estado: string
  numero_colegiado: string | null
}

const tipoBadge: Record<string, string> = {
  colegiado: 'bg-emerald-50 border-emerald-200 text-emerald-700',
  asociacion: 'bg-amber-50 border-amber-200 text-amber-700',
  centro: 'bg-violet-50 border-violet-200 text-violet-700',
  profesional_autonomo: 'bg-sky-50 border-sky-200 text-sky-700',
  otro: 'bg-gray-50 border-gray-200 text-gray-700',
}

export default async function AdminProfessionalsPage() {
  const access = await getAdminAccess()
  if (!access) redirect('/login?error=unauthorized')

  const supabase = createAdminClient()
  let query = supabase
    .from('professionals')
    .select('id, nombre, tipo, email, telefono, verificado, estado, numero_colegiado')
    .order('nombre', { ascending: true })
  if (!access.is_superadmin && access.municipality_id) {
    query = query.eq('municipality_id', access.municipality_id)
  }
  const { data, error } = await query
  const rows: ProRow[] = (data || []) as unknown as ProRow[]

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <Link href="/admin/actividades" className="text-sm font-medium text-indigo-600 hover:text-indigo-500 transition-colors">
            ← Volver a actividades
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-gray-900">Profesionales y entidades</h1>
          <p className="mt-1 text-sm text-gray-500">
            Psicólogos, asociaciones, entidades y profesionales que ofertan actividades en tu municipio.
          </p>
        </div>
        <Link
          href="/admin/professionals/crear"
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Nuevo profesional
        </Link>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-4">
          <p className="text-sm text-red-700">Error al cargar.</p>
        </div>
      )}

      {rows.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <p className="text-sm text-gray-500 mb-2">
            Aún no hay profesionales registrados.
          </p>
          <Link
            href="/admin/professionals/crear"
            className="mt-3 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 transition-colors"
          >
            Crear el primero
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Persona / entidad</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Tipo</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Colegiado</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Contacto</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Estado</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-gray-900">{p.nombre}</p>
                      {p.verificado && (
                        <span title="Verificado por el municipio" className="text-emerald-600">✓</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${tipoBadge[p.tipo] ?? 'bg-gray-50 border-gray-200 text-gray-700'}`}>
                      {p.tipo}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    {p.numero_colegiado ?? '—'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">
                    <p>{p.email}</p>
                    {p.telefono && <p className="text-xs text-gray-500">{p.telefono}</p>}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${
                      p.estado === 'activo'
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                        : 'bg-gray-50 border-gray-200 text-gray-600'
                    }`}>
                      {p.estado}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <Link
                      href={`/admin/professionals/${p.id}`}
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
      )}
    </div>
  )
}
