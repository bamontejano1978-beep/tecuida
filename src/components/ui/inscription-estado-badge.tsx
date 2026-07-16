/**
 * InscriptionEstadoBadge — pill visual para los 4 estados de inscripción.
 *
 * Server-renderable, importable desde server components (admin) y desde
 * client components (citizen panel). Centralizar para que añadir un
 * nuevo estado en el futuro requiera tocar UN solo lugar.
 *
 * Mapping único: cualquier estado no catalogado cae al fallback gris
 * con el string crudo.
 */

import type { InscriptionEstado } from '@/types'

interface BadgeSpec {
  /** Emoji/glyph visible (mark decorative con aria-hidden) */
  icon: string
  /** Texto visible (también leído por screen reader) */
  label: string
  /** Tailwind classes (color + tamaño consistente) */
  className: string
}

const MAPPING: Record<InscriptionEstado, BadgeSpec> = {
  confirmada: {
    icon: '✓',
    label: 'Confirmada',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  cancelada: {
    icon: '✕',
    label: 'Cancelada',
    className: 'bg-gray-100 text-gray-600 border-gray-200',
  },
  asistio: {
    icon: '🎯',
    label: 'Asistió',
    className: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  no_asistio: {
    icon: '⚠️',
    label: 'No asistió',
    className: 'bg-amber-50 text-amber-700 border-amber-200',
  },
}

export function InscriptionEstadoBadge({
  estado,
}: {
  estado: InscriptionEstado | string
}) {
  const spec = MAPPING[estado as InscriptionEstado]
  if (spec) {
    return (
      <span
        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${spec.className}`}
      >
        <span aria-hidden="true">{spec.icon}</span>
        <span className="ml-1">{spec.label}</span>
      </span>
    )
  }
  // Fallback defensivo para estados no catalogados (forward-compat).
  return (
    <span className="inline-flex items-center rounded-full bg-gray-50 px-2 py-0.5 text-xs font-medium text-gray-600 border border-gray-200">
      {estado}
    </span>
  )
}
