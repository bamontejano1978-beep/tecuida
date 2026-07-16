/**
 * ActivityCard — Tarjeta pública de actividad marketplace
 *
 * Server Component presentacional (sin 'use client').
 * Reutilizable en:
 *   - Bloque "Actividades del municipio" de la landing (top 3 destacadas)
 *   - Página pública /actividades (lista completa con filtros)
 *
 * Visual: thumbnail con gradient (o color sólido), badge de modalidad,
 * badge destacada (opcional), nombre, descripción (3 líneas), fecha,
 * plazas + precio. Click navega a /actividades/<id>.
 */

import Link from 'next/link'
import type { ActivityModalidad } from '@/types'

// ─────────────────────────────────────────────────────────────────────────
// Tipos / props
// ─────────────────────────────────────────────────────────────────────────

interface ActivityCardProps {
  id: string
  nombre: string
  descripcion: string | null
  thumbnail_url: string | null
  modalidad: ActivityModalidad
  /** formato YYYY-MM-DD */
  fecha_inicio: string
  fecha_fin?: string | null
  plazas_inscritas: number
  /** null → sin límite visible */
  aforo: number | null
  precio_texto?: string | null
  categoria_nombre?: string | null
  destacada?: boolean
}

// ─────────────────────────────────────────────────────────────────────────
// Constantes visuales
// ─────────────────────────────────────────────────────────────────────────

const modalidadIcon: Record<ActivityModalidad, string> = {
  presencial: '📍',
  online: '💻',
  mixta: '🔀',
}

const modalidadLabel: Record<ActivityModalidad, string> = {
  presencial: 'Presencial',
  online: 'Online',
  mixta: 'Mixta',
}

// ─────────────────────────────────────────────────────────────────────────
// Componente
// ─────────────────────────────────────────────────────────────────────────

export default function ActivityCard({
  id,
  nombre,
  descripcion,
  thumbnail_url,
  modalidad,
  fecha_inicio,
  fecha_fin,
  plazas_inscritas,
  aforo,
  precio_texto,
  categoria_nombre,
  destacada,
}: ActivityCardProps) {
  const fechaLabel = formatDateShort(fecha_inicio) +
    (fecha_fin ? ` → ${formatDateShort(fecha_fin)}` : '')

  return (
    <Link
      href={`/actividades/${id}`}
      className="group relative flex flex-col rounded-2xl overflow-hidden border border-[rgba(35,45,30,.13)] bg-white shadow-[0_10px_30px_rgba(35,30,18,.07)] hover:shadow-[0_18px_50px_rgba(35,30,18,.12)] hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-[#38633e] focus:ring-offset-2 transition-all duration-200"
    >
      {/* ── Thumbnail + badges ── */}
      <div
        className="relative h-44 overflow-hidden"
        style={{
          backgroundImage: thumbnail_url
            ? `linear-gradient(180deg, rgba(15,29,20,.35), rgba(15,29,20,.85)), url('${thumbnail_url}')`
            : 'linear-gradient(135deg, #142c19 0%, #38633e 100%)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
        aria-hidden="true"
      >
        {/* Modalidad siempre arriba a la izquierda */}
        <div className="absolute inset-0 flex items-start justify-between p-3">
          <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[.18em] backdrop-blur-md border border-white/30 bg-white/10 text-white">
            <span aria-hidden="true">{modalidadIcon[modalidad]}</span>
            {modalidadLabel[modalidad]}
          </span>
          {destacada && (
            <span
              aria-label="Actividad destacada"
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-gradient-to-r from-[#d79a35] to-[#f0b64e] text-white shadow-[0_4px_12px_rgba(215,154,53,.4)]"
            >
              ⭐ Destacada
            </span>
          )}
        </div>
      </div>

      {/* ── Cuerpo ── */}
      <div className="flex flex-col gap-2 p-5 flex-1">
        {categoria_nombre && (
          <p className="text-[11px] font-extrabold uppercase tracking-[.16em] text-[#38633e]">
            {categoria_nombre}
          </p>
        )}
        <h3 className="font-bold text-lg leading-tight text-[#1a2e1d] group-hover:text-[#38633e] transition-colors">
          {nombre}
        </h3>
        <p className="text-sm text-[#64705e] line-clamp-3 flex-1">
          {descripcion || 'Sin descripción disponible.'}
        </p>

        {/* Pills de fecha / plazas / precio */}
        <div className="flex flex-wrap gap-2 mt-2">
          <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-[#f5efe2] text-[#38633e] border border-[#38633e]/20">
            <span aria-hidden="true">📅</span>
            {fechaLabel}
          </span>
          {aforo !== null && (
            <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-[#f5efe2] text-[#38633e] border border-[#38633e]/20">
              <span aria-hidden="true">🎟️</span>
              {plazas_inscritas} / {aforo}
            </span>
          )}
          {precio_texto && (
            <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
              <span aria-hidden="true">💸</span>
              {precio_texto}
            </span>
          )}
        </div>

        <span className="text-sm font-medium text-[#38633e] mt-2 group-hover:translate-x-0.5 transition-transform">
          Ver detalles →
        </span>
      </div>
    </Link>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────

function formatDateShort(s: string): string {
  try {
    const d = new Date(s + 'T00:00:00')
    const dd = String(d.getDate()).padStart(2, '0')
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    return `${dd}/${mm}/${d.getFullYear()}`
  } catch {
    return s
  }
}
