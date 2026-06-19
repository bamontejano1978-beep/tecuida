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
import { headers } from 'next/headers'
import EditMunicipioForm from './edit-form'
import { getMunicipioLandingUrl, cleanHostname } from '@/lib/tenant/landing'

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
    .eq('oculto_admin', false)
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
    estado_suscripcion: data.estado_suscripcion as string,
    hero_image_url: (data.hero_image_url as string) || null,
    escudo_url: (data.escudo_url as string) || null,
    created_at: data.created_at as string,
  }

  const currentHost = headers().get('host')
  const landingUrl = getMunicipioLandingUrl(
    { slug: municipio.slug, dominio: municipio.dominio },
    currentHost,
  )

  // En producción la URL coincide con el dominio mostrado arriba; solo
  // resaltamos la URL computada cuando aporta algo distinto (caso dev).
  // Comparamos sobre el host normalizado (la misma limpieza que aplica
  // el helper) para que el span siga oculto si alguien pegase
  // `https://` en el campo `dominio` en el futuro.
  const showResolvedUrl =
    !!municipio.dominio &&
    landingUrl !== `https://${cleanHostname(municipio.dominio)}`

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
        <div className="mt-4 flex items-center gap-3">
          <a
            href={landingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 transition-colors"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              aria-hidden="true"
              focusable="false"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
              />
            </svg>
            Ver landing pública
          </a>
          {showResolvedUrl && (
            <span
              className="text-xs text-gray-400 font-mono truncate max-w-[280px]"
              title={landingUrl}
            >
              ({landingUrl})
            </span>
          )}
        </div>
      </div>

      <EditMunicipioForm municipio={municipio} />
    </div>
  )
}
