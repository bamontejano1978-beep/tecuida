/**
 * CategoryFilter — Píldoras de filtrado por categoría
 *
 * Client Component que muestra las categorías como píldoras horizontales.
 * La categoría seleccionada se resalta con el color primario del tenant.
 *
 * Props:
 *   - categories: lista de { id, nombre, count? }
 *   - selected: id de la categoría activa (null = todas)
 *   - onSelect: callback al hacer clic en una categoría
 *   - primaryColor: color primario del tenant (opcional)
 */

'use client'

interface Category {
  id: string
  nombre: string
  count?: number
}

interface CategoryFilterProps {
  categories: Category[]
  selected: string | null
  onSelect: (id: string | null) => void
  primaryColor?: string
}

export default function CategoryFilter({
  categories,
  selected,
  onSelect,
  primaryColor = '#4f46e5',
}: CategoryFilterProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {/* Opción "Todas" */}
      <button
        type="button"
        onClick={() => onSelect(null)}
        className="inline-flex items-center rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1"
        style={
          selected === null
            ? {
                backgroundColor: primaryColor,
                color: '#ffffff',
                boxShadow: `0 2px 4px ${primaryColor}40`,
              }
            : {
                backgroundColor: '#f3f4f6',
                color: '#374151',
              }
        }
      >
        Todas
      </button>

      {categories.map((cat) => (
        <button
          key={cat.id}
          type="button"
          onClick={() => onSelect(cat.id)}
          className="inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1"
          style={
            selected === cat.id
              ? {
                  backgroundColor: primaryColor,
                  color: '#ffffff',
                  boxShadow: `0 2px 4px ${primaryColor}40`,
                }
              : {
                  backgroundColor: '#f3f4f6',
                  color: '#374151',
                }
          }
        >
          {cat.nombre}
          {cat.count !== undefined && (
            <span
              className="inline-flex items-center justify-center rounded-full px-1.5 py-0 text-xs"
              style={
                selected === cat.id
                  ? { backgroundColor: 'rgba(255,255,255,0.25)' }
                  : { backgroundColor: '#e5e7eb' }
              }
            >
              {cat.count}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}
