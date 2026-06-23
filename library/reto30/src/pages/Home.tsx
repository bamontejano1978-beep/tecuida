import type { appMeta } from '../config'

interface HomeProps {
  meta: typeof appMeta
}

/**
 * Página principal de la aplicación.
 *
 * Reemplaza este componente con la lógica real de tu app.
 * Puedes usar el color `meta.brand_color` para acentos,
 * y `meta.nombre` / `meta.descripcion` para textos.
 *
 * La PWA se instala automáticamente al visitar la URL.
 */
export default function Home({ meta }: HomeProps) {
  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
      <div className="mx-auto max-w-3xl px-4 py-20 sm:px-6 lg:px-8 text-center">
        <div className="animate-fade-in-up">
          {/* Icono */}
          <div
            className="mx-auto grid h-20 w-20 place-items-center rounded-2xl text-3xl font-bold text-white shadow-lg mb-6"
            style={{ background: `linear-gradient(135deg, ${meta.brand_color}, ${meta.brand_color}dd)` }}
          >
            {meta.nombre.charAt(0).toUpperCase()}
          </div>

          {/* Título */}
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl mb-4">
            {meta.nombre}
          </h1>

          {/* Tipo pill */}
          <span
            className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold text-white"
            style={{ backgroundColor: meta.brand_color }}
          >
            {meta.tipo === 'programa'
              ? 'Programa'
              : meta.tipo === 'herramienta'
                ? 'Herramienta'
                : meta.tipo === 'encuesta'
                  ? 'Encuesta'
                  : 'Recurso'}
          </span>

          {/* Descripción */}
          <p className="mt-6 text-lg text-gray-600 max-w-xl mx-auto leading-relaxed">
            {meta.descripcion}
          </p>

          {/* Instrucciones */}
          {meta.instrucciones && (
            <div className="mt-8 rounded-xl bg-white border border-gray-200 p-6 text-left max-w-lg mx-auto shadow-sm">
              <h2 className="text-sm font-semibold text-gray-700 mb-2">
                📋 Instrucciones
              </h2>
              <div className="text-sm text-gray-600 whitespace-pre-line leading-relaxed font-sans">
                {meta.instrucciones}
              </div>
            </div>
          )}

          {/* Footer sutil — powered by TE CUIDA */}
          <p className="mt-16 text-xs text-gray-400">
            Powered by{' '}
            <a
              href="https://tecuida.group"
              className="underline hover:text-gray-600 transition-colors"
              target="_blank"
              rel="noopener noreferrer"
            >
              TE CUIDA
            </a>
          </p>
        </div>
      </div>
    </main>
  )
}
