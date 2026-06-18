/**
 * Admin — Detalle de plan
 *
 * Muestra las apps incluidas en el plan y permite sincronizarlas.
 *
 * Requisitos: 16.1, 16.2
 */

import { createAdminClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import PlanAppsSelector from './plan-apps-selector'
import SyncPlanButton from './sync-plan-button'

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

interface AppRow {
  id: string
  nombre: string
  descripcion: string | null
  tipo: string
  nivel_suscripcion: string
  category_id: string
  categoria_nombre: string
}

interface CategoryRow {
  id: string
  nombre: string
}

// ---------------------------------------------------------------------------
// Página
// ---------------------------------------------------------------------------

interface PlanDetailPageProps {
  params: { id: string }
}

export default async function PlanDetailPage({ params }: PlanDetailPageProps) {
  const supabase = createAdminClient()

  // Plan
  const { data: plan, error: planError } = await supabase
    .from('subscription_plans')
    .select('*')
    .eq('id', params.id)
    .single()

  if (planError || !plan) notFound()

  // Apps del plan
  const { data: planApps } = await supabase
    .from('plan_applications')
    .select('application_id')
    .eq('plan_id', params.id)

  const activeAppIds = (planApps || []).map((a) => a.application_id)

  // Conteo de municipios suscritos a este plan
  const { count: municipalityCount } = await supabase
    .from('municipalities')
    .select('*', { count: 'exact', head: true })
    .eq('plan_id', params.id)
    .eq('oculto_admin', false)

  // Todas las apps del catálogo
  const { data: apps } = await supabase
    .from('applications')
    .select(
      `
      id, nombre, descripcion, tipo, nivel_suscripcion, category_id,
      categoria:categories (id, nombre)
    `,
    )
    .eq('activa', true)
    .order('nombre')

  // Categorías
  const { data: cats } = await supabase
    .from('categories')
    .select('id, nombre')
    .order('orden')

  const catsList: CategoryRow[] = (cats || []) as unknown as CategoryRow[]
  const appsList: AppRow[] = ((apps || []) as Array<Record<string, unknown>>).map(
    (a) => ({
      id: a.id as string,
      nombre: a.nombre as string,
      descripcion: a.descripcion as string | null,
      tipo: a.tipo as string,
      nivel_suscripcion: a.nivel_suscripcion as string,
      category_id: a.category_id as string,
      categoria_nombre:
        (a.categoria as { nombre?: string } | null)?.nombre || 'Sin categoría',
    }),
  )

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
      id: cat.id,
      nombre: cat.nombre,
      apps: appsByCategory.get(cat.id) || [],
    }))

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8 max-w-4xl">
      <div className="mb-8">
        <Link
          href="/admin/planes"
          className="text-sm font-medium text-indigo-600 hover:text-indigo-500 transition-colors"
        >
          ← Volver a planes
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">{plan.nombre}</h1>
        <p className="mt-1 text-sm text-gray-500">
          {plan.descripcion || 'Sin descripción'}
        </p>
        <div className="mt-3 flex flex-wrap gap-3 text-xs">
          <span className="inline-flex items-center rounded-md bg-gray-100 px-2 py-1 text-gray-700">
            Slug: <code className="ml-1 font-mono">{plan.slug}</code>
          </span>
          {plan.precio_mensual !== null && (
            <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-1 text-emerald-700">
              {new Intl.NumberFormat('es', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(plan.precio_mensual)}/mes
            </span>
          )}
          {plan.max_ciudadanos !== null && (
            <span className="inline-flex items-center rounded-md bg-indigo-50 px-2 py-1 text-indigo-700">
              Máx. {new Intl.NumberFormat('es').format(plan.max_ciudadanos)} ciudadanos
            </span>
          )}
        </div>
      </div>

      {/* Botón de sincronización */}
      <div className="mb-6 bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-sm font-semibold text-gray-900 mb-3">
          Sincronización con municipios
        </h2>
        <SyncPlanButton
          planId={plan.id}
          planName={plan.nombre}
          municipalityCount={municipalityCount || 0}
        />
      </div>

      <PlanAppsSelector
        planId={plan.id}
        activeIds={activeAppIds}
        categories={categoriesWithApps}
      />
    </div>
  )
}
