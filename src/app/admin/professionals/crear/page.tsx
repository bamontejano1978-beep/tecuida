/**
 * Admin — Crear profesional marketplace.
 */

import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getAdminAccess } from '@/lib/admin/activities'
import { createAdminClient } from '@/lib/supabase/server'
import CreateProfessionalForm from './create-form'

export default async function CrearProfesionalPage() {
  const access = await getAdminAccess({ superadminOnly: true })
  if (!access) redirect('/login?error=unauthorized')

  let municipalities: Array<{ id: string; nombre_municipio: string }> = []
  if (access.is_superadmin) {
    const supabase = createAdminClient()
    const { data: muns } = await supabase
      .from('municipalities')
      .select('id, nombre_municipio')
      .order('nombre_municipio', { ascending: true })
    municipalities = (muns || []) as Array<{ id: string; nombre_municipio: string }>
  }

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8 max-w-2xl">
      <div className="mb-8">
        <Link
          href="/admin/professionals"
          className="text-sm font-medium text-indigo-600 hover:text-indigo-500 transition-colors"
        >
          ← Volver a profesionales
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">Nuevo profesional</h1>
        <p className="mt-1 text-sm text-gray-500">
          Psicólogos colegiados, asociaciones, centros y profesionales que ofertan actividades.
        </p>
      </div>

      <CreateProfessionalForm
        access={{
          is_superadmin: access.is_superadmin,
          municipality_id: access.municipality_id,
        }}
        municipalities={municipalities}
      />
    </div>
  )
}
