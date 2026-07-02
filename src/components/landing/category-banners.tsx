'use client'

/**
 * CategoryBanners — Banners expandibles de categorías para la landing page.
 *
 * Client Component que renderiza cada categoría como un banner grande y
 * prominente. Al hacer clic, se despliegan/pliegan las aplicaciones de esa
 * categoría con una animación suave. La primera categoría con apps se abre
 * por defecto para invitar a la interacción.
 */

import { useState, useCallback, useRef, useLayoutEffect } from 'react'
import Link from 'next/link'

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export interface CategoryBanner {
  id: string
  nombre: string
  descripcion: string | null
  icono_url: string | null
  count: number
}

export interface BannerApp {
  id: string
  categoria_id: string
  nombre: string
  descripcion: string
  thumbnail_url: string
  tipo: 'programa' | 'herramienta' | 'encuesta' | 'recurso'
}

export interface CategoryBannersProps {
  categories: CategoryBanner[]
  apps: BannerApp[]
  /** Color primario corporativo del municipio para los acentos */
  primaryColor?: string
  /** Categorías visibles (con apps) */
  visibleCategoryIds: string[]
  /** IDs de categorías con apps añadidas recientemente (últimos 7 días) */
  recentCategoryIds?: string[]
}

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------

const TIPO_ICON: Record<string, string> = {
  programa: '🌿',
  herramienta: '🔧',
  encuesta: '📋',
  recurso: '📖',
}

// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------

export default function CategoryBanners({
  categories,
  apps,
  primaryColor = '#142c19',
  visibleCategoryIds,
  recentCategoryIds = [],
}: CategoryBannersProps) {
  // Por defecto, la primera categoría con apps se abre
  const firstVisibleId = visibleCategoryIds[0] || null
  const [expandedIds, setExpandedIds] = useState<Set<string>>(
    () => new Set(firstVisibleId ? [firstVisibleId] : []),
  )
  // Modo acordeón exclusivo: solo una categoría abierta a la vez
  const [exclusiveMode, setExclusiveMode] = useState(false)

  const toggle = useCallback(
    (id: string) => {
      setExpandedIds((prev) => {
        if (exclusiveMode) {
          // Modo exclusivo: si ya está abierta, se cierra; si no, abre solo esta
          if (prev.has(id)) {
            return new Set()
          }
          return new Set([id])
        }
        // Modo múltiple: toggle normal
        const next = new Set(prev)
        if (next.has(id)) {
          next.delete(id)
        } else {
          next.add(id)
        }
        return next
      })
    },
    [exclusiveMode],
  )

  // Apps sin categoría
  const uncategorizedApps = apps.filter(
    (app) =>
      !app.categoria_id ||
      !visibleCategoryIds.includes(app.categoria_id),
  )

  return (
    <div className="space-y-5">
      {/* ── Toggle de modo acordeón ── */}
      <div className="flex justify-end">
        <button
          onClick={() =>
            setExclusiveMode((m) => {
              // Al activar modo exclusivo, si hay varias abiertas, dejar solo la primera
              if (!m && expandedIds.size > 1) {
                setExpandedIds(new Set([[...expandedIds][0]]))
              }
              return !m
            })
          }
          aria-pressed={exclusiveMode}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold border transition-all duration-200"
          style={
            exclusiveMode
              ? {
                  backgroundColor: primaryColor,
                  color: '#fff',
                  borderColor: primaryColor,
                  boxShadow: `0 4px 12px ${primaryColor}40`,
                }
              : {
                  backgroundColor: '#fff',
                  color: '#64705e',
                  borderColor: 'rgba(35,45,30,.15)',
                }
          }
          title={
            exclusiveMode
              ? 'Modo acordeón: una categoría a la vez'
              : 'Modo múltiple: varias categorías abiertas'
          }
        >
          {exclusiveMode ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="5" y="3" width="14" height="18" rx="2" />
              <path d="M9 3v18" />
            </svg>
          )}
          {exclusiveMode ? 'Una a la vez' : 'Varias a la vez'}
        </button>
      </div>

      {categories
        .filter((cat) => visibleCategoryIds.includes(cat.id))
        .map((cat) => {
          const catApps = apps.filter((app) => app.categoria_id === cat.id)
          const isExpanded = expandedIds.has(cat.id)
          const isRecent = recentCategoryIds.includes(cat.id)

          return (
            <CategoryBannerItem
              key={cat.id}
              category={cat}
              apps={catApps}
              isExpanded={isExpanded}
              isRecent={isRecent}
              onToggle={() => toggle(cat.id)}
              primaryColor={primaryColor}
            />
          )
        })}

      {/* Apps sin categoría */}
      {uncategorizedApps.length > 0 && (
        <CategoryBannerItem
          category={{
            id: 'sin-categoria',
            nombre: 'Otras aplicaciones',
            descripcion: null,
            icono_url: null,
            count: uncategorizedApps.length,
          }}
          apps={uncategorizedApps}
          isExpanded={expandedIds.has('sin-categoria')}
          onToggle={() => toggle('sin-categoria')}
          primaryColor={primaryColor}
          defaultIcon="📦"
        />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Item individual de categoría
// ---------------------------------------------------------------------------

function CategoryBannerItem({
  category,
  apps,
  isExpanded,
  isRecent = false,
  onToggle,
  primaryColor,
  defaultIcon,
}: {
  category: CategoryBanner
  apps: BannerApp[]
  isExpanded: boolean
  isRecent?: boolean
  onToggle: () => void
  primaryColor: string
  defaultIcon?: string
}) {
  const contentRef = useRef<HTMLDivElement>(null)
  const [contentHeight, setContentHeight] = useState<number>(0)

  // useLayoutEffect para medir antes del paint → sin salto visual
  useLayoutEffect(() => {
    if (contentRef.current) {
      setContentHeight(contentRef.current.scrollHeight)
    }
  }, [apps, isExpanded])

  const icon = defaultIcon || category.icono_url || '📁'
  const hasImage = !defaultIcon && category.icono_url?.startsWith('http')

  return (
    <div
      className={`group rounded-[24px] border transition-all duration-300 overflow-hidden relative ${
        isExpanded
          ? 'border-[rgba(35,45,30,.15)] bg-white shadow-[0_20px_60px_rgba(35,30,18,.1)]'
          : 'border-[rgba(35,45,30,.08)] bg-white/70 hover:bg-white/90 hover:shadow-[0_12px_40px_rgba(35,30,18,.08)] hover:-translate-y-0.5'
      } ${isRecent && !isExpanded ? 'ring-1 ring-[#d79a35]/30' : ''}`}
    >
      {/* Indicador de apps recientes: línea dorada en borde izquierdo */}
      {isRecent && (
        <div
          className="absolute left-0 top-4 bottom-4 w-[3px] rounded-r-full animate-pulse"
          style={{ backgroundColor: '#d79a35' }}
          aria-hidden="true"
        />
      )}
      {/* ── Banner clickeable ── */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-5 p-6 sm:p-8 text-left cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 rounded-[24px]"
        style={
          {
            '--focus-ring': primaryColor,
          } as React.CSSProperties
        }
        aria-expanded={isExpanded}
      >
        {/* Icono grande */}
        <div
          className={`flex items-center justify-center w-[72px] h-[72px] sm:w-[88px] sm:h-[88px] rounded-2xl shrink-0 transition-all duration-300 overflow-hidden ${
            isExpanded
              ? 'shadow-lg scale-105'
              : 'group-hover:scale-105'
          }`}
          style={{
            backgroundColor: isExpanded
              ? `${primaryColor}15`
              : `${primaryColor}08`,
            boxShadow: isExpanded
              ? `0 8px 24px ${primaryColor}20`
              : undefined,
          }}
        >
          {hasImage ? (
            <img
              src={category.icono_url!}
              alt={category.nombre}
              className="w-11 h-11 sm:w-14 sm:h-14 object-contain"
              loading="lazy"
            />
          ) : (
            <span className="text-[36px] sm:text-[44px] leading-none">
              {icon}
            </span>
          )}
        </div>

        {/* Texto */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h3
              id={`cat-banner-title-${category.id}`}
              className="text-xl sm:text-2xl font-bold text-[#1a2e1d]"
            >
              {category.nombre}
            </h3>
            {/* Badge de apps */}
            <span
              className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold"
              style={{
                backgroundColor: `${primaryColor}15`,
                color: primaryColor,
              }}
            >
              {category.count}{' '}
              {category.count === 1 ? 'app' : 'apps'}
            </span>
            {/* Badge NUEVO — solo si la categoría tiene apps recientes */}
            {isRecent && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-gradient-to-r from-[#d79a35] to-[#f0b64e] text-white shadow-[0_2px_8px_rgba(215,154,53,.35)]">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                Nuevo
              </span>
            )}
          </div>
          {category.descripcion && (
            <p className="mt-1.5 text-[#64705e] text-sm sm:text-base leading-relaxed max-w-[600px]">
              {category.descripcion}
            </p>
          )}
        </div>

        {/* Chevron */}
        <div
          className={`shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all duration-300 ${
            isExpanded ? 'rotate-180' : ''
          }`}
          style={{
            backgroundColor: isExpanded
              ? `${primaryColor}18`
              : `${primaryColor}08`,
            color: primaryColor,
          }}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </div>
      </button>

      {/* ── Contenido expandible ── */}
      <div
        role="region"
        aria-labelledby={`cat-banner-title-${category.id}`}
        className="transition-all duration-500 ease-in-out overflow-hidden"
        style={{
          maxHeight: isExpanded ? `${contentHeight}px` : '0px',
          opacity: isExpanded ? 1 : 0,
        }}
      >
        <div ref={contentRef} className="px-6 sm:px-8 pb-7 sm:pb-9">
          {/* Separador */}
          <div className="mb-6 border-t border-[rgba(35,45,30,.08)]" />

          {apps.length === 0 ? (
            <p className="text-[#8a9784] text-sm italic py-4 text-center">
              No hay aplicaciones disponibles en esta categoría todavía.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {apps.map((app, i) => (
                <Link
                  key={app.id}
                  href={`/app/${app.id}`}
                  className="group/app-card relative flex items-start gap-4 rounded-xl border border-[rgba(35,45,30,.1)] bg-white p-5 no-underline shadow-[0_6px_20px_rgba(53,45,31,.05)] hover:-translate-y-0.5 hover:shadow-[0_10px_30px_rgba(53,45,31,.1)] transition-all duration-200 overflow-hidden"
                >
                  {/* Línea de acento lateral */}
                  <div
                    className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl transition-colors"
                    style={{
                      backgroundColor:
                        i % 2 === 0 ? primaryColor : '#d79a35',
                    }}
                  />

                  {/* Thumbnail */}
                  <div className="w-12 h-12 rounded-xl grid place-items-center text-2xl shrink-0 overflow-hidden bg-[#f5f0e6]">
                    {app.thumbnail_url ? (
                      <img
                        src={app.thumbnail_url}
                        alt={app.nombre}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <span>{TIPO_ICON[app.tipo] || '📖'}</span>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-base leading-tight text-[#1a2e1d] group-hover/app-card:text-[#38633e] transition-colors">
                      {app.nombre}
                    </h4>
                    <p className="mt-1 text-sm text-[#52604e] line-clamp-2">
                      {app.descripcion || 'Sin descripción'}
                    </p>
                  </div>

                  {/* Flecha */}
                  <span className="shrink-0 text-lg text-[#8a9784] group-hover/app-card:translate-x-0.5 transition-transform mt-1">
                    →
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
