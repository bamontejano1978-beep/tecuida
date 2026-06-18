/**
 * Admin — Lista de planes de suscripción
 *
 * Muestra todos los planes con conteo de apps y municipios asignados.
 * Permite crear nuevos planes y acceder a la gestión de apps por plan.
 *
 * Requisitos: 16.1, 16.2
 */

import { createAdminClient } from '@/lib/supabase/server'
import Link from 'next/link'

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
  activo: boolean
  orden: number
  municipios_count?: number
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatPrice(price: number | null): string {
  if (price === null || price === undefined) return '—'
  return new Intl.NumberFormat('es', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(price)
}

function formatMaxUsers(max: number | null): string {
  if (max === null) return '∞'
  return new Intl.NumberFormat('es').format(max)
}

// ---------------------------------------------------------------------------
// Página
// ---------------------------------------------------------------------------

export default async function PlanesPage() {
  const supabase = createAdminClient()

  // Cargar planes
  const { data: plans, error: plansError } = await supabase
    .from('subscription_plans')
    .select('*')
    .order('orden', { ascending: true })

  // Cargar conteo de apps por plan
  const { data: planApps } = await supabase
    .from('plan_applications')
    .select('plan_id')

  const appsByPlan = new Map<string, number>()
  ;(planApps || []).forEach((row) => {
    appsByPlan.set(row.plan_id, (appsByPlan.get(row.plan_id) || 0) + 1)
  })

  // Cargar conteo de municipios por plan
  const { data: muns } = await supabase
    .from('municipalities')
    .select('plan_id')
    .eq('oculto_admin', false)

  const munsByPlan = new Map<string, number>()
  ;(muns || []).forEach((row) => {
    if (row.plan_id) {
      munsByPlan.set(row.plan_id, (munsByPlan.get(row.plan_id) || 0) + 1)
    }
  })

  const plansList: PlanRow[] = (plans || []).map((p) => ({
    ...p,
    municipios_count: munsByPlan.get(p.id) || 0,
  }))

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8 max-w-5xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <Link
            href="/admin"
            className="text-sm font-medium text-indigo-600 hover:text-indigo-500 transition-colors"
          >
            ← Volver al dashboard
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-gray-900">
            Planes de suscripción
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {plansList.length} plan{plansList.length !== 1 ? 'es' : ''} configurado{plansList.length !== 1 ? 's' : ''}.
            Cada plan agrupa un conjunto de aplicaciones.
          </p>
        </div>
      </div>

      {plansError && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4 mb-6">
          <p className="text-sm text-red-700">Error al cargar los planes.</p>
        </div>
      )}

      {/* Listado de planes */}
      {plansList.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <p className="text-sm text-gray-500">
            No hay planes creados. Ejecuta el seed 004_subscription_plans.sql
            para crear los 3 planes base.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {plansList.map((plan) => {
            const appsCount = appsByPlan.get(plan.id) || 0
            const munsCount = plan.municipios_count || 0
            return (
              <Link
                key={plan.id}
                href={`/admin/planes/${plan.id}`}
                className="block bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md hover:border-indigo-200 transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-lg font-bold text-gray-900">
                    {plan.nombre}
                  </h3>
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      plan.activo
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {plan.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </div>

                <p className="text-sm text-gray-500 line-clamp-2 mb-4 min-h-[40px]">
                  {plan.descripcion || 'Sin descripción'}
                </p>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Precio</span>
                    <span className="font-semibold text-gray-900">
                      {formatPrice(plan.precio_mensual)}/mes
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Máx. ciudadanos</span>
                    <span className="font-semibold text-gray-900">
                      {formatMaxUsers(plan.max_ciudadanos)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Apps incluidas</span>
                    <span className="font-semibold text-indigo-600">
                      {appsCount}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Municipios</span>
                    <span className="font-semibold text-indigo-600">
                      {munsCount}
                    </span>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
