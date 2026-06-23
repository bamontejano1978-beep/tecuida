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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function normalize(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

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

  // Búsqueda por nombre
  const [searchQuery, setSearchQuery] = useState('')

  // Filtrar aplicaciones por categoría seleccionada + búsqueda
  const filteredApps = useMemo(() => {
    let result = apps
    if (selectedCategory) {
      result = result.filter((app) => app.categoria_id === selectedCategory)
    }
    const q = normalize(searchQuery.trim())
    if (q) {
      result = result.filter((app) =>
        normalize(app.nombre).includes(q),
      )
    }
    return result
  }, [apps, selectedCategory, searchQuery])

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
      {/* Filtros + Búsqueda */}
      <div className="mb-8 space-y-4">
        <CategoryFilter
          categories={categoriesWithDynamicCounts}
          selected={selectedCategory}
          onSelect={setSelectedCategory}
          primaryColor={primaryColor}
        />
        {/* Barra de búsqueda */}
        <div className="relative max-w-sm">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar aplicaciones…"
            className="block w-full rounded-lg border border-gray-300 pl-10 pr-4 py-2 text-sm shadow-sm placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
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
            {searchQuery.trim()
              ? 'No hay aplicaciones que coincidan con tu búsqueda.'
              : 'No hay aplicaciones en esta categoría.'}
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
