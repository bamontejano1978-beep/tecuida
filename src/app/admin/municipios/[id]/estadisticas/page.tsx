/**
 * Admin — Estadísticas del municipio
 *
 * Server Component que muestra métricas detalladas de uso
 * para un municipio específico. Solo accesible por superadmins
 * (protegido por el AdminLayout).
 */

import { createAdminClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import MunicipalityStats from '@/components/admin/municipality-stats'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface MunicipioStatsPageProps {
  params: { id: string }
}

// ---------------------------------------------------------------------------
// Página
// ---------------------------------------------------------------------------

export default async function MunicipioStatsPage({
  params,
}: MunicipioStatsPageProps) {
  // Verificar que el municipio existe
  const supabase = createAdminClient()
  const { data: municipio } = await supabase
    .from('municipalities')
    .select('nombre_municipio, slug')
    .eq('id', params.id)
    .eq('oculto_admin', false)
    .single()

  if (!municipio) {
    notFound()
  }

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-2">
          <Link
            href={`/admin/municipios/${params.id}`}
            className="text-sm font-medium text-indigo-600 hover:text-indigo-500 transition-colors"
          >
            ← Volver a {municipio.nombre_municipio}
          </Link>
          <span className="text-gray-300">|</span>
          <Link
            href="/admin/municipios"
            className="text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors"
          >
            Todos los municipios
          </Link>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">
          📊 Estadísticas — {municipio.nombre_municipio}
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Métricas de uso, adopción y actividad · Datos agregados y anónimos
          (RGPD compliant)
        </p>
      </div>

      {/* Contenido */}
      <MunicipalityStats municipioId={params.id} />
    </div>
  )
}
