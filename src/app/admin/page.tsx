/**
 * Admin Dashboard — Panel principal de superadministración
 *
 * Muestra estadísticas agregadas del sistema:
 *   - Total de municipios, activos, en prueba
 *   - Total de ciudadanos
 *   - Programas completados
 *
 * Requisitos: 10.1, 10.2
 */

import { createAdminClient } from '@/lib/supabase/server'
import Link from 'next/link'
import DemographicStats from '@/components/admin/demographic-stats'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function getDashboardStats() {
  const supabase = createAdminClient()

  // Municipios
  const { data: municipalities, error: munError } = await supabase
    .from('municipalities')
    .select('id, estado_suscripcion')
    .eq('oculto_admin', false)

  if (munError) {
    console.error('[Admin Dashboard] municipalities:', munError.message)
    return null
  }

  const totalMunicipios = municipalities?.length || 0
  const activos = municipalities?.filter((m) => m.estado_suscripcion === 'activa').length || 0
  const enPrueba = municipalities?.filter((m) => m.estado_suscripcion === 'prueba').length || 0
  const suspendidos = municipalities?.filter(
    (m) => m.estado_suscripcion === 'suspendida' || m.estado_suscripcion === 'cancelada',
  ).length || 0

  // Ciudadanos
  const { count: totalCiudadanos, error: userError } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true })

  if (userError) {
    console.error('[Admin Dashboard] users:', userError.message)
  }

  // Programas completados
  const { count: programasCompletados, error: progError } = await supabase
    .from('user_progress')
    .select('*', { count: 'exact', head: true })
    .eq('completada', true)

  if (progError) {
    console.error('[Admin Dashboard] progress:', progError.message)
  }

  // Aplicaciones
  const { count: totalApps, error: appError } = await supabase
    .from('applications')
    .select('*', { count: 'exact', head: true })

  if (appError) {
    console.error('[Admin Dashboard] applications:', appError.message)
  }

  // Apps asignadas a municipios (instalaciones totales)
  const { count: totalAsignaciones, error: asigError } = await supabase
    .from('municipality_applications')
    .select('*', { count: 'exact', head: true })
    .eq('activa', true)

  if (asigError) {
    console.error('[Admin Dashboard] municipality_applications:', asigError.message)
  }

  // Usuarios activos (con progreso o encuestas en los últimos 30 días)
  const treintaDiasAtras = new Date(
    Date.now() - 30 * 24 * 60 * 60 * 1000,
  ).toISOString()

  const { count: usuariosActivos, error: activosError } = await supabase
    .from('user_progress')
    .select('user_id', { count: 'exact', head: true })
    .gte('fecha_inicio', treintaDiasAtras)

  if (activosError) {
    console.error('[Admin Dashboard] usuarios activos:', activosError.message)
  }

  // Usuarios con datos demográficos (cobertura de métricas de impacto)
  const { count: usuariosConDemograficos, error: demError } = await supabase
    .from('users')
    .select('id', { count: 'exact', head: true })
    .not('genero', 'is', null)
    .not('anio_nacimiento', 'is', null)

  if (demError) {
    console.error('[Admin Dashboard] usuarios demográficos:', demError.message)
  }

  return {
    totalMunicipios,
    activos,
    enPrueba,
    suspendidos,
    totalCiudadanos: totalCiudadanos || 0,
    programasCompletados: programasCompletados || 0,
    totalApps: totalApps || 0,
    totalAsignaciones: totalAsignaciones || 0,
    usuariosActivos: usuariosActivos || 0,
    usuariosConDemograficos: usuariosConDemograficos || 0,
  }
}

// ---------------------------------------------------------------------------
// Componentes de tarjeta de estadística
// ---------------------------------------------------------------------------

function StatCard({
  label,
  value,
  href,
  color,
  subtitle,
}: {
  label: string
  value: number
  href?: string
  color: 'indigo' | 'emerald' | 'amber' | 'red' | 'sky' | 'violet'
  subtitle?: string
}) {
  const colorClasses = {
    indigo: 'bg-indigo-50 border-indigo-200 text-indigo-700',
    emerald: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    amber: 'bg-amber-50 border-amber-200 text-amber-700',
    red: 'bg-red-50 border-red-200 text-red-700',
    sky: 'bg-sky-50 border-sky-200 text-sky-700',
    violet: 'bg-violet-50 border-violet-200 text-violet-700',
  }

  const Card = href ? Link : 'div'

  return (
    <Card
      href={href || '#'}
      className={`block rounded-xl border p-6 ${colorClasses[color]} ${href ? 'hover:shadow-md transition-shadow' : ''}`}
    >
      <p className="text-3xl font-bold">{value.toLocaleString('es')}</p>
      <p className="mt-1 text-sm font-medium opacity-80">{label}</p>
      {subtitle && <p className="mt-0.5 text-xs opacity-60">{subtitle}</p>}
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Página
// ---------------------------------------------------------------------------

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>
}) {
  const stats = await getDashboardStats()
  const municipioId =
    typeof searchParams['municipio'] === 'string' ? searchParams['municipio'] : undefined

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Resumen general de la plataforma TE CUIDA
        </p>
      </div>

      {!stats ? (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4">
          <p className="text-sm text-red-700">
            Error al cargar las estadísticas. Verifica la conexión con la base de
            datos.
          </p>
        </div>
      ) : (
        <>
          {/* Stats grid */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <StatCard
              label="Municipios totales"
              value={stats.totalMunicipios}
              href="/admin/municipios"
              color="indigo"
            />
            <StatCard
              label="Municipios activos"
              value={stats.activos}
              color="emerald"
            />
            <StatCard
              label="Suspendidos"
              value={stats.suspendidos}
              color="red"
            />
            <StatCard
              label="Ciudadanos registrados"
              value={stats.totalCiudadanos}
              color="sky"
            />
            <StatCard
              label="Lecciones completadas"
              value={stats.programasCompletados}
              color="emerald"
            />
            <StatCard
              label="Apps asignadas"
              value={stats.totalAsignaciones}
              color="sky"
            />
            <StatCard
              label="Usuarios activos (30d)"
              value={stats.usuariosActivos}
              color="emerald"
            />
            <StatCard
              label="Cobertura demográfica"
              value={stats.usuariosConDemograficos}
              subtitle={stats.totalCiudadanos > 0 ? `${Math.round((stats.usuariosConDemograficos / stats.totalCiudadanos) * 100)}% del total` : '—'}
              color="violet"
            />
          </div>

          {/* Quick actions */}
          <div className="mt-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Acciones rápidas
            </h2>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/admin/municipios/crear"
                className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                Nuevo municipio
              </Link>
              <Link
                href="/admin/municipios"
                className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 transition-colors"
              >
                Gestionar municipios
              </Link>
            </div>
          </div>

          {/* ── Estadísticas demográficas ── */}
          <div className="mt-10">
            <DemographicStats municipioId={municipioId} />
          </div>
        </>
      )}
    </div>
  )
}
