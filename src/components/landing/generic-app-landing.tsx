/**
 * GenericAppLanding — Landing genérica para aplicaciones no-programa
 *
 * Se muestra en /app/[id] cuando la aplicación es de tipo
 * 'herramienta', 'encuesta' o 'recurso' (sin programa asociado).
 *
 * Renderiza:
 *   - Descripción de la aplicación
 *   - Instrucciones de uso y descarga
 *   - Botón de acceso a la app web (si tiene url_acceso)
 */

import Link from 'next/link'

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export interface GenericAppLandingProps {
  nombre: string
  descripcion: string | null
  tipo: string
  instrucciones: string | null
  url_acceso: string | null
  categoria_nombre: string | null
}

// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------

const tipoIcons: Record<string, string> = {
  herramienta: '🔧',
  encuesta: '📋',
  recurso: '📖',
}

const tipoLabels: Record<string, string> = {
  herramienta: 'Herramienta',
  encuesta: 'Encuesta',
  recurso: 'Recurso',
}

export default function GenericAppLanding({
  nombre,
  descripcion,
  tipo,
  instrucciones,
  url_acceso,
  categoria_nombre,
}: GenericAppLandingProps) {
  const icon = tipoIcons[tipo] || '📦'
  const label = tipoLabels[tipo] || tipo

  return (
    <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      {/* ── Header ── */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-3xl">{icon}</span>
          <span className="inline-flex items-center rounded-full bg-indigo-50 px-3 py-0.5 text-xs font-medium text-indigo-700">
            {label}
          </span>
          {categoria_nombre && (
            <span className="text-sm text-gray-400">{categoria_nombre}</span>
          )}
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
          {nombre}
        </h1>
      </div>

      {/* ── Descripción ── */}
      <section className="mb-10">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">
          📝 Descripción
        </h2>
        <div className="prose prose-gray max-w-none text-gray-600 leading-relaxed">
          {descripcion ? (
            <p>{descripcion}</p>
          ) : (
            <p className="text-gray-400 italic">
              Esta aplicación no tiene descripción todavía.
            </p>
          )}
        </div>
      </section>

      {/* ── Instrucciones ── */}
      {instrucciones && (
        <section className="mb-10">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">
            📋 Instrucciones de uso y descarga
          </h2>
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <p className="text-gray-600 whitespace-pre-line leading-relaxed">
              {instrucciones}
            </p>
          </div>
        </section>
      )}

      {/* ── Acceso a la app ── */}
      {url_acceso && (
        <section className="mb-10">
          <a
            href={url_acceso}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2.5 rounded-xl bg-indigo-600 px-8 py-4 text-base font-semibold text-white shadow-lg hover:bg-indigo-500 hover:shadow-xl transition-all hover:-translate-y-0.5"
          >
            <svg
              className="w-5 h-5"
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
                d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3"
              />
            </svg>
            Instalar aplicación
          </a>
          <p className="mt-3 text-sm text-gray-500">
            Al hacer clic se abrirá la aplicación en una nueva pestaña.{' '}
            <span className="text-gray-400">
              Puedes instalarla en tu dispositivo para acceder sin necesidad de volver a iniciar sesión.
            </span>
          </p>
          <p className="mt-1 text-xs text-gray-400 font-mono truncate">
            {url_acceso}
          </p>
        </section>
      )}

      {/* ── Sin contenido ── */}
      {!instrucciones && !url_acceso && (
        <section className="mb-10">
          <div className="bg-white rounded-xl border border-dashed border-gray-300 p-10 text-center">
            <svg
              className="mx-auto h-12 w-12 text-gray-300"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1}
              stroke="currentColor"
              aria-hidden="true"
              focusable="false"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z"
              />
            </svg>
            <p className="mt-4 text-sm font-medium text-gray-500">
              Próximamente disponible
            </p>
            <p className="mt-1 text-sm text-gray-400">
              Esta aplicación se está preparando. Vuelve pronto para ver las
              instrucciones de instalación y el acceso.
            </p>
          </div>
        </section>
      )}

      {/* ── Volver ── */}
      <div className="border-t border-gray-200 pt-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-500 transition-colors"
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
              d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18"
            />
          </svg>
          ← Volver al catálogo
        </Link>
      </div>
    </main>
  )
}
