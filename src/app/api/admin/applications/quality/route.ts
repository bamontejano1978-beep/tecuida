import { NextResponse } from 'next/server'
import { z } from 'zod'
import { verifyAdminAccess } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/server'
import { checkRateLimitAsync } from '@/lib/admin/rate-limit'
import { allowedHealthUrl, CUSTOM_NATIVE_APPS, inspectApplication, type QualityApplication } from '@/lib/applications/library-quality'

export async function POST(request: Request) {
  const access = await verifyAdminAccess()
  if (access instanceof NextResponse) return access
  const limited = await checkRateLimitAsync(request, { namespace: 'library:quality', limit: 60, windowMs: 60_000 })
  if (limited) return limited
  const parsed = z.object({ application_id: z.string().uuid() }).safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Datos inválidos.' }, { status: 422 })
  const admin = createAdminClient()
  const { data, error } = await admin.from('applications')
    .select('id,nombre,descripcion,thumbnail_url,app_slug,url_acceso,tipo,launch_mode').eq('activa', true)
  if (error) return NextResponse.json({ error: 'No se pudo cargar la biblioteca.' }, { status: 503 })
  const catalog = (data || []) as QualityApplication[]
  const app = catalog.find((item) => item.id === parsed.data.application_id)
  if (!app) return NextResponse.json({ error: 'Aplicación no encontrada.' }, { status: 404 })
  const issues = inspectApplication(app, catalog)
  let broken = false
  if (app.url_acceso) {
    const target = allowedHealthUrl(app.url_acceso)
    if (!target) issues.push('El enlace necesita revisión manual: origen no autorizado para la comprobación automática.')
    else {
      try {
        const result = await fetch(target, { method: 'GET', redirect: 'manual', cache: 'no-store', signal: AbortSignal.timeout(8000) })
        await result.body?.cancel()
        if (result.status >= 300 && result.status < 400) issues.push(`El enlace redirige (HTTP ${result.status}); revisa el destino.`)
        else if (!result.ok) { broken = true; issues.push(`El enlace devuelve HTTP ${result.status}.`) }
      } catch { broken = true; issues.push('No se pudo abrir el enlace en 8 segundos. Puede ser un fallo temporal.') }
    }
  } else if (!CUSTOM_NATIVE_APPS.has(app.app_slug || '')) {
    if (app.tipo === 'programa') {
      const { data: lessons, error: contentError } = await admin.from('programs')
        .select('id, modules:program_modules(id, lessons(id))').eq('application_id', app.id)
      if (contentError) issues.push('No se pudo comprobar el contenido del programa.')
      else if (!lessons?.some((program) => program.modules?.some((module) => module.lessons?.length))) {
        broken = true; issues.push('El programa no tiene lecciones disponibles.')
      }
    } else issues.push('Revisa que la ficha incluya un recurso utilizable o un enlace de acceso.')
  }
  const check = { application_id: app.id, checked_at: new Date().toISOString(), status: broken ? 'error' : issues.length ? 'warning' : 'ok', issues, checked_by: access.id }
  const { error: saveError } = await admin.from('application_quality_checks').upsert(check)
  if (saveError) return NextResponse.json({ error: 'No se pudo guardar la revisión.' }, { status: 503 })
  return NextResponse.json({ check })
}
