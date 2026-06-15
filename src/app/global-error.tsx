'use client'

/**
 * Error boundary global — TE CUIDA
 *
 * Captura errores no manejados en el renderizado de páginas
 * y muestra un mensaje amigable con opción de reintentar.
 */

import { useEffect } from 'react'
import Link from 'next/link'

interface GlobalErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    console.error('[GlobalError]', error)
  }, [error])

  return (
    <html lang="es">
      <body className="antialiased">
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 via-white to-orange-50 px-4">
          <div className="text-center max-w-lg">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-red-100">
              <svg
                className="h-10 w-10 text-red-600"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
                />
              </svg>
            </div>

            <h1 className="mt-6 text-3xl font-bold tracking-tight text-gray-900">
              Algo salió mal
            </h1>

            <p className="mt-4 text-base text-gray-600">
              Ha ocurrido un error inesperado. Puedes intentar recargar la
              página o volver al inicio.
            </p>

            {error.digest && (
              <p className="mt-2 text-xs text-gray-400 font-mono">
                ID: {error.digest}
              </p>
            )}

            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => reset()}
                className="inline-flex items-center rounded-lg bg-indigo-600 px-6 py-3 text-base font-semibold text-white shadow-sm hover:bg-indigo-500 transition-colors"
              >
                Reintentar
              </button>
              <Link
                href="/"
                className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-6 py-3 text-base font-semibold text-gray-700 shadow-sm hover:bg-gray-50 transition-colors"
              >
                ← Volver al inicio
              </Link>
            </div>
          </div>
        </div>
      </body>
    </html>
  )
}
