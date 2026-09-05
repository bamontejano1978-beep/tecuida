import Image from 'next/image'
import Link from 'next/link'
import TrackedApplicationLink from '@/components/analytics/tracked-application-link'
import { getApplicationEntryPath } from '@/lib/application-links'

export default function QuickApplications({ applications, municipalityId }: {
  applications: { id: string; nombre: string; appSlug: string | null; thumbnailUrl: string | null; favorite: boolean }[]
  municipalityId: string | null
}) {
  if (!applications.length) return null
  return <section aria-label="Tus aplicaciones a mano" className="mb-8 border-b border-gray-200 pb-6">
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-bold text-gray-900">Tus aplicaciones a mano</h2><Link href="/dashboard/aplicaciones" className="py-2 text-sm font-semibold text-emerald-800 underline">Ver todas</Link></div>
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {applications.map((app) => <TrackedApplicationLink key={app.id} applicationId={app.id} municipalityId={municipalityId}
        href={getApplicationEntryPath({ id: app.id, app_slug: app.appSlug })}
        className="flex min-w-0 items-center gap-3 rounded-lg border border-gray-200 bg-white p-3 hover:border-emerald-600 focus-visible:ring-2 focus-visible:ring-emerald-600">
        {app.thumbnailUrl && <Image src={app.thumbnailUrl} alt="" width={40} height={40} className="h-10 w-10 shrink-0 rounded-md object-contain" />}
        <span className="min-w-0 break-words text-sm font-semibold">{app.nombre}{app.favorite && <span className="block text-xs font-normal text-rose-700">Favorita</span>}</span>
      </TrackedApplicationLink>)}
    </div>
  </section>
}
