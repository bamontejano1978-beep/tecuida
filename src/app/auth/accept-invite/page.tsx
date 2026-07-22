'use client'

import { FormEvent, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type InviteDetails = {
  email: string
  estado: 'pendiente' | 'aceptada'
  municipality_name: string
}

const MANAGER_INVITE_OTP_TYPES = [
  'invite',
  'recovery',
  'magiclink',
  'email',
  'signup',
] as const

type ManagerInviteOtpType = (typeof MANAGER_INVITE_OTP_TYPES)[number]

function isManagerInviteOtpType(type: string | null): type is ManagerInviteOtpType {
  return MANAGER_INVITE_OTP_TYPES.includes(type as ManagerInviteOtpType)
}

function friendlyAuthError(reason: unknown) {
  const message = reason instanceof Error ? reason.message : ''
  const lower = message.toLowerCase()

  if (
    lower.includes('expired') ||
    lower.includes('invalid') ||
    lower.includes('token') ||
    lower.includes('email link')
  ) {
    return 'El enlace de acceso no es valido o ha caducado. Pide al administrador que pulse "Reenviar" y usa el enlace nuevo.'
  }

  return message || 'No se pudo abrir la invitacion.'
}

export default function AcceptManagerInvitePage() {
  const router = useRouter()
  const [details, setDetails] = useState<InviteDetails | null>(null)
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    async function recoverInvitationSession() {
      const supabase = createClient()
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''))
      const query = new URLSearchParams(window.location.search)
      const accessToken = hash.get('access_token')
      const refreshToken = hash.get('refresh_token')
      const tokenHash = query.get('token_hash')
      const type = query.get('type')
      const authError = hash.get('error_description') || query.get('error_description')

      if (authError) throw new Error(decodeURIComponent(authError.replace(/\+/g, ' ')))

      if (accessToken && refreshToken) {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        })
        if (sessionError) throw sessionError
        window.history.replaceState({}, '', '/auth/accept-invite')
      } else if (tokenHash && isManagerInviteOtpType(type)) {
        const { error: otpError } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type,
        })
        if (otpError) throw otpError
        window.history.replaceState({}, '', '/auth/accept-invite')
      } else if (tokenHash) {
        throw new Error('Tipo de enlace de acceso no compatible.')
      }

      const response = await fetch('/api/auth/manager-invitation/accept', {
        cache: 'no-store',
      })
      const body = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(body.error || 'La invitación no es válida o ha caducado.')
      }

      if (active) setDetails(body as InviteDetails)
    }

    recoverInvitationSession()
      .catch((reason) => {
        if (active) {
          setError(friendlyAuthError(reason))
        }
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => { active = false }
  }, [])

  async function acceptInvitation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.')
      return
    }
    if (password !== confirmation) {
      setError('Las contraseñas no coinciden.')
      return
    }

    setSaving(true)
    try {
      const supabase = createClient()
      const { error: passwordError } = await supabase.auth.updateUser({ password })
      if (passwordError) throw passwordError

      const response = await fetch('/api/auth/manager-invitation/accept', {
        method: 'POST',
      })
      const body = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(body.error || 'No se pudo aceptar la invitación.')

      router.replace(body.redirect_to || '/municipio/estadisticas')
      router.refresh()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudo aceptar la invitación.')
      setSaving(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <section className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
        <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-600 text-lg font-bold text-white">
          TC
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Acceso de gestor municipal</h1>

        {loading && <p className="mt-4 text-sm text-gray-500">Comprobando la invitación…</p>}

        {!loading && error && !details && (
          <div className="mt-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {details && (
          <>
            <p className="mt-2 text-sm text-gray-600">
              Has sido invitado a gestionar <strong>{details.municipality_name}</strong> con el correo {details.email}.
            </p>
            <form onSubmit={acceptInvitation} className="mt-6 space-y-4">
              <label className="block text-sm font-medium text-gray-700">
                Crea tu contraseña
                <input
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2"
                />
              </label>
              <label className="block text-sm font-medium text-gray-700">
                Repite la contraseña
                <input
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  required
                  value={confirmation}
                  onChange={(event) => setConfirmation(event.target.value)}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2"
                />
              </label>
              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  {error}
                </div>
              )}
              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
              >
                {saving ? 'Activando acceso…' : 'Activar cuenta de gestor'}
              </button>
            </form>
          </>
        )}
      </section>
    </main>
  )
}
