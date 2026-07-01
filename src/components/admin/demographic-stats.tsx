/**
 * DemographicStats — Estadísticas demográficas RGPD para el panel admin
 *
 * Server Component que consulta las columnas genero y anio_nacimiento
 * de public.users y muestra:
 *   1. Distribución por género (barras horizontales)
 *   2. Distribución por franjas etarias (barras horizontales)
 *   3. Filtro por municipio (select → form GET)
 *
 * Los datos son agregados — nunca se muestra PII individual.
 * Cumple RGPD: los datos se anonimizan en el agregado.
 */

import { createAdminClient } from '@/lib/supabase/server'
import Link from 'next/link'

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

interface GenderCount {
  label: string
  value: string
  count: number
}

interface AgeRangeCount {
  label: string
  min: number
  max: number
  count: number
}

interface MunicipalityOption {
  id: string
  slug: string
  nombre: string
}

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------

const GENDER_LABELS: Record<string, string> = {
  hombre: 'Hombre',
  mujer: 'Mujer',
  no_binario: 'No binario',
}

const GENDER_COLORS: Record<string, string> = {
  hombre: '#3b82f6',
  mujer: '#ec4899',
  no_binario: '#8b5cf6',
}

const AGE_RANGES: { label: string; min: number; max: number; color: string }[] = [
  { label: '18-24', min: 18, max: 24, color: '#3b82f6' },
  { label: '25-34', min: 25, max: 34, color: '#06b6d4' },
  { label: '35-44', min: 35, max: 44, color: '#10b981' },
  { label: '45-54', min: 45, max: 54, color: '#f59e0b' },
  { label: '55-64', min: 55, max: 64, color: '#f97316' },
  { label: '65+', min: 65, max: 200, color: '#6366f1' },
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Calcula la edad actual a partir del año de nacimiento */
function calcularEdad(anioNacimiento: number): number {
  return new Date().getFullYear() - anioNacimiento
}

/** Construye la query de usuarios con filtro opcional de municipio */
function buildUserQuery(supabase: ReturnType<typeof createAdminClient>, municipioId?: string) {
  let query = supabase
    .from('users')
    .select('id, genero, anio_nacimiento, municipality_id')
    .not('genero', 'is', null)
    .not('anio_nacimiento', 'is', null)

  if (municipioId) {
    query = query.eq('municipality_id', municipioId)
  }

  return query
}

// ---------------------------------------------------------------------------
// Subcomponente: Barra horizontal
// ---------------------------------------------------------------------------

function HorizontalBar({
  label,
  count,
  total,
  color,
  maxWidth = 280,
}: {
  label: string
  count: number
  total: number
  color: string
  maxWidth?: number
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0
  const width = total > 0 ? Math.max(4, Math.round((count / total) * maxWidth)) : 0

  return (
    <div className="flex items-center gap-3">
      <span className="w-24 shrink-0 text-xs text-gray-600 text-right">{label}</span>
      <div className="flex-1 flex items-center gap-2 min-w-0">
        <div className="h-5 rounded-full transition-all duration-500" style={{ width, backgroundColor: color, minWidth: width > 0 ? 4 : 0 }} />
        <span className="text-xs font-mono text-gray-500 shrink-0">
          {count} <span className="text-gray-400">({pct}%)</span>
        </span>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface DemographicStatsProps {
  /** ID del municipio para filtrar (undefined = todos) */
  municipioId?: string
}

// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------

export default async function DemographicStats({ municipioId }: DemographicStatsProps) {
  const supabase = createAdminClient()

  // ── 1. Obtener lista de municipios para el filtro ──
  const { data: municipalities } = await supabase
    .from('municipalities')
    .select('id, slug, nombre_municipio')
    .eq('oculto_admin', false)
    .order('nombre_municipio', { ascending: true })

  const munList: MunicipalityOption[] = (municipalities || []).map((m) => ({
    id: m.id,
    slug: m.slug,
    nombre: m.nombre_municipio,
  }))

  // ── 2. Obtener usuarios con datos demográficos ──
  const { data: users, error } = await buildUserQuery(supabase, municipioId)

  if (error) {
    return (
      <div className="rounded-lg bg-red-50 border border-red-200 p-4">
        <p className="text-sm text-red-700">
          Error al cargar estadísticas demográficas: {error.message}
        </p>
      </div>
    )
  }

  const allUsers = (users || []) as unknown as { id: string; genero: string | null; anio_nacimiento: number | null; municipality_id: string }[]

  // La query ya excluye nulls con .not('is', null) — no necesitamos filtrar en JS
  const usersWithData = allUsers

  // ── 3. Conteo por género ──
  const genderCounts = new Map<string, number>()
  for (const u of usersWithData) {
    const g = u.genero!
    genderCounts.set(g, (genderCounts.get(g) || 0) + 1)
  }

  // Ordenar: hombre, mujer, no_binario
  const genderOrder = ['hombre', 'mujer', 'no_binario']
  const genderData: GenderCount[] = genderOrder
    .filter((g) => genderCounts.has(g))
    .map((g) => ({ label: GENDER_LABELS[g] || g, value: g, count: genderCounts.get(g)! }))

  const genderTotal = genderData.reduce((sum, g) => sum + g.count, 0)

  // ── 4. Conteo por franjas etarias ──
  const ageCounts = new Map<string, number>()
  const currentYear = new Date().getFullYear()
  for (const u of usersWithData) {
    const edad = calcularEdad(u.anio_nacimiento!)
    const range = AGE_RANGES.find((r) => edad >= r.min && edad <= r.max)
    // Fallback: cualquier edad fuera de rango (p.ej. año < 1900 por datos legacy)
    // se asigna a "65+" en vez de descartarse silenciosamente
    const key = range ? range.label : '65+'
    ageCounts.set(key, (ageCounts.get(key) || 0) + 1)
  }

  const ageData: AgeRangeCount[] = AGE_RANGES.map((r) => ({
    label: r.label,
    min: r.min,
    max: r.max,
    count: ageCounts.get(r.label) || 0,
  }))

  const ageTotal = ageData.reduce((sum, a) => sum + a.count, 0)

  // ── 5. Municipio seleccionado ──
  const selectedMun = municipioId
    ? munList.find((m) => m.id === municipioId)
    : null

  // ── 6. Renderizar ──
  return (
    <section className="space-y-6">
      {/* Cabecera + filtro */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-gray-900">
            📊 Estadísticas demográficas
          </h2>
          <p className="mt-1 text-xs text-gray-500">
            Basado en datos opcionales de género y edad ({usersWithData.length} de {allUsers.length} usuarios). Datos agregados y anónimos — RGPD compliant.
            {selectedMun && (
              <span className="ml-1 text-indigo-600 font-medium">
                · Filtrando: {selectedMun.nombre}
              </span>
            )}
          </p>
        </div>

        {/* Filtro por municipio */}
        <form method="GET" action="/admin" className="flex items-center gap-2">
          <select
            name="municipio"
            defaultValue={municipioId || ''}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="">Todos los municipios</option>
            {munList.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nombre}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 transition-colors"
          >
            Filtrar
          </button>
          {municipioId && (
            <Link
              href="/admin"
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
            >
              ✕ Quitar filtro
            </Link>
          )}
        </form>
      </div>

      {/* Sin datos */}
      {usersWithData.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center">
          <svg className="mx-auto h-10 w-10 text-gray-300" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
          </svg>
          <p className="mt-4 text-sm font-medium text-gray-500">
            Sin datos demográficos
          </p>
          <p className="mt-1 text-xs text-gray-400">
            {municipioId
              ? 'Los usuarios de este municipio aún no han compartido sus datos de género y edad.'
              : 'Ningún usuario ha compartido sus datos de género y edad todavía.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* ── Género ── */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded bg-pink-100 text-pink-600 text-xs">♀♂</span>
              Distribución por género
            </h3>
            <div className="space-y-3">
              {genderData.map((g) => (
                <HorizontalBar
                  key={g.value}
                  label={g.label}
                  count={g.count}
                  total={genderTotal}
                  color={GENDER_COLORS[g.value] || '#9ca3af'}
                />
              ))}
            </div>
            <p className="mt-4 text-xs text-gray-400">
              Total: {genderTotal} {genderTotal === 1 ? 'respuesta' : 'respuestas'}
            </p>
          </div>

          {/* ── Edad ── */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded bg-amber-100 text-amber-600 text-xs">📅</span>
              Distribución por franjas etarias
            </h3>
            <div className="space-y-3">
              {ageData.map((a) => (
                <HorizontalBar
                  key={a.label}
                  label={a.label}
                  count={a.count}
                  total={ageTotal}
                  color={AGE_RANGES.find((r) => r.label === a.label)?.color || '#9ca3af'}
                />
              ))}
            </div>
            <p className="mt-4 text-xs text-gray-400">
              Total: {ageTotal} {ageTotal === 1 ? 'respuesta' : 'respuestas'}
            </p>
          </div>
        </div>
      )}
    </section>
  )
}
