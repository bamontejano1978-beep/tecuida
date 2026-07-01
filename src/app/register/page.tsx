/**
 * Página de registro — TE CUIDA
 *
 * Formulario HTML plano que envía a POST /api/auth/register.
 * Los errores se muestran vía searchParams (?error=...).
 *
 * Requisitos: 5.2
 */

'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense, useState } from 'react'

function RegisterForm() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error')
  const [submitting, setSubmitting] = useState(false)

  return (
    <>
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">TE CUIDA</h1>
        <p className="mt-2 text-sm text-gray-600">Portal de bienestar ciudadano</p>
        <h2 className="mt-6 text-xl font-semibold text-gray-900">Crear cuenta</h2>
        <p className="mt-1 text-sm text-gray-500">Únete a tu municipio y comienza tu viaje de bienestar</p>
      </div>

      <form
        action="/api/auth/register"
        method="POST"
        className="mt-8 space-y-6"
        onSubmit={() => setSubmitting(true)}
      >
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
              autoComplete="new-password"
              required
              minLength={6}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:text-sm"
              placeholder="Mínimo 6 caracteres"
            />
          </div>
          <div>
            <label htmlFor="alias" className="block text-sm font-medium text-gray-700">
              Alias{' '}
              <span className="text-gray-400 font-normal">(opcional)</span>
            </label>
            <input
              id="alias"
              name="alias"
              type="text"
              autoComplete="nickname"
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:text-sm"
              placeholder="¿Cómo quieres que te llamemos?"
            />
            <p className="mt-1 text-xs text-gray-400">
              Un pseudónimo para identificarte en la plataforma. No uses tu nombre real si prefieres mantener el anonimato.
            </p>
          </div>

          {/* ── Datos estadísticos anónimos (RGPD) ── */}
          <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 space-y-3">
            <p className="text-sm font-medium text-amber-800 flex items-center gap-2">
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
              </svg>
              Datos estadísticos anónimos
            </p>

            {/* ── Aviso RGPD ── */}
            <div className="rounded-md bg-white/60 border border-amber-300 p-3 text-xs text-amber-800 leading-relaxed space-y-2">
              <p>
                <strong>🔒 Tu privacidad es nuestra prioridad.</strong> Estos datos se rigen por el Reglamento General de Protección de Datos (RGPD):
              </p>
              <ul className="list-disc pl-4 space-y-1 text-amber-700">
                <li><strong>Totalmente opcionales.</strong> Puedes crear tu cuenta sin responder a estas preguntas.</li>
                <li><strong>Uso exclusivamente estadístico.</strong> Solo se utilizan para medir el impacto agregado de los programas en la comunidad (ej. «el 60% de las personas que completaron Mindful30 son mujeres entre 25 y 34 años»).</li>
                <li><strong>Nunca se muestran individualmente.</strong> Tus respuestas no son visibles para otros usuarios, ni para tu ayuntamiento, ni aparecen en tu perfil público.</li>
                <li><strong>Se almacenan de forma seudonimizada.</strong> El año de nacimiento se guarda sin mes ni día (menos identificable). El género se guarda como categoría agregable.</li>
                <li><strong>Puedes cambiar o eliminar estos datos</strong> en cualquier momento desde tu perfil (/perfil).</li>
              </ul>
              <p className="text-amber-600 italic">
                Al compartir estos datos, ayudas a tu ayuntamiento a entender qué programas funcionan mejor para cada grupo de ciudadanos. Gracias por contribuir.
              </p>
              <p className="text-amber-700 border-t border-amber-300 pt-2 mt-1">
                Para más información, consulta nuestra{' '}
                <Link href="/privacidad" className="font-semibold text-indigo-600 underline hover:text-indigo-500">
                  política de privacidad
                </Link>
                .
              </p>
            </div>

            {/* Género */}
            <div>
              <label htmlFor="genero" className="block text-sm font-medium text-gray-700">
                Género{' '}
                <span className="text-gray-400 font-normal">(opcional)</span>
              </label>
              <select
                id="genero"
                name="genero"
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                defaultValue=""
              >
                <option value="">Prefiero no responder</option>
                <option value="hombre">Hombre</option>
                <option value="mujer">Mujer</option>
                <option value="no_binario">No binario</option>
              </select>
            </div>

            {/* Año de nacimiento */}
            <div>
              <label htmlFor="anio_nacimiento" className="block text-sm font-medium text-gray-700">
                Año de nacimiento{' '}
                <span className="text-gray-400 font-normal">(opcional)</span>
              </label>
              <select
                id="anio_nacimiento"
                name="anio_nacimiento"
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                defaultValue=""
              >
                <option value="">Prefiero no responder</option>
                {Array.from({ length: 83 }, (_, i) => new Date().getFullYear() - 17 - i).map((year) => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-400">
                Solo guardamos el año, no la fecha completa. Lo usamos para calcular franjas etarias en nuestras estadísticas de impacto.
              </p>
            </div>
          </div>
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
          {submitting ? 'Creando cuenta…' : 'Crear cuenta'}
        </button>

        <p className="text-center text-sm text-gray-500">
          ¿Ya tienes cuenta?{' '}
          <Link
            href="/login"
            className="font-semibold text-indigo-600 hover:text-indigo-500"
          >
            Inicia sesión aquí
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
