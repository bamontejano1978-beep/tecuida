import { NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { listActiveGrants, currentWeekMonday } from '@/lib/ods/grants'

/**
 * GET /api/ods/eligibility
 *
 * Devuelve, para el ciudadano autenticado:
 *  - applications: apps publicadas en su municipio que aún NO tiene concedidas
 *    (con thumbnail y slug para pintar el selector).
 *  - weekly_used: si ya activó una concesión en la semana ISO en curso.
 */
export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Inicia sesión.' }, { status: 401 })

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('users')
    .select('municipality_id')
    .eq('id', user.id)
    .maybeSingle()
  if (!profile?.municipality_id) {
    return NextResponse.json({ error: 'Municipio no disponible.' }, { status: 403 })
  }

  const [{ data: apps }, grants] = await Promise.all([
    admin
      .from('municipality_applications')
      .select(
        `application_id, thumbnail_url_override,
         application:applications!inner (id, nombre, descripcion, thumbnail_url, tipo, app_slug)`,
      )
      .eq('municipality_id', profile.municipality_id)
      .eq('activa', true)
      .eq('publication_status', 'publicada'),
    listActiveGrants(user.id),
  ])

  const grantedIds = new Set(grants.map((g) => g.application_id))
  interface EligibilityRow {
    application: {
      id: string
      nombre: string
      descripcion: string | null
      thumbnail_url: string | null
      tipo: string
      app_slug: string | null
    } | null
    thumbnail_url_override: string | null
  }
  const applications = ((apps || []) as unknown as EligibilityRow[])
    .filter((row) => row.application && !grantedIds.has(row.application.id))
    .map((row) => row.application!)

  // Semana ISO en curso (Europe/Madrid), misma definición que ods_week_monday().
  const weekStart = new Date(`${currentWeekMonday()}T00:00:00+02:00`)
  const weeklyUsed = grants.some((g) => new Date(g.granted_at) >= weekStart)

  return NextResponse.json({ applications, weekly_used: weeklyUsed })
}
