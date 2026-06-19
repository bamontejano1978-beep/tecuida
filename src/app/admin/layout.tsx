/**
 * Admin Layout — Panel de superadministración
 *
 * Server Component que:
 *   1. Verifica que el usuario es superadmin (redirige si no)
 *   2. Renderiza sidebar de navegación + contenido
 *
 * Requisitos: 10.1, 10.2, 10.5
 */

import { redirect } from 'next/navigation'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import Link from 'next/link'
import SignOutButton from '@/components/ui/sign-out-button'

// ---------------------------------------------------------------------------
// Componentes del sidebar
// ---------------------------------------------------------------------------

interface NavItem {
  href: string
  label: string
  icon: React.ReactNode
}

const navItems: NavItem[] = [
  {
    href: '/admin',
    label: 'Dashboard',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
      </svg>
    ),
  },
  {
    href: '/admin/municipios',
    label: 'Municipios',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
      </svg>
    ),
  },
  {
    href: '/admin/aplicaciones',
    label: 'Aplicaciones',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12.25h12M8.25 17.75h12M3.75 6.75h.007v.008H3.75V6.75Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0ZM3.75 12.25h.007v.008H3.75V12.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0ZM3.75 17.75h.007v.008H3.75V17.75Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
      </svg>
    ),
  },
  {
    href: '/admin/aplicaciones/bulk',
    label: 'Modo Bulk',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z" />
      </svg>
    ),
  },
]


// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Verificar que el usuario es superadmin
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Verificar rol en public.users usando admin client
  const adminClient = createAdminClient()
  const { data: userRow } = await adminClient
    .from('users')
    .select('rol, nombre, apellidos, email')
    .eq('id', user.id)
    .single()

  if (!userRow || userRow.rol !== 'superadmin') {
    redirect('/login?error=unauthorized')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 border-r border-gray-200 bg-white">
        {/* Logo */}
        <div className="flex items-center gap-2 h-16 shrink-0 border-b border-gray-200 px-6">
          <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-indigo-600 text-white font-bold text-sm">
            TC
          </div>
          <span className="text-sm font-semibold text-gray-900">TE CUIDA Admin</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
            >
              {item.icon}
              {item.label}
            </Link>
          ))}
        </nav>

        {/* User info + logout */}
        <div className="border-t border-gray-200 px-3 py-4">
          <div className="mb-3 px-3">
            <p className="text-sm font-medium text-gray-900 truncate">
              {userRow.nombre} {userRow.apellidos}
            </p>
            <p className="text-xs text-gray-500 truncate">{userRow.email}</p>
          </div>
          <SignOutButton />
        </div>
      </aside>

      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 inset-x-0 z-40 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center h-7 w-7 rounded bg-indigo-600 text-white font-bold text-xs">
            TC
          </div>
          <span className="text-sm font-semibold">Admin</span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/admin"
            className="text-xs font-medium text-gray-600 hover:text-gray-900"
          >
            Dashboard
          </Link>
          <Link
            href="/admin/municipios"
            className="text-xs font-medium text-gray-600 hover:text-gray-900"
          >
            Municipios
          </Link>
          <Link
            href="/admin/aplicaciones"
            className="text-xs font-medium text-gray-600 hover:text-gray-900"
          >
            Aplicaciones
          </Link>
          <Link
            href="/admin/aplicaciones/bulk"
            className="text-xs font-medium text-gray-600 hover:text-gray-900"
          >
            Bulk
          </Link>
          <SignOutButton />
        </div>
      </div>

      {/* Main content */}
      <main className="flex-1 lg:pl-64 pt-14 lg:pt-0">
        {children}
      </main>
    </div>
  )
}
