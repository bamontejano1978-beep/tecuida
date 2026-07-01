/**
 * Página de perfil del ciudadano — TE CUIDA
 *
 * Server Component que:
 *   1. Verifica autenticación
 *   2. Muestra datos del perfil (nombre, email, municipio)
 *   3. Permite editar nombre, apellidos, teléfono, fecha nacimiento
 *
 * Requisitos: 5.1
 */

import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { getTenantConfigFromDB, getTenantFromHeaders } from '@/lib/tenant/headers'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import ProfileForm from './profile-form'
import NotificationSettings from '@/components/ui/notification-settings'
import DeleteAccountSection from '@/components/ui/delete-account-section'
import type { NotificationPrefs } from '@/components/ui/notification-settings'
import SignOutButton from '@/components/ui/sign-out-button'

// ---------------------------------------------------------------------------
// Página
// ---------------------------------------------------------------------------

export default async function ProfilePage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Tenant
  const tenantHeaders = getTenantFromHeaders()
  const tenant = tenantHeaders?.slug
    ? await getTenantConfigFromDB(tenantHeaders.slug)
    : null

  // Perfil del usuario
  const adminClient = createAdminClient()
  const { data: userProfile } = await adminClient
    .from('users')
    .select('alias, nombre, apellidos, email, genero, anio_nacimiento, telefono, fecha_nacimiento, created_at, notificaciones')
    .eq('id', user.id)
    .single()

  const notifRaw = (userProfile?.notificaciones || {}) as Record<string, unknown>
  const notificaciones: NotificationPrefs = {
    recordatorio_activo: (notifRaw.recordatorio_activo as boolean) || false,
    frecuencia: (notifRaw.frecuencia as NotificationPrefs['frecuencia']) || 'diaria',
    hora: (notifRaw.hora as string) || '09:00',
  }

  // RGPD: mostrar alias si existe, fallback a nombre legacy, o email
  const displayName =
    (userProfile?.alias as string) ||
    (userProfile?.nombre as string) ||
    ''
  const displayInitial = displayName
    ? displayName.charAt(0).toUpperCase()
    : (userProfile?.email as string || user.email || '?').charAt(0).toUpperCase()

  const profile = {
    alias: (userProfile?.alias as string) || '',
    nombre: (userProfile?.nombre as string) || '',
    apellidos: (userProfile?.apellidos as string) || '',
    email: (userProfile?.email as string) || user.email || '',
    genero: (userProfile?.genero as string) || '',
    anio_nacimiento: userProfile?.anio_nacimiento ? String(userProfile.anio_nacimiento) : '',
    telefono: (userProfile?.telefono as string) || '',
    fecha_nacimiento: (userProfile?.fecha_nacimiento as string) || '',
    created_at: (userProfile?.created_at as string) || '',
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header institucional */}
      {tenant && (
        <header
          className="relative overflow-hidden"
          style={{ backgroundColor: tenant.colores_corporativos.primary }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
          <div className="relative mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
            <div className="flex items-center gap-4">
              {tenant.escudo_url && (
                <Image
                  src={tenant.escudo_url}
                  alt={`Escudo de ${tenant.nombre_municipio}`}
                  width={40}
                  height={40}
                  className="h-10 w-auto drop-shadow-md"
                />
              )}
              <div>
                <p className="text-xs font-medium text-white/80">
                  {tenant.nombre_ayuntamiento}
                </p>
                <h1 className="text-xl font-bold text-white">
                  Mi perfil
                </h1>
              </div>
            </div>
          </div>
          <div className="relative h-5">
            <svg
              className="absolute bottom-0 w-full h-5 text-gray-50"
              viewBox="0 0 1440 20"
              fill="currentColor"
              preserveAspectRatio="none"
            >
              <path d="M0,10 C240,20 480,0 720,10 C960,20 1200,0 1440,10 L1440,20 L0,20 Z" />
            </svg>
          </div>
        </header>
      )}

      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Navegación */}
        <div className="flex items-center gap-3 mb-6">
          <Link
            href="/dashboard"
            className="text-sm font-medium text-indigo-600 hover:text-indigo-500 transition-colors"
          >
            ← Dashboard
          </Link>
          <span className="text-gray-300">|</span>
          <Link
            href="/"
            className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            Catálogo
          </Link>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Sidebar: avatar + info básica */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-indigo-100">
                <span className="text-2xl font-bold text-indigo-600">
                  {displayInitial}
                </span>
              </div>
              <h2 className="mt-4 text-lg font-semibold text-gray-900">
                {displayName || 'Usuario'}
              </h2>
              <p className="mt-1 text-sm text-gray-500">{profile.email}</p>
              {tenant && (
                <p className="mt-1 text-xs text-gray-400">
                  {tenant.nombre_municipio}
                </p>
              )}
              <p className="mt-3 text-xs text-gray-400">
                Miembro desde{' '}
                {profile.created_at
                  ? new Date(profile.created_at).toLocaleDateString('es', {
                      year: 'numeric',
                      month: 'long',
                    })
                  : '—'}
              </p>
            </div>

            {/* Enlaces rápidos */}
            <div className="mt-4 space-y-1">
              <Link
                href="/dashboard"
                className="block rounded-lg px-4 py-2 text-sm text-gray-600 hover:bg-white hover:text-gray-900 transition-colors"
              >
                📊 Mi progreso
              </Link>
              <Link
                href="/"
                className="block rounded-lg px-4 py-2 text-sm text-gray-600 hover:bg-white hover:text-gray-900 transition-colors"
              >
                📚 Catálogo de programas
              </Link>
              <div className="pt-2 mt-2 border-t border-gray-100">
                <SignOutButton />
              </div>
            </div>
          </div>

          {/* Formulario de edición */}
          <div className="lg:col-span-2 space-y-6">
            <ProfileForm userId={user.id} initialData={profile} />
            <NotificationSettings userId={user.id} initialPrefs={notificaciones} />
            <DeleteAccountSection userEmail={profile.email} />
          </div>
        </div>
      </main>
    </div>
  )
}
