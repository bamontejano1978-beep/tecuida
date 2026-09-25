import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getPublicApplication } from '@/lib/applications/public-application'
import { isIntegratedExternalApp } from '@/lib/applications/launch-target'
import ExternalApplication from '@/components/landing/external-application'
import { checkAppGrantAccess } from '@/lib/ods/grants'

export const dynamic = 'force-dynamic'

export default async function RunApplication({ params }: { params: { appSlug: string } }) {
  const app = await getPublicApplication(params.appSlug)
  if (!app?.url_acceso || !isIntegratedExternalApp(app.url_acceso)) notFound()

  // Programa ODS (migración 068): en modo 'grant', exigir concesión activa.
  const access = await checkAppGrantAccess(app.id)
  if (access.allowed === false) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center bg-gray-50 px-4 py-16">
        <div className="max-w-md rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center">
          <h1 className="text-lg font-bold text-amber-900">Recurso no activado</h1>
          <p className="mt-2 text-sm text-amber-800">
            Esta aplicación forma parte del programa ODS y se activa con el código que recibes
            por correo tras participar con tu idea en la urna.
          </p>
          <Link
            href="/activar"
            className="mt-4 inline-block rounded-xl bg-amber-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-amber-700"
          >
            Activar con mi código ODS
          </Link>
        </div>
      </main>
    )
  }

  return <ExternalApplication id={app.id} name={app.nombre} src={app.url_acceso} />
}
