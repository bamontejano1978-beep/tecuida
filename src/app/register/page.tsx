/**
 * Página de registro de ciudadano — TE CUIDA
 *
 * Usa un formulario HTML plano que envía POST a /api/auth/register.
 * El Route Handler gestiona el registro y redirige con cookies
 * de sesión correctamente propagadas.
 *
 * Requisitos: 11.5, 12.1, 12.2
 */

'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function RegisterForm() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error')

  return (
    <>
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">
          TE CUIDA
        </h1>
        <p className="mt-2 text-sm text-gray-600">Portal de bienestar ciudadano</p>
        <h2 className="mt-6 text-xl font-semibold text-gray-900">
          Crear cuenta
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Únete al programa de bienestar de tu municipio
        </p>
      </div>

      <form action="/api/auth/register" method="POST" className="mt-8 space-y-6">
        <div className="space-y-4">
          <div>
            <label htmlFor="nombre" className="block text-sm font-medium text-gray-700">
              Nombre
            </label>
            <input id="nombre" name="nombre" type="text" autoComplete="given-name" required
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:text-sm"
              placeholder="Tu nombre" />
          </div>
          <div>
            <label htmlFor="apellidos" className="block text-sm font-medium text-gray-700">
              Apellidos
            </label>
            <input id="apellidos" name="apellidos" type="text" autoComplete="family-name" required
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:text-sm"
              placeholder="Tus apellidos" />
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Correo electrónico
            </label>
            <input id="email" name="email" type="email" autoComplete="email" required
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:text-sm"
              placeholder="tu@correo.com" />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Contraseña
            </label>
            <input id="password" name="password" type="password" autoComplete="new-password" required minLength={6}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:text-sm"
              placeholder="Mínimo 6 caracteres" />
          </div>
          <div>
            <label htmlFor="telefono" className="block text-sm font-medium text-gray-700">
              Teléfono <span className="text-gray-400 font-normal">(opcional)</span>
            </label>
            <input id="telefono" name="telefono" type="tel" autoComplete="tel"
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:text-sm"
              placeholder="+34 600 000 000" />
          </div>
          <div>
            <label htmlFor="fecha_nacimiento" className="block text-sm font-medium text-gray-700">
              Fecha de nacimiento <span className="text-gray-400 font-normal">(opcional)</span>
            </label>
            <input id="fecha_nacimiento" name="fecha_nacimiento" type="date"
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:text-sm" />
          </div>
        </div>

        {error && (
          <div className="rounded-md bg-red-50 p-3">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <button type="submit"
          className="w-full flex justify-center rounded-md bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 transition-colors">
          Crear cuenta
        </button>

        <p className="text-center text-sm text-gray-500">
          ¿Ya tienes cuenta?{' '}
          <Link href="/login" className="font-semibold text-indigo-600 hover:text-indigo-500">
            Inicia sesión
          </Link>
        </p>
      </form>
    </>
  )
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <RegisterForm />
    </Suspense>
  )
}
