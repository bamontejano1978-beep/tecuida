/**
 * MunicipalityStats — Estadísticas detalladas por municipio
 *
 * Server Component que consulta datos agregados para un municipio:
 *   1. KPIs: ciudadanos, activos (30d), apps activas, lecciones completadas
 *   2. Desglose por aplicación: usuarios únicos y lecciones completadas
 *   3. Evolución mensual (últimos 6 meses)
 *   4. Estadísticas demográficas (reutiliza DemographicStats)
 *
 * Los datos son agregados — nunca se muestra PII individual.
 * Cumple RGPD: todo son conteos y porcentajes anónimos.
 */

import { createAdminClient } from '@/lib/supabase/server'
import DemographicStats from '@/components/admin/demographic-stats'

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

interface AppUsageRow {
  application_id: string
  application_nombre: string
  application_tipo: string
  usuarios_unicos: number
  lecciones_completadas: number
}

interface MonthlyRow {
  mes: string
  nuevos_registros: number
  lecciones_completadas: number
}

interface MunicipalityStatsData {
  municipioId: string
  municipioNombre: string
  totalCiudadanos: number
  ciudadanosActivos: number
  appsActivas: number
  leccionesCompletadas: number
  appsUsage: AppUsageRow[]
  monthlyActivity: MonthlyRow[]
}

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------

const MONTHS_ES = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic',
]

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

async function fetchMunicipalityStats(
  municipioId: string,
): Promise<MunicipalityStatsData | null> {
  const supabase = createAdminClient()

  // ── 0. Datos básicos del municipio ──
  const { data: munData, error: munError } = await supabase
    .from('municipalities')
    .select('nombre_municipio')
    .eq('id', municipioId)
    .eq('oculto_admin', false)
    .single()

  if (munError || !munData) return null

  // ── 1. Ciudadanos totales ──
  const { count: totalCiudadanos } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true })
    .eq('municipality_id', municipioId)

  // ── 2. Ciudadanos activos (últimos 30 días) ──
  const treintaDiasAtras = new Date(
    Date.now() - 30 * 24 * 60 * 60 * 1000,
  ).toISOString()

  const { data: usuariosActivosData } = await supabase
    .from('user_progress')
    .select('user_id')
    .eq('municipality_id', municipioId)
    .gte('fecha_inicio', treintaDiasAtras)

  const usuariosActivosSet = new Set(
    (usuariosActivosData || []).map((r) => r.user_id),
  )
  const ciudadanosActivos = usuariosActivosSet.size

  // ── 3. Apps activas ──
  const { count: appsActivas } = await supabase
    .from('municipality_applications')
    .select('*', { count: 'exact', head: true })
    .eq('municipality_id', municipioId)
    .eq('activa', true)

  // ── 4. Lecciones completadas ──
  const { count: leccionesCompletadas } = await supabase
    .from('user_progress')
    .select('*', { count: 'exact', head: true })
    .eq('municipality_id', municipioId)
    .eq('completada', true)

  // ── 5. Desglose por aplicación ──
  const { data: appsUsageData, error: appsError } = await supabase
    .from('user_progress')
    .select(
      `user_id,
       completada,
       program_id,
       program:programs!inner (
         application_id,
         application:applications!inner (nombre, tipo)
       )`,
    )
    .eq('municipality_id', municipioId)
    .limit(5000)

  if (appsError) {
    console.error('[MunicipalityStats] appsUsageData:', appsError.message)
  }

  // Agregar en JS: usuarios únicos y lecciones completadas por aplicación
  const appMap = new Map<
    string,
    {
      nombre: string
      tipo: string
      usuarios: Set<string>
      lecciones: number
    }
  >()

  if (appsUsageData) {
    for (const row of appsUsageData as unknown as {
      user_id: string
      completada: boolean
      program: { application_id: string; application: { nombre: string; tipo: string } | null } | null
    }[]) {
      const appId = row.program?.application_id
      if (!appId || !row.program?.application) continue

      const existing = appMap.get(appId) || {
        nombre: row.program.application.nombre,
        tipo: row.program.application.tipo,
        usuarios: new Set<string>(),
        lecciones: 0,
      }

      existing.usuarios.add((row as unknown as { user_id: string }).user_id)
      if ((row as unknown as { completada: boolean }).completada) {
        existing.lecciones++
      }

      appMap.set(appId, existing)
    }
  }

  // También incluir apps sin progreso (asignadas pero sin uso aún)
  const { data: assignedApps } = await supabase
    .from('municipality_applications')
    .select(
      `application_id,
       application:applications!inner (nombre, tipo)`,
    )
    .eq('municipality_id', municipioId)
    .eq('activa', true)

  if (assignedApps) {
    for (const row of assignedApps as unknown as {
      application_id: string
      application: { nombre: string; tipo: string } | null
    }[]) {
      if (!row.application) continue
      if (!appMap.has(row.application_id)) {
        appMap.set(row.application_id, {
          nombre: row.application.nombre,
          tipo: row.application.tipo,
          usuarios: new Set(),
          lecciones: 0,
        })
      }
    }
  }

  const appsUsage: AppUsageRow[] = Array.from(appMap.entries())
    .map(([appId, data]) => ({
      application_id: appId,
      application_nombre: data.nombre,
      application_tipo: data.tipo,
      usuarios_unicos: data.usuarios.size,
      lecciones_completadas: data.lecciones,
    }))
    .sort((a, b) => b.usuarios_unicos - a.usuarios_unicos)

  // ── 6. Actividad mensual (últimos 6 meses) ──
  const seisMesesAtras = new Date()
  seisMesesAtras.setMonth(seisMesesAtras.getMonth() - 6)
  seisMesesAtras.setDate(1)
  seisMesesAtras.setHours(0, 0, 0, 0)

  // Inicializar meses
  const monthlyMap = new Map<string, { nuevos_registros: number; lecciones_completadas: number }>()
  for (let i = 0; i < 6; i++) {
    const d = new Date(seisMesesAtras)
    d.setMonth(d.getMonth() + i)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    monthlyMap.set(key, { nuevos_registros: 0, lecciones_completadas: 0 })
  }

  // Registros nuevos por mes
  const { data: registrosMensuales } = await supabase
    .from('users')
    .select('created_at')
    .eq('municipality_id', municipioId)
    .gte('created_at', seisMesesAtras.toISOString())

  if (registrosMensuales) {
    for (const r of registrosMensuales as unknown as { created_at: string }[]) {
      const d = new Date(r.created_at)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const entry = monthlyMap.get(key)
      if (entry) entry.nuevos_registros++
    }
  }

  // Lecciones completadas por mes
  const { data: completadasMensuales } = await supabase
    .from('user_progress')
    .select('fecha_completado')
    .eq('municipality_id', municipioId)
    .eq('completada', true)
    .gte('fecha_completado', seisMesesAtras.toISOString())

  if (completadasMensuales) {
    for (const r of completadasMensuales as unknown as { fecha_completado: string }[]) {
      if (!r.fecha_completado) continue
      const d = new Date(r.fecha_completado)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const entry = monthlyMap.get(key)
      if (entry) entry.lecciones_completadas++
    }
  }

  const monthlyActivity: MonthlyRow[] = Array.from(monthlyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([mes, data]) => ({
      mes: `${MONTHS_ES[parseInt(mes.split('-')[1]) - 1]} ${mes.split('-')[0].slice(2)}`,
      nuevos_registros: data.nuevos_registros,
      lecciones_completadas: data.lecciones_completadas,
    }))

  return {
    municipioId,
    municipioNombre: munData.nombre_municipio,
    totalCiudadanos: totalCiudadanos || 0,
    ciudadanosActivos,
    appsActivas: appsActivas || 0,
    leccionesCompletadas: leccionesCompletadas || 0,
    appsUsage,
    monthlyActivity,
  }
}

// ---------------------------------------------------------------------------
// Subcomponentes
// ---------------------------------------------------------------------------

function KpiCard({
  label,
  value,
  icon,
  color,
}: {
  label: string
  value: number
  icon: string
  color: 'indigo' | 'emerald' | 'amber' | 'sky'
}) {
  const colorClasses = {
    indigo: 'bg-indigo-50 border-indigo-200 text-indigo-700',
    emerald: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    amber: 'bg-amber-50 border-amber-200 text-amber-700',
    sky: 'bg-sky-50 border-sky-200 text-sky-700',
  }

  return (
    <div className={`rounded-xl border p-5 ${colorClasses[color]}`}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">{icon}</span>
        <span className="text-xs font-medium uppercase tracking-wider opacity-70">
          {label}
        </span>
      </div>
      <p className="text-3xl font-bold">{value.toLocaleString('es')}</p>
    </div>
  )
}

function BarChart({
  data,
  maxValue,
  colorClass,
}: {
  data: { label: string; value: number }[]
  maxValue: number
  colorClass: string
}) {
  return (
    <div className="space-y-2">
      {data.map((item) => {
        const pct = maxValue > 0 ? Math.round((item.value / maxValue) * 100) : 0
        return (
          <div key={item.label} className="flex items-center gap-2">
            <span className="w-24 shrink-0 text-xs text-gray-500 truncate text-right">
              {item.label}
            </span>
            <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${colorClass}`}
                style={{ width: `${Math.max(pct, 1)}%` }}
              />
            </div>
            <span className="w-10 text-xs font-mono text-gray-600 text-right">
              {item.value}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface MunicipalityStatsProps {
  municipioId: string
}

// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------


export default async function MunicipalityStats({
  municipioId,
}: MunicipalityStatsProps) {
  const stats = await fetchMunicipalityStats(municipioId)

  if (!stats) {
    return (
      <div className="rounded-lg bg-red-50 border border-red-200 p-4">
        <p className="text-sm text-red-700">
          Municipio no encontrado o sin permisos para ver sus estadísticas.
        </p>
      </div>
    )
  }

  const maxLecciones = Math.max(
    ...stats.appsUsage.map((a) => a.lecciones_completadas),
    1,
  )
  const maxRegistrosMensuales = Math.max(
    ...stats.monthlyActivity.map((m) => m.nuevos_registros + m.lecciones_completadas),
    1,
  )

  return (
    <div className="space-y-8">
      {/* ── KPIs ── */}
      <div>
        <h2 className="text-lg font-bold text-gray-900 mb-4">
          📊 {stats.municipioNombre} — Resumen de actividad
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            label="Ciudadanos"
            value={stats.totalCiudadanos}
            icon="👥"
            color="indigo"
          />
          <KpiCard
            label="Activos (30d)"
            value={stats.ciudadanosActivos}
            icon="🟢"
            color="emerald"
          />
          <KpiCard
            label="Apps activas"
            value={stats.appsActivas}
            icon="📱"
            color="amber"
          />
          <KpiCard
            label="Lecciones completadas"
            value={stats.leccionesCompletadas}
            icon="✅"
            color="sky"
          />
        </div>
      </div>

      {/* ── Actividad mensual ── */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center rounded bg-blue-100 text-blue-600 text-xs">
            📅
          </span>
          Actividad mensual (últimos 6 meses)
        </h3>
        {stats.monthlyActivity.every(
          (m) => m.nuevos_registros === 0 && m.lecciones_completadas === 0,
        ) ? (
          <p className="text-sm text-gray-400 text-center py-8">
            Sin actividad registrada en los últimos 6 meses.
          </p>
        ) : (
          <div className="space-y-1">
            {stats.monthlyActivity.map((m) => {
              const total = m.nuevos_registros + m.lecciones_completadas
              const registrosPct =
                maxRegistrosMensuales > 0
                  ? Math.round((m.nuevos_registros / maxRegistrosMensuales) * 100)
                  : 0
              const leccionesPct =
                maxRegistrosMensuales > 0
                  ? Math.round((m.lecciones_completadas / maxRegistrosMensuales) * 100)
                  : 0

              return (
                <div key={m.mes} className="flex items-center gap-3 py-2">
                  <span className="w-14 shrink-0 text-xs font-medium text-gray-500">
                    {m.mes}
                  </span>
                  <div className="flex-1 flex items-center gap-1">
                    {/* Nuevos registros */}
                    {m.nuevos_registros > 0 && (
                      <div className="flex items-center gap-1">
                        <div
                          className="h-5 bg-indigo-400 rounded-full"
                          style={{ width: `${Math.max(registrosPct, 2)}px`, minWidth: 4 }}
                        />
                        <span className="text-[10px] text-indigo-600 font-medium">
                          {m.nuevos_registros} reg.
                        </span>
                      </div>
                    )}
                    {/* Lecciones */}
                    {m.lecciones_completadas > 0 && (
                      <div className="flex items-center gap-1 ml-1">
                        <div
                          className="h-5 bg-emerald-400 rounded-full"
                          style={{ width: `${Math.max(leccionesPct, 2)}px`, minWidth: 4 }}
                        />
                        <span className="text-[10px] text-emerald-600 font-medium">
                          {m.lecciones_completadas} lec.
                        </span>
                      </div>
                    )}
                    {total === 0 && (
                      <span className="text-[10px] text-gray-300">—</span>
                    )}
                  </div>
                </div>
              )
            })}
            <div className="flex items-center gap-4 pt-2 border-t border-gray-100">
              <span className="flex items-center gap-1 text-[10px] text-gray-500">
                <span className="w-3 h-3 bg-indigo-400 rounded-full inline-block" />
                Nuevos registros
              </span>
              <span className="flex items-center gap-1 text-[10px] text-gray-500">
                <span className="w-3 h-3 bg-emerald-400 rounded-full inline-block" />
                Lecciones completadas
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ── Uso por aplicación ── */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Usuarios únicos por app */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded bg-violet-100 text-violet-600 text-xs">
              👤
            </span>
            Usuarios únicos por aplicación
          </h3>
          {stats.appsUsage.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">
              No hay datos de uso todavía.
            </p>
          ) : (
            <BarChart
              data={stats.appsUsage.map((a) => ({
                label: a.application_nombre,
                value: a.usuarios_unicos,
              }))}
              maxValue={Math.max(...stats.appsUsage.map((a) => a.usuarios_unicos), 1)}
              colorClass="bg-violet-400"
            />
          )}
        </div>

        {/* Lecciones completadas por app */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded bg-emerald-100 text-emerald-600 text-xs">
              ✅
            </span>
            Lecciones completadas por aplicación
          </h3>
          {stats.appsUsage.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">
              No hay datos de uso todavía.
            </p>
          ) : (
            <BarChart
              data={stats.appsUsage.map((a) => ({
                label: a.application_nombre,
                value: a.lecciones_completadas,
              }))}
              maxValue={maxLecciones}
              colorClass="bg-emerald-400"
            />
          )}
        </div>
      </div>

      {/* ── Tabla detallada de apps ── */}
      {stats.appsUsage.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-700">
              📋 Detalle por aplicación
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Aplicación
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Tipo
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Usuarios únicos
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Lecciones completadas
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    % Adopción
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {stats.appsUsage.map((app) => {
                  const adopcionPct =
                    stats.totalCiudadanos > 0
                      ? Math.round(
                          (app.usuarios_unicos / stats.totalCiudadanos) * 100,
                        )
                      : 0

                  return (
                    <tr
                      key={app.application_id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <p className="text-sm font-medium text-gray-900">
                          {app.application_nombre}
                        </p>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                          {app.application_tipo}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <span className="text-sm font-mono text-gray-700">
                          {app.usuarios_unicos}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <span className="text-sm font-mono text-gray-700">
                          {app.lecciones_completadas}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-indigo-400 rounded-full"
                              style={{ width: `${Math.min(adopcionPct, 100)}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-500 w-8 text-right">
                            {adopcionPct}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Demografía ── */}
      <DemographicStats municipioId={municipioId} />
    </div>
  )
}
