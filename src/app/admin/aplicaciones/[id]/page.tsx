/**
 * Admin — Editar aplicación (catálogo global)
 *
 * Server Component que carga la app por id y las categorías,
 * y renderiza el form de edición como Client Component.
 *
 * Requisitos: 10.1, 14.1
 */

import { createAdminClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import EditApplicationForm from './edit-form'

interface EditApplicationPageProps {
  params: { id: string }
}

interface CategoryOption {
  id: string
  nombre: string
}

export default async function EditApplicationPage({
  params,
}: EditApplicationPageProps) {
  const supabase = createAdminClient()

  // Cargamos app + categorías en paralelo (la app es crítica;
  // las categorías son leves).
  const [
    { data: app, error: appError },
    { data: categories },
  ] = await Promise.all([
    supabase
      .from('applications')
      .select('*')
      .eq('id', params.id)
      .single(),
    supabase
      .from('categories')
      .select('id, nombre')
      .order('orden', { ascending: true }),
  ])

  if (appError || !app) {
    notFound()
  }

  const categoriesList: CategoryOption[] = (
    (categories || []) as unknown as Array<{ id: string; nombre: string }>
  ).map((c) => ({ id: c.id, nombre: c.nombre }))

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8 max-w-2xl">
      <div className="mb-8">
        <Link
          href="/admin/aplicaciones"
          className="text-sm font-medium text-indigo-600 hover:text-indigo-500 transition-colors"
        >
          ← Volver a aplicaciones
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">
          Editar aplicación
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          <span className="font-medium text-gray-700">{app.nombre}</span>{' '}
          · {app.id.slice(0, 8)}…
        </p>
      </div>

      <EditApplicationForm
        application={{
          id: app.id as string,
          nombre: app.nombre as string,
          descripcion: app.descripcion as string,
          category_id: app.category_id as string,
          thumbnail_url: (app.thumbnail_url as string | null) ?? '',
          tipo: app.tipo as
            | 'programa'
            | 'herramienta'
            | 'encuesta'
            | 'recurso',
          instrucciones: (app.instrucciones as string) || null,
          url_acceso: (app.url_acceso as string) || null,
          activa: app.activa as boolean,
        }}
        categories={categoriesList}
      />
    </div>
  )
}
