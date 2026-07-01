/**
 * DeleteAccountSection — Sección de eliminación de cuenta RGPD
 *
 * Client Component que:
 *   1. Muestra un aviso de advertencia sobre eliminación permanente
 *   2. Al hacer clic en "Eliminar mi cuenta", abre un modal de confirmación
 *   3. Requiere reingreso de contraseña (seguridad anti-CSRF)
 *   4. Envía POST /api/auth/delete-account → genera token + email
 *   5. Muestra instrucciones con el enlace de confirmación (fallback si no hay email)
 *
 * Derecho RGPD: Supresión (art. 17) / «derecho al olvido».
 */

'use client'

import { useState } from 'react'
import Link from 'next/link'

interface DeleteAccountSectionProps {
  userEmail: string
}

type Step =
  | 'idle'       // Botón de eliminar visible
  | 'confirm'    // Modal abierto, pide contraseña
  | 'loading'    // Enviando solicitud (modal visible con spinner)
  | 'success'    // Token generado, mostrar instrucciones

export default function DeleteAccountSection({
  userEmail,
}: DeleteAccountSectionProps) {
  const [step, setStep] = useState<Step>('idle')
  const [password, setPassword] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [confirmationUrl, setConfirmationUrl] = useState('')

  // ────────────────────────────────────────────────────────
  // Abrir / cerrar modal
  // ────────────────────────────────────────────────────────
  function openModal() {
    setStep('confirm')
    setPassword('')
    setErrorMsg('')
  }

  function closeModal() {
    setStep('idle')
    setPassword('')
    setErrorMsg('')
  }

  // ────────────────────────────────────────────────────────
  // Solicitar eliminación
  // ────────────────────────────────────────────────────────
  async function handleRequestDeletion(e: React.FormEvent) {
    e.preventDefault()

    if (!password.trim()) {
      setErrorMsg('Debes introducir tu contraseña actual.')
      return
    }

    setStep('loading')
    setErrorMsg('')

    try {
      const formData = new FormData()
      formData.set('password', password)

      const res = await fetch('/api/auth/delete-account', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const body = await res.json()
        throw new Error(
          (body as { error?: string }).error || `Error ${res.status}`,
        )
      }

      const data = await res.json()
      const url = (data as { confirmationUrl?: string }).confirmationUrl || ''

      setConfirmationUrl(url)
      setStep('success')
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Error al procesar la solicitud.',
      )
      setStep('confirm')
    }
  }

  // ────────────────────────────────────────────────────────
  // Fase 1: idle — botón de eliminar
  // ────────────────────────────────────────────────────────
  if (step === 'idle') {
    return (
      <div className="bg-white rounded-xl border border-red-200 p-6">
        <div className="flex items-start gap-3">
          <span className="text-2xl shrink-0" aria-hidden="true">
            ⚠️
          </span>
          <div className="flex-1">
            <h3 className="text-base font-bold text-red-700">
              Zona de peligro — Eliminar cuenta
            </h3>
            <p className="mt-1 text-sm text-gray-600 leading-relaxed">
              Esta acción es <strong>permanente e irreversible</strong>. Se
              eliminarán todos tus datos personales, progreso en programas y
              configuración. Los datos anónimos de uso agregados se conservarán
              sin vinculación a tu identidad.
            </p>
            <p className="mt-2 text-xs text-gray-400">
              Derecho RGPD:{' '}
              <Link
                href="/privacidad"
                className="text-indigo-600 underline hover:text-indigo-500"
              >
                Artículo 17 — Derecho de supresión («derecho al olvido»)
              </Link>
            </p>
            <button
              type="button"
              onClick={openModal}
              className="mt-4 inline-flex items-center rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors"
            >
              Eliminar mi cuenta
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ────────────────────────────────────────────────────────
  // Fase 2: success — instrucciones de confirmación
  // ────────────────────────────────────────────────────────
  if (step === 'success') {
    return (
      <div className="bg-white rounded-xl border border-amber-200 p-6">
        <div className="flex items-start gap-3">
          <span className="text-2xl shrink-0" aria-hidden="true">
            📨
          </span>
          <div className="flex-1">
            <h3 className="text-base font-bold text-amber-800">
              Revisa tu correo electrónico
            </h3>
            <p className="mt-1 text-sm text-gray-600 leading-relaxed">
              Hemos enviado un enlace de confirmación a{' '}
              <strong>{userEmail}</strong>. Haz clic en el enlace para completar
              la eliminación. El enlace caduca en 1 hora.
            </p>
            <p className="mt-2 text-xs text-gray-400">
              Si no recibes el correo, revisa la carpeta de spam. También puedes
              usar este enlace directo:
            </p>
            {confirmationUrl ? (
              <div className="mt-2 rounded-md bg-gray-50 border border-gray-200 p-3">
                <p className="text-xs text-gray-500 mb-1 break-all font-mono select-all">
                  {confirmationUrl}
                </p>
                <a
                  href={confirmationUrl}
                  className="inline-flex items-center rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500 transition-colors mt-2"
                >
                  Confirmar eliminación →
                </a>
              </div>
            ) : (
              <p className="mt-3 text-sm text-red-600">
                No se pudo generar el enlace. Intenta de nuevo.
              </p>
            )}
            <button
              type="button"
              onClick={closeModal}
              className="mt-4 text-sm text-gray-500 underline hover:text-gray-700"
            >
              Cancelar — no quiero eliminar mi cuenta
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ────────────────────────────────────────────────────────
  // Fase 3: confirm / loading — modal con formulario
  // ────────────────────────────────────────────────────────
  // (step puede ser 'confirm' o 'loading' — en ambos casos
  //  se muestra el modal, y en 'loading' el botón gira)
  const isLoading = step === 'loading'

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center px-4"
      onClick={isLoading ? undefined : closeModal}
      role="dialog"
      aria-modal="true"
      aria-label="Confirmar eliminación de cuenta"
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3 mb-5">
          <span className="text-3xl shrink-0" aria-hidden="true">
            ⚠️
          </span>
          <div>
            <h3 className="text-lg font-bold text-gray-900">
              ¿Estás seguro?
            </h3>
            <p className="mt-1 text-sm text-gray-600 leading-relaxed">
              Esta acción <strong>no se puede deshacer</strong>. Se eliminarán
              permanentemente todos tus datos personales, progreso en programas
              y configuración.
            </p>
          </div>
        </div>

        <form onSubmit={handleRequestDeletion} className="space-y-4">
          {/* Error */}
          {errorMsg && (
            <div className="rounded-md bg-red-50 border border-red-200 p-3">
              <p className="text-sm text-red-700">{errorMsg}</p>
            </div>
          )}

          {/* Aviso: qué se borra */}
          <div className="rounded-md bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800 leading-relaxed">
            <p className="font-semibold mb-1">
              Esto es lo que se eliminará:
            </p>
            <ul className="list-disc pl-4 space-y-0.5">
              <li>Tu cuenta y todos tus datos personales (email, alias, género, año de nacimiento)</li>
              <li>Tu progreso en todos los programas</li>
              <li>Tu configuración de notificaciones</li>
              <li>Los datos agregados y anónimos de uso <strong>se conservarán</strong> sin vinculación a tu identidad</li>
            </ul>
          </div>

          {/* Contraseña */}
          <div>
            <label
              htmlFor="delete-password"
              className="block text-sm font-medium text-gray-700"
            >
              Introduce tu contraseña para confirmar
            </label>
            <input
              id="delete-password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                setErrorMsg('')
              }}
              disabled={isLoading}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-red-500 focus:ring-2 focus:ring-red-200 outline-none disabled:opacity-50"
              placeholder="Tu contraseña actual"
            />
          </div>

          {/* Botones */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={closeModal}
              disabled={isLoading}
              className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg
                    className="animate-spin h-4 w-4"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  Enviando…
                </span>
              ) : (
                'Sí, solicitar eliminación'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
