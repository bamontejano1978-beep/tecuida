/**
 * Admin — Detalle y edición de actividad marketplace.
 *
 * Server Component que carga la actividad y profesionales del mismo
 * municipio, renderiza el Client Form para edición.
 */

import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/server'
import { getAdminAccess, checkTenantAccess } from '@/lib/admin/activities'
import { InscriptionEstadoBadge } from '@/components/ui/inscription-estado-badge'
import { formatShortDate } from '@/lib/format-date'
import EditActivityForm from './edit-form'

interface ActivityWithExtras {
  id: string
  municipality_id: string
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

export default async function EditarActividadPage({
  params,
}: {
  params: { id: string }
}) {
  const access = await getAdminAccess()
  if (!access) redirect('/login?error=unauthorized')

  const supabase = createAdminClient()
  const { data: activity } = await supabase
    .from('activities')
    .select('*')
    .eq('id', params.id)
    .maybeSingle()

  if (!activity) notFound()
  const act = activity as unknown as ActivityWithExtras

  // Tenant gate — redirige a /admin si el admin no tiene acceso al municipio.
  const te = checkTenantAccess(access, act.municipality_id)
  if (!te.ok) redirect('/admin')

  // Profesionales del municipio (para cambio)
  const prosQuery = supabase.from('professionals').select('id, nombre, tipo')
    .eq('municipality_id', act.municipality_id)
    .order('nombre', { ascending: true })
  const { data: professionals } = await prosQuery

  const { data: categories } = await supabase
    .from('categories')
    .select('id, nombre')
    .order('orden', { ascending: true })

  // Lista de inscritos. Solo accesible a admin_municipio del municipio
  // de la actividad o superadmin (verificado ANTES por getAdminAccess +
  // checkTenantAccess arriba). service_role bypasea RLS, pero el gate
  // administrativo ya garantiza tenant-match. Útil para que admin o
  // profesional-coordinador vea alergias / accesibilidad / preferencias
  // ANTES del día del taller.
  const { data: inscriptionsData } = await supabase
    .from('activity_inscriptions')
    .select('id, email, nombre, notas, estado, created_at')
    .eq('activity_id', params.id)
    .order('created_at', { ascending: true })

  type EstadoInscripcion = 'confirmada' | 'cancelada' | 'asistio' | 'no_asistio'
  const inscripciones = (inscriptionsData || []) as Array<{
    id: string
    email: string
    nombre: string | null
    notas: string | null
    estado: EstadoInscripcion
    created_at: string
  }>

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8 max-w-5xl">
      <div className="mb-8">
        <Link
          href="/admin/actividades"
          className="text-sm font-medium text-indigo-600 hover:text-indigo-500 transition-colors"
        >
          ← Volver a actividades
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">{act.nombre}</h1>
        <p className="mt-1 text-sm text-gray-500">
          Estado actual:{' '}
          <span className="font-medium text-gray-700">{act.estado}</span>
          {' · '}
          <span>
            Inscritos: <strong>{act.plazas_inscritas}</strong>
            {act.aforo !== null ? ` / ${act.aforo}` : ''}
          </span>
        </p>
      </div>

      <EditActivityForm
        activity={act}
        professionals={(professionals || []) as Array<{ id: string; nombre: string; tipo: string }>}
        categories={(categories || []) as Array<{ id: string; nombre: string }>}
      />

      {/* ── Sección de inscritos ──────────────────────────────────────── */}
      <section className="mt-12" aria-labelledby="inscritos-heading">
        <h2
          id="inscritos-heading"
          className="text-lg font-bold text-gray-900"
        >
          👥 Inscritos
          <span className="ml-2 text-sm font-medium text-gray-500">
            ({inscripciones.length})
          </span>
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Lista de ciudadanos apuntados a esta actividad. Las notas son
          lo que dejaron al inscribirse (alergias, accesibilidad, dudas)
          y las ve el profesional para preparar el taller.
        </p>
        <div className="mt-4 bg-white rounded-xl border border-gray-200 overflow-hidden overflow-x-auto">
          {inscripciones.length === 0 ? (
            <p className="p-6 text-center text-sm text-gray-400">
              Todavía no hay inscripciones en esta actividad.
            </p>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    scope="col"
                    className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"
                  >
                    Nombre
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"
                  >
                    Email
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"
                  >
                    Notas para el profesional
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"
                  >
                    Estado
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"
                  >
                    Inscrito
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {inscripciones.map((i) => (
                  <tr key={i.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-sm text-gray-900 align-top">
                      {i.nombre || (
                        <span className="text-gray-400 italic">
                          (sin nombre)
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600 font-mono align-top break-all">
                      {i.email}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 align-top max-w-md">
                      {i.notas ? (
                        <span className="italic whitespace-pre-wrap">
                          {i.notas}
                        </span>
                      ) : (
                        <span className="text-gray-400 not-italic">
                          (sin notas)
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm align-top">
                      <InscriptionEstadoBadge estado={i.estado} />
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap align-top">
                      {formatShortDate(i.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  )
}
