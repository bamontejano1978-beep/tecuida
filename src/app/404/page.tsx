/**
 * Página 404 — Municipio no encontrado
 *
 * Se muestra cuando el middleware redirige a /404?slug=X
 * porque el tenant no existe en la base de datos.
 *
 * Requisitos: 2.3
 */

import Link from 'next/link'

interface NotFoundPageProps {
  searchParams: Record<string, string | string[] | undefined>
}

export default function NotFoundPage({ searchParams }: NotFoundPageProps) {
  const slug = typeof searchParams['slug'] === 'string' ? searchParams['slug'] : ''

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-gray-100 px-4">
      <div className="text-center max-w-lg">
        {/* Icono */}
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gray-100">
          <svg
            className="h-10 w-10 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
            />
          </svg>
        </div>

        <h1 className="mt-6 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
          Municipio no encontrado
        </h1>

        <p className="mt-4 text-lg text-gray-600">
          {slug ? (
            <>
              El municipio{' '}
              <span className="font-semibold text-gray-800">{slug}</span> no existe
              o no está disponible en este momento.
            </>
          ) : (
            'La página que buscas no existe o no está disponible.'
          )}
        </p>

        <p className="mt-2 text-sm text-gray-500">
          Si crees que esto es un error, contacta con el soporte de tu
          ayuntamiento o verifica que la dirección web sea correcta.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center rounded-lg bg-indigo-600 px-6 py-3 text-base font-semibold text-white shadow-sm hover:bg-indigo-500 transition-colors"
          >
            ← Volver al inicio
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-6 py-3 text-base font-semibold text-gray-700 shadow-sm hover:bg-gray-50 transition-colors"
          >
            Iniciar sesión
          </Link>
        </div>
      </div>
    </div>
  )
}
