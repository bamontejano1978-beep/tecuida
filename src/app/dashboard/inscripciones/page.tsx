/**
 * Dashboard > Mis inscripciones — TE CUIDA
 *
 * Server Component que muestra todas las inscripciones del ciudadano
 * actual a actividades del marketplace, con opción de cancelar desde aquí.
 *
 * Seguridad: usa `createClient()` (anon con cookies de sesión) que pasa
 * por RLS de `public.activity_inscriptions`. La policy
 *   "Usuarios ven sus inscripciones" USING (auth.uid() = user_id)
 * aísla automáticamente las filas por user_id — no hace falta filtrar
 * manualmente en el WHERE: RLS ya lo hace.
 *
 * La cancelación NO ocurre en este componente: delega al endpoint DELETE
 * /api/activities/[id]/inscription (que llama al RPC 044 atómico).
 * Tras DELETE, el cliente hace router.refresh() → el server re-renderiza
 * esta misma página con la fila actualizada.
 */

import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getTenantConfigFromDB, getTenantFromHeaders } from '@/lib/tenant/headers'
import SignOutButton from '@/components/ui/sign-out-button'
import InscriptionsList, { type InscriptionRow } from '@/components/dashboard/inscriptions-list'

export default async function MyInscriptionsPage() {
  // 1. Auth gate
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // 2. Tenant context (visual identity + back-link)
  const tenantHeaders = getTenantFromHeaders()
  const tenant = tenantHeaders?.slug
    ? await getTenantConfigFromDB(tenantHeaders.slug)
    : null

  // 3. Inscriptions del usuario con JOIN a activities.
  //    RLS (auth.uid() = user_id) ya filtra por usuario — el eq(user_id)
  //    abajo es defensa redundante, la dejo para claridad operativa.
  const { data: inscriptionData, error: inscrError } = await supabase
    .from('activity_inscriptions')
    .select(
      `id,
       activity_id,
       estado,
       notas,
       created_at,
       activity:activities (
         id,
         nombre,
         fecha_inicio,
         modalidad,
         thumbnail_url,
         plazas_inscritas,
         aforo
       )`,
    )
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(100)

  if (inscrError) {
    console.error('[dashboard/inscripciones]', inscrError.message)
  }

  const rows = (inscriptionData || []) as unknown as InscriptionRow[]
  const activas = rows.filter((r) => r.estado === 'confirmada').length

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header institucional (mismo lenguaje visual que /dashboard) */}
      {tenant && (
        <header
          className="relative overflow-hidden"
          style={{ backgroundColor: tenant.colores_corporativos.primary }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
          <div className="relative mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
            <Link
              href="/dashboard"
              className="text-xs font-medium text-white/70 hover:text-white inline-flex items-center gap-1"
            >
              ← Volver al dashboard
            </Link>
            <p className="mt-3 text-sm font-medium text-white/80">
              {tenant.nombre_ayuntamiento}
            </p>
            <h1 className="text-2xl font-bold text-white">
              🎟️ Mis inscripciones
            </h1>
          </div>
          <div className="relative h-6">
            <svg
              className="absolute bottom-0 w-full h-6 text-gray-50"
              viewBox="0 0 1440 24"
              fill="currentColor"
              preserveAspectRatio="none"
            >
              <path d="M0,12 C240,24 480,0 720,12 C960,24 1200,0 1440,12 L1440,24 L0,24 Z" />
            </svg>
          </div>
        </header>
      )}

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Stats rápidas */}
        <div className="grid gap-4 sm:grid-cols-3 mb-8">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-3xl font-bold text-emerald-600">{activas}</p>
            <p className="mt-1 text-sm text-gray-500">
              {activas === 1 ? 'Inscripción activa' : 'Inscripciones activas'}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-3xl font-bold text-sky-600">{rows.length}</p>
            <p className="mt-1 text-sm text-gray-500">En total (histórico)</p>
          </div>
          <Link
            href="/actividades"
            className="bg-gradient-to-br from-indigo-600 to-indigo-700 text-white rounded-xl p-5 hover:from-indigo-500 hover:to-indigo-600 transition-all shadow-sm flex flex-col justify-between"
          >
            <p className="font-bold">Explorar marketplace</p>
            <p className="text-sm text-indigo-100">
              Ver talleres y eventos disponibles →
            </p>
          </Link>
        </div>

        {/* Cuerpo */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          {rows.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-5xl mb-4">🎟️</p>
              <p className="text-base font-medium text-gray-900">
                Todavía no te has apuntado a ninguna actividad
              </p>
              <p className="mt-2 text-sm text-gray-500">
                Visita el catálogo y reserva tu plaza en talleres, eventos
                o cursos del municipio.
              </p>
              <Link
                href="/actividades"
                className="mt-6 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors"
              >
                Explorar actividades
              </Link>
            </div>
          ) : (
            <InscriptionsList rows={rows} />
          )}
        </div>

        <div className="mt-6">
          <SignOutButton />
        </div>
      </main>
    </div>
  )
}
