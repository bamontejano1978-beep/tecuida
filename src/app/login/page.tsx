/**
 * Página de inicio de sesión — TE CUIDA
 *
 * Client Component con Server Action (signIn).
 * Lee el query param `?redirect=` (inyectado por el middleware)
 * y lo pasa al Server Action para redirigir tras login exitoso.
 *
 * Requisitos: 5.1
 */

'use client'

import { signIn } from '@/lib/actions/auth'
import type { AuthResult } from '@/lib/actions/auth'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect } from 'react'
import { useFormState } from 'react-dom'
import { Suspense } from 'react'

const initialState: AuthResult = { success: false }

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirect') || ''
  const [state, formAction] = useFormState(signIn, initialState)

  // Redirigir desde el cliente cuando login es exitoso
  useEffect(() => {
    if (state?.success && state?.redirectTo) {
      router.push(state.redirectTo)
    }
  }, [state, router])

  return (
    <>
      {/* Header institucional */}
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">
          TE CUIDA
        </h1>
        <p className="mt-2 text-sm text-gray-600">Portal de bienestar ciudadano</p>
        <h2 className="mt-6 text-xl font-semibold text-gray-900">
          Iniciar sesión
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Accede a tu espacio personal de bienestar
        </p>
      </div>

      {/* Formulario */}
      <form action={formAction} className="mt-8 space-y-6">
        {/* Campo oculto: URL a la que redirigir tras login exitoso */}
        {redirectTo && (
          <input type="hidden" name="redirect" value={redirectTo} />
        )}

        <div className="space-y-4">
          {/* Email */}
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700"
            >
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

          {/* Contraseña */}
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700"
            >
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

        {/* Mensaje de error */}
        {state?.error && !state?.emailNotConfirmed && (
          <div className="rounded-md bg-red-50 p-3">
            <p className="text-sm text-red-700">{state.error}</p>
          </div>
        )}

        {/* Email no confirmado */}
        {state?.emailNotConfirmed && (
          <div className="rounded-md bg-yellow-50 p-3">
            <p className="text-sm text-yellow-700">
              Debes confirmar tu correo electrónico. Revisa tu bandeja de
              entrada y haz clic en el enlace de verificación.
            </p>
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          className="w-full flex justify-center rounded-md bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 transition-colors"
        >
          Iniciar sesión
        </button>

        {/* Enlace a registro */}
        <p className="text-center text-sm text-gray-500">
          ¿No tienes cuenta?{' '}
          <Link
            href="/register"
            className="font-semibold text-indigo-600 hover:text-indigo-500"
          >
            Regístrate aquí
          </Link>
        </p>
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
