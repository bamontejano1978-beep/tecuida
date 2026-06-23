/**
 * Página de inicio de sesión — TE CUIDA
 *
 * Formulario HTML plano que envía a POST /api/auth/login.
 * Los errores se muestran vía searchParams (?error=...).
 *
 * Requisitos: 5.1
 */

'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense, useState } from 'react'

function LoginForm() {
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirect') || ''
  const error = searchParams.get('error')
  const emailNotConfirmed = searchParams.get('emailNotConfirmed') === '1'
  const [submitting, setSubmitting] = useState(false)

  return (
    <>
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">TE CUIDA</h1>
        <p className="mt-2 text-sm text-gray-600">Portal de bienestar ciudadano</p>
        <h2 className="mt-6 text-xl font-semibold text-gray-900">Iniciar sesión</h2>
        <p className="mt-1 text-sm text-gray-500">Accede a tu espacio personal de bienestar</p>
      </div>

      <form
        action="/api/auth/login"
        method="POST"
        className="mt-8 space-y-6"
        onSubmit={() => setSubmitting(true)}
      >
        {redirectTo && <input type="hidden" name="redirect" value={redirectTo} />}

        <div className="space-y-4">
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
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Contraseña
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:text-sm"
              placeholder="••••••••"
            />
          </div>
        </div>

        {error && !emailNotConfirmed && (
          <div className="rounded-md bg-red-50 p-3">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}
        {emailNotConfirmed && (
          <div className="rounded-md bg-yellow-50 p-3">
            <p className="text-sm text-yellow-700">
              Debes confirmar tu correo electrónico. Revisa tu bandeja de entrada.
            </p>
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full flex justify-center rounded-md bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? 'Iniciando sesión…' : 'Iniciar sesión'}
        </button>

        <div className="space-y-3">
          <p className="text-center text-sm text-gray-500">
            ¿No tienes cuenta?{' '}
            <Link
              href="/register"
              className="font-semibold text-indigo-600 hover:text-indigo-500"
            >
              Regístrate aquí
            </Link>
          </p>
          <p className="text-center">
            <Link
              href="/recuperar"
              className="text-xs text-gray-400 hover:text-indigo-600 transition-colors"
            >
              ¿Olvidaste tu contraseña?
            </Link>
          </p>
        </div>
      </form>
    </>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <LoginForm />
    </Suspense>
  )
}
