/**
 * Página de recuperación de contraseña — TE CUIDA
 *
 * Formulario HTML plano que envía a POST /api/auth/forgot-password.
 * Muestra confirmación cuando el email se envía correctamente.
 */

'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense, useState } from 'react'

function ForgotPasswordForm() {
  const searchParams = useSearchParams()
  const sent = searchParams.get('sent') === '1'
  const error = searchParams.get('error')
  const [submitting, setSubmitting] = useState(false)

  if (sent) {
    return (
      <div className="text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
          <svg className="h-8 w-8 text-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
          </svg>
        </div>
        <h1 className="mt-4 text-2xl font-bold text-gray-900">Revisa tu correo</h1>
        <p className="mt-2 text-sm text-gray-600">
          Si el correo existe en nuestra base de datos, recibirás un enlace para restablecer tu contraseña.
        </p>
        <p className="mt-1 text-xs text-gray-400">
          Revisa también la carpeta de spam. El enlace caduca en 1 hora.
        </p>
        <Link
          href="/login"
          className="mt-6 inline-flex items-center rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 transition-colors"
        >
          Volver a iniciar sesión
        </Link>
      </div>
    )
  }

  return (
    <>
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">TE CUIDA</h1>
        <p className="mt-2 text-sm text-gray-600">Portal de bienestar ciudadano</p>
        <h2 className="mt-6 text-xl font-semibold text-gray-900">Recuperar contraseña</h2>
        <p className="mt-1 text-sm text-gray-500">
          Escribe tu correo y te enviaremos un enlace para restablecerla.
        </p>
      </div>

      <form
        action="/api/auth/forgot-password"
        method="POST"
        className="mt-8 space-y-6"
        onSubmit={() => setSubmitting(true)}
      >
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            Correo electrónico
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:text-sm"
            placeholder="tu@correo.com"
          />
        </div>

        {error && (
          <div className="rounded-md bg-red-50 p-3">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full flex justify-center rounded-md bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? 'Enviando…' : 'Enviar enlace de recuperación'}
        </button>

        <p className="text-center text-sm text-gray-500">
          <Link
            href="/login"
            className="font-semibold text-indigo-600 hover:text-indigo-500"
          >
            ← Volver a iniciar sesión
          </Link>
        </p>
      </form>
    </>
  )
}

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 px-4">
      <div className="w-full max-w-sm">
        <Suspense fallback={<div className="min-h-[300px]" />}>
          <ForgotPasswordForm />
        </Suspense>
      </div>
    </div>
  )
}
