/**
 * LandingPreviewButton — Botón compartido para previsualizar landing/catálogo.
 *
 * Usado en las páginas de admin de municipios para abrir la landing pública
 * o el catálogo público en una nueva pestaña. Centraliza el JSX del botón
 * indigo con icono external-link que antes estaba duplicado en:
 *   - src/app/admin/municipios/[id]/page.tsx      ("Ver landing pública")
 *   - src/app/admin/municipios/[id]/aplicaciones/page.tsx ("Ver catálogo público")
 */

import React from 'react'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface LandingPreviewButtonProps {
  /** URL de destino (landing o catálogo público del municipio) */
  href: string
  /** Texto del botón, p. ej. "Ver landing pública" o "Ver catálogo público" */
  label: string
  /** Clases adicionales para el <a> (opcional) */
  className?: string
}

// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------

export default function LandingPreviewButton({
  href,
  label,
  className = '',
}: LandingPreviewButtonProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 transition-colors ${className}`}
    >
      <svg
        className="w-4 h-4"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={2}
        stroke="currentColor"
        aria-hidden="true"
        focusable="false"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
        />
      </svg>
      {label}
    </a>
  )
}
