import Link from 'next/link'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import LandingPreviewButton from '@/components/ui/landing-preview-button'
import { getAdminAccess } from '@/lib/admin/activities'
import { createAdminClient } from '@/lib/supabase/server'
import { getMunicipioLandingUrl } from '@/lib/tenant/landing'
import MunicipalApplicationsManager, {
  type MunicipalApplicationItem,
  type PublicationStatus,
} from './municipal-applications-manager'

interface MunicipalityRow {
  id: string
  nombre_municipio: string
  slug: string
  dominio: string | null
}

interface CategoryRow {
  id: string
  nombre: string
}

interface AssignmentRow {
  application_id: string
  publication_status: PublicationStatus | null
  published_at: string | null
  hidden_at: string | null
  thumbnail_url_override: string | null
  application: {
    id: string
    nombre: string
    descripcion: string
    thumbnail_url: string | null
    tipo: string
    category_id: string | null
  } | null
}

export default async function MunicipalApplicationsPage() {
  const access = await getAdminAccess()
  if (!access) redirect('/login?error=unauthorized')
  if (access.is_superadmin || !access.municipality_id) redirect('/admin')

  const municipalityId = access.municipality_id
  const supabase = createAdminClient()

  const [{ data: municipality }, { data: assignments }, { data: categories }] =
    await Promise.all([
      supabase
        .from('municipalities')
        .select('id, nombre_municipio, slug, dominio')
        .eq('id', municipalityId)
        .eq('oculto_admin', false)
        .single(),
      supabase
        .from('municipality_applications')
        .select(
          `
          application_id,
          publication_status,
          published_at,
          hidden_at,
          thumbnail_url_override,
          application:applications!inner (
            id,
            nombre,
            descripcion,
            thumbnail_url,
            tipo,
            category_id
          )
        `,
        )
        .eq('municipality_id', municipalityId)
        .eq('activa', true),
      supabase.from('categories').select('id, nombre'),
    ])

  if (!municipality) redirect('/login?error=unauthorized')

  const municipalityRow = municipality as unknown as MunicipalityRow
  const categoryNames = new Map(
    ((categories || []) as unknown as CategoryRow[]).map((category) => [
      category.id,
      category.nombre,
    ]),
  )

  const statusOrder: Record<PublicationStatus, number> = {
    disponible: 0,
    publicada: 1,
    oculta: 2,
  }

  const apps = ((assignments || []) as unknown as AssignmentRow[])
    .filter((row) => row.application)
    .map((row): MunicipalApplicationItem => {
      const app = row.application!
      return {
        application_id: row.application_id,
        publication_status: row.publication_status || 'disponible',
        published_at: row.published_at,
        hidden_at: row.hidden_at,
        thumbnail_url_override: row.thumbnail_url_override,
        application: app,
        categoryName:
          (app.category_id && categoryNames.get(app.category_id)) ||
          'Sin categoría',
      }
    })
    .sort((a, b) => {
      const byStatus =
        statusOrder[a.publication_status] - statusOrder[b.publication_status]
      if (byStatus !== 0) return byStatus
      return a.application.nombre.localeCompare(b.application.nombre, 'es')
    })

  const landingUrl = getMunicipioLandingUrl(
    { slug: municipalityRow.slug, dominio: municipalityRow.dominio },
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
            Aplicaciones municipales
          </h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-gray-500">
            Decide qué aplicaciones aparecen en la landing pública de{' '}
            {municipalityRow.nombre_municipio}. Las aplicaciones pendientes u
            ocultas siguen asignadas al municipio, pero no se muestran a la
            ciudadanía.
          </p>
        </div>

        <LandingPreviewButton href={landingUrl} label="Ver landing pública" />
      </div>

      <div className="mb-6 rounded-xl border border-indigo-100 bg-indigo-50 p-4">
        <p className="text-sm font-semibold text-indigo-900">
          Flujo recomendado
        </p>
        <p className="mt-1 text-sm leading-6 text-indigo-800">
          TE CUIDA entrega nuevas aplicaciones al municipio. El gestor municipal
          las revisa aquí y decide cuándo publicarlas. Si una aplicación ya no
          interesa en un momento concreto, puede ocultarla sin perderla.
        </p>
      </div>

      <MunicipalApplicationsManager initialApps={apps} />
    </div>
  )
}
