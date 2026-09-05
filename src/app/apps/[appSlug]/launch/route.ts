import { NextResponse, type NextRequest } from 'next/server'
import { getPublicApplication } from '@/lib/applications/public-application'
import { getApplicationEntryPath } from '@/lib/application-links'
import { safeLaunchTarget, isIntegratedExternalApp } from '@/lib/applications/launch-target'

export async function GET(
  request: NextRequest,
  { params }: { params: { appSlug: string } },
) {
  const app = await getPublicApplication(params.appSlug)

  if (!app) {
    return NextResponse.redirect(new URL('/404', request.url))
  }

  if (!app.url_acceso) {
    return NextResponse.redirect(new URL(getApplicationEntryPath(app), request.url))
  }

  const target = safeLaunchTarget(app.url_acceso, request.nextUrl.origin)
  if (!target) return NextResponse.json({ error: 'El enlace de esta aplicación no está disponible.' }, { status: 422 })
  // Preserve the municipal shell for reviewed integrations; never forward query credentials.
  if (isIntegratedExternalApp(target.href)) {
    return NextResponse.redirect(new URL(`${getApplicationEntryPath(app)}/run`, request.url))
  }
  return NextResponse.redirect(target)
}
