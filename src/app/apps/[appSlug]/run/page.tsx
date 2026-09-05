import { notFound } from 'next/navigation'
import { getPublicApplication } from '@/lib/applications/public-application'
import { isIntegratedExternalApp } from '@/lib/applications/launch-target'
import ExternalApplication from '@/components/landing/external-application'

export default async function RunApplication({ params }: { params: { appSlug: string } }) {
  const app = await getPublicApplication(params.appSlug)
  if (!app?.url_acceso || !isIntegratedExternalApp(app.url_acceso)) notFound()
  return <ExternalApplication id={app.id} name={app.nombre} src={app.url_acceso} />
}
