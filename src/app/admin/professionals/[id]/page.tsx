/**
 * Admin — Detalle de profesional.
 */

import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/server'
import { getAdminAccess, checkTenantAccess } from '@/lib/admin/activities'
import EditProfessionalForm from './edit-form'

interface ProRow {
  id: string
  municipality_id: string
  nombre: string
  tipo: string
  email: string
  telefono: string | null
  descripcion: string | null
  numero_colegiado: string | null
  web_url: string | null
  verificado: boolean
  estado: string
}

export default async function EditProfesionalPage({
  params,
}: {
  params: { id: string }
}) {
  const access = await getAdminAccess({ superadminOnly: true })
  if (!access) redirect('/login?error=unauthorized')

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('professionals')
    .select('*')
    .eq('id', params.id)
    .maybeSingle()

  if (error || !data) notFound()
  const prof = data as unknown as ProRow

  // Tenant gate — redirige a /admin si el admin no tiene acceso al municipio.
  const te = checkTenantAccess(access, prof.municipality_id)
  if (!te.ok) redirect('/admin')

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8 max-w-2xl">
      <div className="mb-8">
        <Link
          href="/admin/professionals"
          className="text-sm font-medium text-indigo-600 hover:text-indigo-500 transition-colors"
        >
          ← Volver a profesionales
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">{prof.nombre}</h1>
        <p className="mt-1 text-sm text-gray-500">{prof.email}</p>
      </div>
      <EditProfessionalForm prof={prof} />
    </div>
  )
}
