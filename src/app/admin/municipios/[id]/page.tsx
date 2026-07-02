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
import LandingPreviewButton from '@/components/ui/landing-preview-button'
import GestoresMunicipio from '@/components/admin/gestores-municipio'

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
    logo_url: (data.logo_url as string) || null,
    email_contacto: (data.email_contacto as string) || null,
    telefono_contacto: (data.telefono_contacto as string) || null,
    textos_institucionales: {
      bienvenida: (data.textos_institucionales as Record<string, unknown>)?.bienvenida as string || '',
      descripcion: (data.textos_institucionales as Record<string, unknown>)?.descripcion as string || '',
      pie_pagina: (data.textos_institucionales as Record<string, unknown>)?.pie_pagina as string || '',
      stats_titulo: (data.textos_institucionales as Record<string, unknown>)?.stats_titulo as string || '',
      stats_subtitulo: (data.textos_institucionales as Record<string, unknown>)?.stats_subtitulo as string || '',
      programas_titulo: (data.textos_institucionales as Record<string, unknown>)?.programas_titulo as string || '',
      programas_subtitulo: (data.textos_institucionales as Record<string, unknown>)?.programas_subtitulo as string || '',
      cta_titulo: (data.textos_institucionales as Record<string, unknown>)?.cta_titulo as string || '',
      cta_texto: (data.textos_institucionales as Record<string, unknown>)?.cta_texto as string || '',
    },
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
          <Link
            href={`/admin/municipios/${params.id}/estadisticas`}
            className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-violet-500 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
            </svg>
            Ver estadísticas
          </Link>
          <LandingPreviewButton
            href={landingUrl}
            label="Ver landing pública"
          />
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

      {/* ── Gestores municipales ── */}
      <div className="mt-8">
        <GestoresMunicipio municipioId={params.id} />
      </div>
    </div>
  )
}
