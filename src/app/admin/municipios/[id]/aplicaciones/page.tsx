/**
 * Admin — Aplicaciones del municipio
 *
 * Muestra las aplicaciones del catálogo y permite activar/desactivar
 * cuáles están disponibles para un municipio concreto.
 *
 * Requisitos: 10.1, 10.2, 13.1
 */

import { createAdminClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import ManageAppsForm from './manage-apps-form'

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

interface CategoryRow {
  id: string
  nombre: string
}

interface AppRow {
  id: string
  category_id: string
  nombre: string
  descripcion: string
  tipo: string
  nivel_suscripcion: string
  activa: boolean
}

// ---------------------------------------------------------------------------
// Página
// ---------------------------------------------------------------------------

interface ManageAppsPageProps {
  params: { id: string }
}

export default async function ManageAppsPage({ params }: ManageAppsPageProps) {
  const supabase = createAdminClient()

  // Municipio
  const { data: mun, error: munError } = await supabase
    .from('municipalities')
    .select('id, nombre_municipio, slug')
    .eq('id', params.id)
    .single()

  if (munError || !mun) notFound()

  // Todas las apps del catálogo
  const { data: apps } = await supabase
    .from('applications')
    .select('id, category_id, nombre, descripcion, tipo, nivel_suscripcion, activa')
    .eq('activa', true)
    .order('nombre')

  // Categorías
  const { data: categories } = await supabase
    .from('categories')
    .select('id, nombre')
    .order('orden')

  // Apps activas de este municipio
  const { data: activeApps } = await supabase
    .from('municipality_applications')
    .select('application_id')
    .eq('municipality_id', params.id)
    .eq('activa', true)

  const activeIds = new Set((activeApps || []).map((a) => a.application_id))
  const appsList: AppRow[] = (apps || []) as unknown as AppRow[]
  const catsList: CategoryRow[] = (categories || []) as unknown as CategoryRow[]

  // Agrupar apps por categoría
  const appsByCategory = new Map<string, AppRow[]>()
  appsList.forEach((app) => {
    const arr = appsByCategory.get(app.category_id) || []
    arr.push(app)
    appsByCategory.set(app.category_id, arr)
  })

  const categoriesWithApps = catsList
    .filter((cat) => appsByCategory.has(cat.id))
    .map((cat) => ({
      ...cat,
      apps: appsByCategory.get(cat.id) || [],
    }))

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8 max-w-3xl">
      <div className="mb-8">
        <Link
          href="/admin/municipios"
          className="text-sm font-medium text-indigo-600 hover:text-indigo-500 transition-colors"
        >
          ← Volver a municipios
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">
          Aplicaciones activas
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          {mun.nombre_municipio} ({mun.slug}) — Selecciona las aplicaciones
          disponibles para este municipio.
        </p>
      </div>

      <ManageAppsForm
        municipalityId={params.id}
        activeIds={activeIds}
        categories={categoriesWithApps}
      />
    </div>
  )
}
