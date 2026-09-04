import { NextResponse, type NextRequest } from 'next/server'
import { getPublicApplication } from '@/lib/applications/public-application'
import { getApplicationEntryPath } from '@/lib/application-links'

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

  const target = app.url_acceso.startsWith('/')
    ? new URL(app.url_acceso, request.url)
    : new URL(app.url_acceso)
  request.nextUrl.searchParams.forEach((value, key) => {
    target.searchParams.append(key, value)
  })

  return NextResponse.redirect(target)
}
