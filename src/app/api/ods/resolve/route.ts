import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { checkRateLimitAsync } from '@/lib/admin/rate-limit'
import { hashInviteCode, normalizeInviteCode } from '@/lib/auth/municipal-invite-codes'
import { hasBatchAppColumn } from '@/lib/ods/batch-app-capability'

/**
 * GET /api/ods/resolve?code=XXXX
 *
 * Devuelve la aplicación pre-asignada al lote del código (migración 069),
 * para que /activar pueda saltarse la elección de app cuando el código
 * ya determina la aplicación a conceder.
 *
 * Solo revela la app si:
 *   - el código existe en el municipio del usuario autenticado,
 *   - su lote tiene application_id, y
 *   - la app está publicada y activa en ese municipio.
 * En cualquier otro caso devuelve assigned: false sin filtrar detalles
 * (la validación estricta ocurre en activate_code_grant al activar).
 */
const schema = z.object({
  code: z.string().trim().min(8).max(64),
})

export async function GET(request: Request) {
  const limited = await checkRateLimitAsync(request, {
    namespace: 'citizen:ods-resolve',
    limit: 20,
    windowMs: 60_000,
  })
  if (limited) return limited

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Inicia sesión.' }, { status: 401 })
  }

  const url = new URL(request.url)
  const parsed = schema.safeParse({ code: url.searchParams.get('code') || '' })
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos inválidos.' }, { status: 422 })
  }

  const admin = createAdminClient()

  const { data: profile } = await admin
    .from('users')
    .select('municipality_id')
    .eq('id', user.id)
    .maybeSingle()
  if (!profile?.municipality_id) {
    return NextResponse.json({ error: 'Municipio no disponible.' }, { status: 403 })
  }

  const codeHash = hashInviteCode(normalizeInviteCode(parsed.data.code))

  // Capacidad 069: sin la columna application_id no puede haber app
  // pre-asignada; respondemos assigned:false directamente (modo 068).
  if (!(await hasBatchAppColumn())) {
    return NextResponse.json({ assigned: false })
  }

  const { data } = await admin
    .from('municipal_invite_codes')
    .select(
      `batch:municipal_invite_batches!inner(application_id,
         application:applications(id, nombre, descripcion, thumbnail_url, tipo, app_slug))`,
    )
    .eq('municipality_id', profile.municipality_id)
    .eq('code_hash', codeHash)
    .limit(1)
    .maybeSingle()

  // Sin join tipado: batch puede venir como objeto o array de 1 según la
  // relación; normalizamos manualmente.
  const batch = (data as unknown as {
    batch?: {
      application_id: string | null
      application?: {
        id: string
        nombre: string
        descripcion: string | null
        thumbnail_url: string | null
        tipo: string
        app_slug: string | null
      } | null
    } | null
  } | null)?.batch ?? null

  const app = batch?.application
  if (!batch?.application_id || !app) {
    return NextResponse.json({ assigned: false })
  }

  // La app debe estar publicada y activa en el municipio del usuario.
  const { data: published } = await admin
    .from('municipality_applications')
    .select('application_id, descripcion_override')
    .eq('municipality_id', profile.municipality_id)
    .eq('application_id', app.id)
    .eq('activa', true)
    .eq('publication_status', 'publicada')
    .limit(1)
    .maybeSingle()

  if (!published) {
    return NextResponse.json({ assigned: false })
  }

  // Migración 073: la descripción específica del municipio manda sobre la global.
  return NextResponse.json({
    assigned: true,
    application: {
      ...app,
      descripcion: published.descripcion_override ?? app.descripcion,
    },
  })
}
