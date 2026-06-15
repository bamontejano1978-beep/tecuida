/**
 * CatalogClient — Envoltorio client-side para el catálogo
 *
 * Recibe los datos ya resueltos desde el Server Component y
 * gestiona el estado de filtrado por categoría de forma interactiva.
 */

'use client'

import { useState, useMemo } from 'react'
import ApplicationCard from '@/components/catalog/application-card'
import CategoryFilter from '@/components/catalog/category-filter'
import type { Application } from '@/types'

interface Category {
  id: string
  nombre: string
  count?: number
}

interface CatalogClientProps {
  apps: Application[]
  categories: Category[]
  primaryColor: string
}

export default function CatalogClient({
  apps,
  categories,
  primaryColor,
}: CatalogClientProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  // Filtrar aplicaciones por categoría seleccionada
  const filteredApps = useMemo(() => {
    if (!selectedCategory) return apps
    return apps.filter((app) => app.categoria_id === selectedCategory)
  }, [apps, selectedCategory])

  // Actualizar conteos según la selección
  const categoriesWithDynamicCounts = useMemo(() => {
    return categories.map((cat) => ({
      ...cat,
      count: apps.filter((a) => a.categoria_id === cat.id).length,
    }))
  }, [categories, apps])

  // Buscar el nombre de la categoría para pasarlo a las cards
  const categoryNames = useMemo(() => {
    const map = new Map<string, string>()
    categories.forEach((c) => map.set(c.id, c.nombre))
    return map
  }, [categories])

  return (
    <>
      {/* Filtros */}
      <div className="mb-8">
        <CategoryFilter
          categories={categoriesWithDynamicCounts}
          selected={selectedCategory}
          onSelect={setSelectedCategory}
          primaryColor={primaryColor}
        />
      </div>

      {/* Grid de aplicaciones */}
      {filteredApps.length === 0 ? (
        <div className="text-center py-16">
          <svg
            className="mx-auto h-12 w-12 text-gray-300"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
            />
          </svg>
          <h3 className="mt-4 text-sm font-semibold text-gray-900">
            Sin resultados
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            No hay aplicaciones en esta categoría.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredApps.map((app) => (
            <ApplicationCard
              key={app.id}
              application={app}
              categoryName={categoryNames.get(app.categoria_id)}
            />
          ))}
        </div>
      )}
    </>
  )
}
