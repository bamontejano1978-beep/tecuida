import Link from 'next/link'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import LandingPreviewButton from '@/components/ui/landing-preview-button'
import { getAdminAccess } from '@/lib/admin/activities'
import { createAdminClient } from '@/lib/supabase/server'
import { getMunicipioLandingUrl } from '@/lib/tenant/landing'
import MunicipalAppearanceForm, {
  type MunicipalAppearanceData,
} from './municipal-appearance-form'

interface MunicipalityRow {
  id: string
  slug: string
  dominio: string | null
  nombre_municipio: string
  nombre_ayuntamiento: string
  colores_corporativos: {
    primary: string
    secondary: string
    accent: string
    background?: string
    text?: string
  }
  hero_image_url: string | null
  escudo_url: string | null
  logo_url: string | null
  layout_variant: 'classic' | 'editorial'
  textos_institucionales: MunicipalAppearanceData['textos_institucionales'] | null
}

export default async function MunicipalAppearancePage() {
  const access = await getAdminAccess()
  if (!access) redirect('/login?error=unauthorized')
  if (access.is_superadmin || !access.municipality_id) redirect('/admin')

  const supabase = createAdminClient()
  const { data: municipality } = await supabase
    .from('municipalities')
    .select(
      `id, slug, dominio, nombre_municipio, nombre_ayuntamiento,
       colores_corporativos, hero_image_url, escudo_url, logo_url,
       layout_variant, textos_institucionales`,
    )
    .eq('id', access.municipality_id)
    .eq('oculto_admin', false)
    .single()

  if (!municipality) redirect('/login?error=unauthorized')

  const row = municipality as unknown as MunicipalityRow
  const landingUrl = getMunicipioLandingUrl(
    { slug: row.slug, dominio: row.dominio },
    headers().get('host'),
  )

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <Link
        href="/municipio/estadisticas"
        className="text-sm font-medium text-emerald-700 hover:text-emerald-600"
      >
        ← Volver a estadísticas
      </Link>

      <div className="mb-8 mt-3 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Apariencia municipal
          </h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-gray-500">
            Personaliza la identidad visual, los textos y el diseño de la
            landing pública. El escudo y el nombre municipal también se usan en
            la lanzadera instalada por la ciudadanía.
          </p>
        </div>

        <LandingPreviewButton href={landingUrl} label="Ver landing pública" />
      </div>

      <MunicipalAppearanceForm
        landingUrl={landingUrl}
        municipality={{
          slug: row.slug,
          nombre_municipio: row.nombre_municipio,
          nombre_ayuntamiento: row.nombre_ayuntamiento,
          colores_corporativos: row.colores_corporativos,
          hero_image_url: row.hero_image_url,
          escudo_url: row.escudo_url,
          logo_url: row.logo_url,
          layout_variant: row.layout_variant || 'classic',
          textos_institucionales: row.textos_institucionales || {},
        }}
      />
    </div>
  )
}
