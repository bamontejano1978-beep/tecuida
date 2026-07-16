'use client'

/**
 * ActivityFilter — Filtros interactivos para la lista pública de actividades
 *
 * Estrategia:
 *   - Pills de categoría → renderizadas como <Link> que actualizan searchParams
 *     (progressive enhancement, sin JS → funciona igual).
 *   - Pills de modalidad → idem.
 *   - Búsqueda (q) → form HTML con method="GET" que navega a /actividades?q=…
 *
 * Sin useSearchParams porque estamos en un Server Component padre que pasa
 * los valores iniciales al cliente como props (currentCategoria / currentModalidad / currentQ).
 *
 * Sin estado interno: cada cambio es una navegación a una URL con parámetros.
 */

import Link from 'next/link'

interface Category {
  id: string
  nombre: string
}

interface ActivityFilterProps {
  categories: Category[]
  /** UUID actual (o undefined si no hay filtro aplicado) */
  currentCategoria?: string
  currentModalidad?: 'presencial' | 'online' | 'mixta'
  currentQ?: string
  /** Color primario del tenant para resaltar la pill activa */
  primaryColor: string
}

export default function ActivityFilter({
  categories,
  currentCategoria,
  currentModalidad,
  currentQ,
  primaryColor,
}: ActivityFilterProps) {
  return (
    <div className="space-y-5">
      {/* ── Categoría ── */}
      <div>
        <p className="text-[11px] font-extrabold uppercase tracking-[.16em] text-[#38633e] mb-2">
          Categoría
        </p>
        <div className="flex flex-wrap gap-2">
          <PillLink
            href={buildHref({ categoria: undefined, modalidad: currentModalidad, q: currentQ })}
            active={!currentCategoria}
            primaryColor={primaryColor}
          >
            Todas
          </PillLink>
          {categories.map((c) => (
            <PillLink
              key={c.id}
              href={buildHref({ categoria: c.id, modalidad: currentModalidad, q: currentQ })}
              active={currentCategoria === c.id}
              primaryColor={primaryColor}
            >
              {c.nombre}
            </PillLink>
          ))}
        </div>
      </div>

      {/* ── Modalidad ── */}
      <div>
        <p className="text-[11px] font-extrabold uppercase tracking-[.16em] text-[#38633e] mb-2">
          Modalidad
        </p>
        <div className="flex flex-wrap gap-2">
          <PillLink
            href={buildHref({ categoria: currentCategoria, modalidad: undefined, q: currentQ })}
            active={!currentModalidad}
            primaryColor={primaryColor}
            icon="📅"
          >
            Todas
          </PillLink>
          <PillLink
            href={buildHref({ categoria: currentCategoria, modalidad: 'presencial', q: currentQ })}
            active={currentModalidad === 'presencial'}
            primaryColor={primaryColor}
            icon="📍"
          >
            Presencial
          </PillLink>
          <PillLink
            href={buildHref({ categoria: currentCategoria, modalidad: 'online', q: currentQ })}
            active={currentModalidad === 'online'}
            primaryColor={primaryColor}
            icon="💻"
          >
            Online
          </PillLink>
          <PillLink
            href={buildHref({ categoria: currentCategoria, modalidad: 'mixta', q: currentQ })}
            active={currentModalidad === 'mixta'}
            primaryColor={primaryColor}
            icon="🔀"
          >
            Mixta
          </PillLink>
        </div>
      </div>

      {/* ── Búsqueda libre ── */}
      <div>
        <p className="text-[11px] font-extrabold uppercase tracking-[.16em] text-[#38633e] mb-2">
          Buscar por nombre
        </p>
        <form method="GET" action="/actividades" className="flex gap-2 max-w-md">
          {/* Mantener filtros activos al buscar */}
          {currentCategoria && (
            <input type="hidden" name="categoria_id" value={currentCategoria} />
          )}
          {currentModalidad && (
            <input type="hidden" name="modalidad" value={currentModalidad} />
          )}
          <div className="relative flex-1">
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
              name="q"
              defaultValue={currentQ ?? ''}
              placeholder="Ej: memoria, mindfulness…"
              className="block w-full rounded-lg border border-gray-300 pl-10 pr-4 py-2 text-sm shadow-sm placeholder:text-gray-400 focus:border-[#38633e] focus:outline-none focus:ring-1 focus:ring-[#38633e]"
            />
          </div>
          <button
            type="submit"
            className="inline-flex items-center gap-1 rounded-lg bg-[#38633e] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#2c4f31] transition-colors"
          >
            Buscar
          </button>
        </form>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────

function buildHref({
  categoria,
  modalidad,
  q,
}: {
  categoria: string | undefined
  modalidad: string | undefined
  q: string | undefined
}): string {
  const params = new URLSearchParams()
  if (categoria) params.set('categoria_id', categoria)
  if (modalidad) params.set('modalidad', modalidad)
  if (q && q.length > 0) params.set('q', q)
  const qs = params.toString()
  return qs.length > 0 ? `/actividades?${qs}` : '/actividades'
}

// ─────────────────────────────────────────────────────────────────────────
// Subcomponente: pill como <Link>
// ─────────────────────────────────────────────────────────────────────────

function PillLink({
  href,
  active,
  primaryColor,
  icon,
  children,
}: {
  href: string
  active: boolean
  primaryColor: string
  icon?: string
  children: React.ReactNode
}) {
  return (
    <Link
      href={href}
      scroll={false}
      className="inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1"
      style={
        active
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
      {icon && <span aria-hidden="true">{icon}</span>}
      {children}
    </Link>
  )
}
