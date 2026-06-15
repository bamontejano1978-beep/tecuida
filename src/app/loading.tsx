/**
 * Loading state — Animación de carga para páginas
 *
 * Se muestra automáticamente mientras las páginas Server Component
 * están cargando datos. Next.js lo usa para Suspense boundaries.
 */

export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="inline-flex items-center gap-1">
          <span className="h-3 w-3 rounded-full bg-indigo-400 animate-bounce [animation-delay:-0.3s]" />
          <span className="h-3 w-3 rounded-full bg-indigo-400 animate-bounce [animation-delay:-0.15s]" />
          <span className="h-3 w-3 rounded-full bg-indigo-400 animate-bounce" />
        </div>
        <p className="mt-4 text-sm text-gray-500">Cargando...</p>
        <p className="mt-1 text-xs text-gray-400">TE CUIDA</p>
      </div>
    </div>
  )
}
