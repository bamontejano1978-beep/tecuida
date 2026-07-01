/**
 * Admin — Gestión de categorías
 *
 * Server Component que carga las categorías y renderiza el
 * componente cliente de gestión (lista + inline create/edit).
 *
 * Requisitos: 10.1, 14.1
 */

import { createAdminClient } from '@/lib/supabase/server'
import Link from 'next/link'
import CategoryManager from './category-manager'

export interface AdminCategory {
  id: string
  nombre: string
  descripcion: string | null
  icono_url: string | null
  orden: number
}

export default async function CategoriasPage() {
  const supabase = createAdminClient()
  const { data: categories } = await supabase
    .from('categories')
    .select('id, nombre, descripcion, icono_url, orden')
    .order('orden', { ascending: true })

  const cats: AdminCategory[] = ((categories || []) as unknown as AdminCategory[])

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8 max-w-3xl">
      <div className="mb-8">
        <Link
          href="/admin"
          className="text-sm font-medium text-indigo-600 hover:text-indigo-500 transition-colors"
        >
          ← Volver al dashboard
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">Categorías</h1>
        <p className="mt-1 text-sm text-gray-500">
          Gestiona las categorías del catálogo de aplicaciones. Las categorías
          agrupan las apps en la landing page de cada municipio.
        </p>
      </div>

      <CategoryManager initialCategories={cats} />
    </div>
  )
}
