/**
 * Municipio Estadísticas — Panel de métricas para el gestor municipal
 *
 * Server Component que:
 *   1. Obtiene el usuario autenticado (ya validado por el layout)
 *   2. Si es admin_municipio: usa su municipality_id directamente
 *   3. Si es superadmin: permite elegir municipio vía searchParam
 *   4. Renderiza MunicipalityStats con los datos de ese municipio
 *
 * Acceso: solo admin_municipio (ve su municipio) o superadmin (elige).
 */

import { redirect } from 'next/navigation'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import Link from 'next/link'
import MunicipalityStats from '@/components/admin/municipality-stats'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface MunicipioStatsPageProps {
  searchParams: Record<string, string | string[] | undefined>
}

// ---------------------------------------------------------------------------
// Página
// ---------------------------------------------------------------------------

export default async function MunicipioStatsPage({
  searchParams,
}: MunicipioStatsPageProps) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const adminClient = createAdminClient()
  const { data: userRow } = await adminClient
    .from('users')
    .select('id, rol, municipality_id, municipality:municipalities!inner(nombre_municipio)')
    .eq('id', user.id)
    .single()

  if (!userRow) {
    redirect('/login?error=unauthorized')
  }

  const rol = userRow.rol as string
  const isSuperadmin = rol === 'superadmin'
  const isMunicipioAdmin = rol === 'admin_municipio'

  if (!isSuperadmin && !isMunicipioAdmin) {
    redirect('/login?error=unauthorized')
  }

  // Resolver el municipio a mostrar
  let municipioId: string
  let municipioNombre: string

  if (isMunicipioAdmin) {
    // El admin municipal siempre ve su propio municipio
    municipioId = userRow.municipality_id as string
    municipioNombre = (userRow.municipality as unknown as { nombre_municipio: string })?.nombre_municipio || 'Tu municipio'
  } else {
    // Superadmin: puede elegir municipio
    const selectedId = typeof searchParams['municipio'] === 'string' ? searchParams['municipio'] : null

    if (!selectedId) {
      // Sin municipio seleccionado: mostrar selector
      const { data: municipalities } = await adminClient
        .from('municipalities')
        .select('id, nombre_municipio, slug')
        .eq('oculto_admin', false)
        .neq('slug', 'platform')
        .order('nombre_municipio', { ascending: true })

      return (
        <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900">
              📊 Estadísticas por municipio
            </h1>
            <p className="mt-2 text-sm text-gray-500">
              Como superadmin, selecciona el municipio del que quieres ver las estadísticas.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(municipalities || []).map((m) => (
              <Link
                key={m.id}
                href={`/municipio/estadisticas?municipio=${m.id}`}
                className="block rounded-xl border border-gray-200 bg-white p-6 hover:shadow-md hover:border-indigo-200 transition-all"
              >
                <h3 className="text-sm font-semibold text-gray-900">
                  {m.nombre_municipio}
                </h3>
                <p className="mt-1 text-xs text-gray-400 font-mono">{m.slug}</p>
                <span className="mt-3 inline-flex items-center text-xs font-medium text-indigo-600">
                  Ver estadísticas →
                </span>
              </Link>
            ))}
          </div>

          <div className="mt-8 text-center">
            <Link
              href="/admin"
              className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              ← Volver al panel admin
            </Link>
          </div>
        </div>
      )
    }

    municipioId = selectedId

    // Obtener nombre del municipio seleccionado
    const { data: selectedMun } = await adminClient
      .from('municipalities')
      .select('nombre_municipio')
      .eq('id', municipioId)
      .single()

    municipioNombre = selectedMun?.nombre_municipio || 'Municipio'
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Breadcrumbs */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-2">
          {isSuperadmin && (
            <>
              <Link
                href="/municipio/estadisticas"
                className="text-sm font-medium text-indigo-600 hover:text-indigo-500 transition-colors"
              >
                ← Elegir otro municipio
              </Link>
              <span className="text-gray-300">|</span>
              <Link
                href="/admin"
                className="text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors"
              >
                Panel admin
              </Link>
            </>
          )}
          {isMunicipioAdmin && (
            <span className="text-sm text-gray-400">
              Panel de {municipioNombre}
            </span>
          )}
        </div>
        <h1 className="text-2xl font-bold text-gray-900">
          📊 Estadísticas — {municipioNombre}
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Métricas de uso, adopción y actividad · Datos agregados y anónimos
          (RGPD compliant)
        </p>
      </div>

      {/* Contenido */}
      <MunicipalityStats municipioId={municipioId} />
    </div>
  )
}
