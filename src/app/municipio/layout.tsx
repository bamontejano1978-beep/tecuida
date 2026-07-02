/**
 * Municipio Admin Layout — Panel de gestor municipal
 *
 * Server Component que:
 *   1. Verifica que el usuario está autenticado
 *   2. Verifica que tiene rol 'admin_municipio' o 'superadmin'
 *   3. Si es admin_municipio, obtiene su municipality_id de la DB
 *   4. Si es superadmin, permite elegir municipio vía query param
 *   5. Pasa el municipality_id a los hijos vía prop drilling (no hay contexto en SC)
 *
 * Requisitos: 10.1, 10.2
 */

import { redirect } from 'next/navigation'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import Link from 'next/link'
import SignOutButton from '@/components/ui/sign-out-button'

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export interface MunicipioAdminContext {
  userId: string
  userEmail: string
  userDisplayName: string
  municipioId: string
  municipioNombre: string
  rol: 'admin_municipio' | 'superadmin'
}

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

export default async function MunicipioLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Verificar rol y obtener municipality_id
  const adminClient = createAdminClient()
  const { data: userRow } = await adminClient
    .from('users')
    .select('id, email, nombre, apellidos, alias, rol, municipality_id, municipality:municipalities!inner(nombre_municipio)')
    .eq('id', user.id)
    .single()

  if (!userRow) {
    redirect('/login?error=unauthorized')
  }

  const rol = userRow.rol as string
  const isSuperadmin = rol === 'superadmin'
  const isMunicipioAdmin = rol === 'admin_municipio'

  if (!isSuperadmin && !isMunicipioAdmin) {
    redirect('/login?error=unauthorized')
  }

  const municipioId = userRow.municipality_id as string
  const municipioNombre = (userRow.municipality as unknown as { nombre_municipio: string })?.nombre_municipio || 'Tu municipio'
  const displayName = (userRow.alias || userRow.nombre || userRow.email) as string

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header minimalista */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-200">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-emerald-600 text-white font-bold text-sm">
                  TC
                </div>
                <span className="text-sm font-semibold text-gray-900">
                  {isSuperadmin
                    ? 'TE CUIDA · Panel municipal'
                    : `TE CUIDA · ${municipioNombre}`
                  }
                </span>
              </div>
              <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 border border-emerald-200">
                {isSuperadmin ? 'Superadmin' : 'Gestor municipal'}
              </span>
            </div>

            <div className="flex items-center gap-4">
              <Link
                href="/municipio/estadisticas"
                className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
              >
                📊 Estadísticas
              </Link>
              {isSuperadmin && (
                <Link
                  href="/admin"
                  className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
                >
                  Panel admin
                </Link>
              )}
              <div className="flex items-center gap-3 pl-4 border-l border-gray-200">
                <span className="text-sm text-gray-500 truncate max-w-[160px]">
                  {displayName}
                </span>
                <SignOutButton />
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Contenido */}
      <main className="flex-1">
        {/* Pasar municipioId implícitamente: los Server Components hijos
            leerán el searchParams o el municipality_id desde la sesión */}
        {children}
      </main>

      {/* Footer sutil */}
      <footer className="border-t border-gray-200 bg-white py-3">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="text-xs text-gray-400 text-center">
            Panel de gestión municipal · TE CUIDA · Datos agregados y anónimos (RGPD)
          </p>
        </div>
      </footer>
    </div>
  )
}
