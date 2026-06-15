/**
 * Admin — Modo Bulk: Asignar una aplicación a múltiples municipios
 *
 * Server Component que carga todas las apps y municipios,
 * y pasa los datos a un Client Component interactivo.
 */

import { createAdminClient } from '@/lib/supabase/server'
import Link from 'next/link'
import BulkAssignForm from './bulk-assign-form'

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

interface AppRow {
  id: string
  nombre: string
  tipo: string
  nivel_suscripcion: string
}

interface MunicipalityRow {
  id: string
  nombre_municipio: string
  slug: string
  tipo_suscripcion: string
}

interface CurrentAssignment {
  municipality_id: string
  application_id: string
}

// ---------------------------------------------------------------------------
// Página
// ---------------------------------------------------------------------------

export default async function BulkAssignPage() {
  const supabase = createAdminClient()

  // Cargar todas las aplicaciones activas
  const { data: apps } = await supabase
    .from('applications')
    .select('id, nombre, tipo, nivel_suscripcion')
    .eq('activa', true)
    .order('nombre')

  // Cargar todos los municipios
  const { data: municipalities } = await supabase
    .from('municipalities')
    .select('id, nombre_municipio, slug, tipo_suscripcion')
    .order('nombre_municipio')

  // Cargar TODAS las asignaciones actuales (para pre-marcar checkboxes)
  const { data: assignments } = await supabase
    .from('municipality_applications')
    .select('municipality_id, application_id')
    .eq('activa', true)

  const appsList: AppRow[] = (apps || []) as unknown as AppRow[]
  const munList: MunicipalityRow[] = (municipalities || []) as unknown as MunicipalityRow[]
  const assignmentList: CurrentAssignment[] = (assignments || []) as unknown as CurrentAssignment[]

  // Construir mapa: Record<application_id, municipality_id[]>
  const assignmentMap: Record<string, string[]> = {}
  assignmentList.forEach((a) => {
    if (!assignmentMap[a.application_id]) {
      assignmentMap[a.application_id] = []
    }
    assignmentMap[a.application_id].push(a.municipality_id)
  })

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/admin"
          className="text-sm font-medium text-indigo-600 hover:text-indigo-500 transition-colors"
        >
          ← Volver al dashboard
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">
          Modo Bulk: asignar aplicación
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Selecciona una aplicación y marca los municipios a los que quieres
          asignársela. También puedes desmarcar para quitarla.
        </p>
      </div>

      <BulkAssignForm
        apps={appsList}
        municipalities={munList}
        assignmentMap={assignmentMap}
      />
    </div>
  )
}
