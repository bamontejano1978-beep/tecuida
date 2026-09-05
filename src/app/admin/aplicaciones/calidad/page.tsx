import Link from 'next/link'
import { requireSuperadminPage } from '@/lib/admin/page-auth'
import { createAdminClient } from '@/lib/supabase/server'
import QualityManager, { type QualityCheck } from './quality-manager'

export default async function LibraryQualityPage() {
  await requireSuperadminPage()
  const admin = createAdminClient()
  const [apps, checks] = await Promise.all([
    admin.from('applications').select('id, nombre').eq('activa', true).order('nombre'),
    admin.from('application_quality_checks').select('application_id, checked_at, status, issues'),
  ])
  return <div className="mx-auto w-full min-w-0 max-w-7xl px-4 py-8 sm:px-6">
    <Link href="/admin/aplicaciones" className="text-sm text-gray-600 underline">Volver a aplicaciones</Link>
    <h1 className="mt-4 text-2xl font-bold">Calidad de la biblioteca</h1>
    {(apps.error || checks.error) && <p role="alert" className="mt-4 text-red-700">No se ha podido cargar la revisión de la biblioteca.</p>}
    <QualityManager apps={apps.data || []} initialChecks={(checks.data || []) as QualityCheck[]} />
  </div>
}
