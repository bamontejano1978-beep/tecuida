import Link from 'next/link'

/** 404 global para rutas inexistentes que no pasan por la página /404 del tenant. */
export default function GlobalNotFound() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-gray-100 px-4">
      <div className="max-w-lg text-center">
        <p className="text-sm font-bold uppercase tracking-widest text-indigo-600">Error 404</p>
        <h1 className="mt-3 text-4xl font-bold text-gray-900">Página no encontrada</h1>
        <p className="mt-4 text-gray-600">
          La dirección no existe o el contenido ya no está disponible.
        </p>
        <Link
          href="/"
          className="mt-8 inline-flex rounded-lg bg-indigo-600 px-6 py-3 font-semibold text-white hover:bg-indigo-500"
        >
          ← Volver al inicio
        </Link>
      </div>
    </main>
  )
}
