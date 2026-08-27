import { redirect } from 'next/navigation'
import { createAdminClient, createClient } from '@/lib/supabase/server'

/**
 * Barrera para páginas Server Component de /admin.
 *
 * Debe ejecutarse antes de consultar con service_role. Next.js puede
 * renderizar layouts y páginas hijas en paralelo, así que el control del
 * layout por sí solo no impide que datos del hijo entren en el RSC payload.
 */
export async function requireSuperadminPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login?redirect=/admin')
  }

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('users')
    .select('id, rol')
    .eq('id', user.id)
    .maybeSingle()

  if (profile?.rol === 'admin_municipio') {
    redirect('/municipio/estadisticas')
  }

  if (profile?.rol !== 'superadmin') {
    redirect('/dashboard')
  }

  return { id: profile.id as string, email: user.email || '' }
}
