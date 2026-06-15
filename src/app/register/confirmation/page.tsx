/**
 * Página de confirmación de registro — TE CUIDA
 *
 * Se muestra después de que el usuario se registra y Supabase
 * requiere confirmación de email. Indica al usuario que revise
 * su bandeja de entrada.
 */

import Link from 'next/link'

export default function RegisterConfirmationPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 px-4">
      <div className="text-center max-w-md">
        {/* Icono de email */}
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-indigo-100">
          <svg
            className="h-10 w-10 text-indigo-600"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75"
            />
          </svg>
        </div>

        <h1 className="mt-6 text-3xl font-bold tracking-tight text-gray-900">
          ¡Revisa tu correo!
        </h1>

        <p className="mt-4 text-base text-gray-600">
          Te hemos enviado un enlace de confirmación a tu dirección de correo
          electrónico. Haz clic en el enlace para activar tu cuenta.
        </p>

        <p className="mt-3 text-sm text-gray-500">
          Si no encuentras el correo, revisa la carpeta de spam o promociones.
          El enlace caduca en 24 horas.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/login"
            className="inline-flex items-center rounded-lg bg-indigo-600 px-6 py-3 text-base font-semibold text-white shadow-sm hover:bg-indigo-500 transition-colors"
          >
            Ir a iniciar sesión
          </Link>
        </div>

        <p className="mt-6 text-xs text-gray-400">
          TE CUIDA — Plataforma de bienestar ciudadano
        </p>
      </div>
    </div>
  )
}
