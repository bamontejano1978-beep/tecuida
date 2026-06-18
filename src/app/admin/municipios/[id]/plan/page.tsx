/**
 * Admin — Asignar plan a un municipio
 *
 * Muestra el plan actual, permite elegir uno nuevo y muestra
 * un diff (apps a añadir/eliminar) antes de confirmar.
 *
 * Requisitos: 16.1, 16.2
 */

import { createAdminClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import AssignPlanForm from './assign-plan-form'

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

interface PlanRow {
  id: string
  slug: string
  nombre: string
  descripcion: string | null
  precio_mensual: number | null
  max_ciudadanos: number | null
}

// ---------------------------------------------------------------------------
// Página
// ---------------------------------------------------------------------------

interface AssignPlanPageProps {
  params: { id: string }
}

export default async function AssignPlanPage({ params }: AssignPlanPageProps) {
  const supabase = createAdminClient()

  // 1. Municipio
  const { data: mun, error: munError } = await supabase
    .from('municipalities')
    .select('id, nombre_municipio, slug, plan_id')
    .eq('id', params.id)
    .eq('oculto_admin', false)
    .single()

  if (munError || !mun) notFound()

  // 2. Plan actual
  let currentPlan: PlanRow | null = null
  if (mun.plan_id) {
    const { data } = await supabase
      .from('subscription_plans')
      .select('id, slug, nombre, descripcion, precio_mensual, max_ciudadanos')
      .eq('id', mun.plan_id)
      .single()
    currentPlan = data
  }

  // 3. Apps actuales del municipio (solo IDs para el diff)
  const { data: currentApps } = await supabase
    .from('municipality_applications')
    .select('application_id')
    .eq('municipality_id', params.id)
    .eq('activa', true)

  const currentAppIds = (currentApps || []).map(
    (a) => a.application_id as string,
  )

  // 4. Todos los planes disponibles
  const { data: plans } = await supabase
    .from('subscription_plans')
    .select('id, slug, nombre, descripcion, precio_mensual, max_ciudadanos')
    .eq('activo', true)
    .order('orden', { ascending: true })

  const plansList: PlanRow[] = (plans || []) as PlanRow[]

  // 5. Detalles de apps por plan (para mostrar preview al elegir)
  const { data: allPlanApps } = await supabase
    .from('plan_applications')
    .select('plan_id, application_id')

  const appsByPlan: Record<string, string[]> = {}
  ;(allPlanApps || []).forEach((row) => {
    if (!appsByPlan[row.plan_id]) appsByPlan[row.plan_id] = []
    appsByPlan[row.plan_id].push(row.application_id)
  })

  // 6. Detalles de todas las apps (para nombres en preview)
  const { data: allApps } = await supabase
    .from('applications')
    .select('id, nombre, tipo, nivel_suscripcion')
    .eq('activa', true)

  const appsById: Record<
    string,
    { id: string; nombre: string; tipo: string; nivel_suscripcion: string }
  > = {}
  ;(allApps || []).forEach((a) => {
    const id = (a as { id: string }).id
    appsById[id] = {
      id,
      nombre: (a as { nombre: string }).nombre,
      tipo: (a as { tipo: string }).tipo,
      nivel_suscripcion: (a as { nivel_suscripcion: string })
        .nivel_suscripcion,
    }
  })

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8 max-w-4xl">
      <div className="mb-8">
        <Link
          href={`/admin/municipios/${params.id}`}
          className="text-sm font-medium text-indigo-600 hover:text-indigo-500 transition-colors"
        >
          ← Volver al municipio
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">
          Plan de suscripción
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          {mun.nombre_municipio} ({mun.slug})
        </p>
      </div>

      <AssignPlanForm
        municipalityId={params.id}
        currentPlan={currentPlan}
        currentAppIds={currentAppIds}
        plans={plansList}
        appsByPlan={appsByPlan}
        appsById={appsById}
      />
    </div>
  )
}
