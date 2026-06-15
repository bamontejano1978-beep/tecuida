/**
 * Página "Suspendido" — Municipio con suscripción suspendida o cancelada
 *
 * Se muestra cuando el middleware redirige a /suspendido?tenant=X
 * porque la suscripción del municipio no está activa.
 *
 * Requisitos: 2.3
 */

import Link from 'next/link'

interface SuspendidoPageProps {
  searchParams: Record<string, string | string[] | undefined>
}

export default function SuspendidoPage({ searchParams }: SuspendidoPageProps) {
  const tenant = typeof searchParams['tenant'] === 'string' ? searchParams['tenant'] : ''

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 via-white to-orange-50 px-4">
      <div className="text-center max-w-lg">
        {/* Icono */}
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-amber-100">
          <svg
            className="h-10 w-10 text-amber-600"
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

        <h1 className="mt-6 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
          Servicio no disponible
        </h1>

        <p className="mt-4 text-lg text-gray-600">
          {tenant ? (
            <>
              El portal de{' '}
              <span className="font-semibold text-gray-800 capitalize">{tenant}</span>{' '}
              no está disponible temporalmente.
            </>
          ) : (
            'Este portal no está disponible temporalmente.'
          )}
        </p>

        <p className="mt-2 text-sm text-gray-500">
          La suscripción de este municipio ha sido suspendida o cancelada.
          Si eres el administrador del municipio, contacta con el equipo de
          TE CUIDA para reactivar el servicio.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <a
            href="mailto:soporte@tecuida.group"
            className="inline-flex items-center rounded-lg bg-amber-600 px-6 py-3 text-base font-semibold text-white shadow-sm hover:bg-amber-500 transition-colors"
          >
            Contactar soporte
          </a>
          <Link
            href="/"
            className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-6 py-3 text-base font-semibold text-gray-700 shadow-sm hover:bg-gray-50 transition-colors"
          >
            ← Volver al inicio
          </Link>
        </div>

        <p className="mt-8 text-xs text-gray-400">
          TE CUIDA — Plataforma de bienestar ciudadano
        </p>
      </div>
    </div>
  )
}
