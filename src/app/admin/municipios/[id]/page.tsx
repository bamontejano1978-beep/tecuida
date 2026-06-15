/**
 * Admin — Editar municipio
 *
 * Server Component que carga los datos del municipio y los
 * muestra en un formulario de edición.
 *
 * Requisitos: 10.1, 10.2
 */

import { createAdminClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import EditMunicipioForm from './edit-form'

// ---------------------------------------------------------------------------
// Página
// ---------------------------------------------------------------------------

interface EditMunicipioPageProps {
  params: { id: string }
}

export default async function EditMunicipioPage({ params }: EditMunicipioPageProps) {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('municipalities')
    .select('*')
    .eq('id', params.id)
    .single()

  if (error || !data) {
    notFound()
  }

  const municipio = {
    id: data.id as string,
    slug: data.slug as string,
    nombre_municipio: data.nombre_municipio as string,
    nombre_ayuntamiento: data.nombre_ayuntamiento as string,
    dominio: data.dominio as string,
    colores_corporativos: data.colores_corporativos as {
      primary: string
      secondary: string
      accent: string
    },
    tipo_suscripcion: data.tipo_suscripcion as string,
    estado_suscripcion: data.estado_suscripcion as string,
    created_at: data.created_at as string,
  }

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8 max-w-2xl">
      <div className="mb-8">
        <Link
          href="/admin/municipios"
          className="text-sm font-medium text-indigo-600 hover:text-indigo-500 transition-colors"
        >
          ← Volver a municipios
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">
          Editar: {municipio.nombre_municipio}
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Dominio: {municipio.dominio} · Slug: {municipio.slug}
        </p>
      </div>

      <EditMunicipioForm municipio={municipio} />
    </div>
  )
}
