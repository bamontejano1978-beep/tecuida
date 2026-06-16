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
import { headers } from 'next/headers'
import {
  getMunicipioLandingUrl,
  cleanHostname,
} from '@/lib/tenant/landing'
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
    .select('id, nombre_municipio, slug, dominio')
    .eq('id', params.id)
    .eq('oculto_admin', false)
    .single()

  if (munError || !mun) notFound()

  const currentHost = headers().get('host')
  const catalogUrl = getMunicipioLandingUrl(
    { slug: mun.slug, dominio: mun.dominio },
    currentHost,
  )
  // En producción la URL coincide con el dominio; solo resaltamos la URL
  // computada cuando aporta algo distinto (caso dev). Comparamos sobre el
  // host normalizado para que el span siga oculto si alguien pegase
  // `https://` en `dominio` en el futuro.
  const showResolvedUrl =
    !!mun.dominio && catalogUrl !== `https://${cleanHostname(mun.dominio)}`

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
          {mun.nombre_municipio} — Dominio: {mun.dominio} · ({mun.slug}).
          Selecciona las aplicaciones disponibles para este municipio.
        </p>
        <div className="mt-4 flex items-center gap-3">
          <a
            href={catalogUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 transition-colors"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              aria-hidden="true"
              focusable="false"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
              />
            </svg>
            Ver catálogo público
          </a>
          {showResolvedUrl && (
            <span
              className="text-xs text-gray-400 font-mono truncate max-w-[280px]"
              title={catalogUrl}
            >
              ({catalogUrl})
            </span>
          )}
        </div>
      </div>

      <ManageAppsForm
        municipalityId={params.id}
        activeIds={activeIds}
        categories={categoriesWithApps}
      />
    </div>
  )
}
