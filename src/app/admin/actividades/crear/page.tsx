/**
 * Admin — Crear actividad marketplace (Fase 1).
 *
 * Server Component: carga categorías, profesionales del tenant y actual user
 * para el Client Form.
 */

import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/server'
import { getAdminAccess } from '@/lib/admin/activities'
import { redirect } from 'next/navigation'
import CreateActivityForm from './create-form'

export default async function CrearActividadPage() {
  const access = await getAdminAccess()
  if (!access) redirect('/login?error=unauthorized')

  const supabase = createAdminClient()

  // Profesionales del tenant
  let prosQuery = supabase.from('professionals').select('id, nombre, tipo')
  if (!access.is_superadmin && access.municipality_id) {
    prosQuery = prosQuery.eq('municipality_id', access.municipality_id)
  }
  const { data: professionals } = await prosQuery.order('nombre', { ascending: true })

  // Para superadmin: lista de municipios (para asignar target)
  const { data: municipalities } = access.is_superadmin
    ? await supabase
        .from('municipalities')
        .select('id, nombre_municipio')
        .order('nombre_municipio', { ascending: true })
    : { data: null }

  // Categorías
  const { data: categories } = await supabase
    .from('categories')
    .select('id, nombre')
    .order('orden', { ascending: true })

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8 max-w-3xl">
      <div className="mb-8">
        <Link
          href="/admin/actividades"
          className="text-sm font-medium text-indigo-600 hover:text-indigo-500 transition-colors"
        >
          ← Volver a actividades
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">Nueva actividad</h1>
        <p className="mt-1 text-sm text-gray-500">
          Publica un taller, evento o curso. Los ciudadanos se inscriben; el profesional cobra aparte (Bizum, transferencia...).
        </p>
      </div>

      <CreateActivityForm
        access={{
          is_superadmin: access.is_superadmin,
          municipality_id: access.municipality_id,
        }}
        professionals={(professionals || []) as Array<{ id: string; nombre: string; tipo: string }>}
        categories={(categories || []) as Array<{ id: string; nombre: string }>}
        municipalities={(municipalities || []) as Array<{ id: string; nombre_municipio: string }>}
      />
    </div>
  )
}
