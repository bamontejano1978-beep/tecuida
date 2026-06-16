/**
 * Admin — Crear aplicación (catálogo global)
 *
 * Server Component que carga las categorías disponibles y
 * renderiza el formulario de creación como Client Component.
 * El form hace POST a /api/admin/applications.
 *
 * Requisitos: 10.1, 14.1
 */

import { createAdminClient } from '@/lib/supabase/server'
import Link from 'next/link'
import CreateApplicationForm from './create-form'

interface CategoryOption {
  id: string
  nombre: string
}

export default async function CrearAplicacionPage() {
  const supabase = createAdminClient()
  const { data: categories } = await supabase
    .from('categories')
    .select('id, nombre')
    .order('orden', { ascending: true })

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
          Nueva aplicación
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Añade una nueva aplicación al catálogo global. Estará disponible
          para asignarla a municipios desde su ficha o en Modo Bulk.
        </p>
      </div>

      <CreateApplicationForm categories={categoriesList} />
    </div>
  )
}
