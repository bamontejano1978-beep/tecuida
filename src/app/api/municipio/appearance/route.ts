import { revalidatePath } from 'next/cache'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getAdminAccess } from '@/lib/admin/activities'
import { checkRateLimitAsync } from '@/lib/admin/rate-limit'
import { createAdminClient } from '@/lib/supabase/server'
import { tenantCache } from '@/lib/tenant/cache'
import { CreateMunicipalitySchema } from '@/lib/validations/municipality'

const AppearanceSchema = CreateMunicipalitySchema.pick({
  colores_corporativos: true,
  hero_image_url: true,
  escudo_url: true,
  logo_url: true,
  layout_variant: true,
  textos_institucionales: true,
}).extend({
  hero_image_url: z.string().url().nullable().optional(),
  escudo_url: z.string().url().nullable().optional(),
  logo_url: z.string().url().nullable().optional(),
})

export async function PUT(request: Request) {
  const rateLimit = await checkRateLimitAsync(request, {
    limit: 20,
    windowMs: 60_000,
    namespace: 'municipio:appearance',
  })
  if (rateLimit) return rateLimit

  const access = await getAdminAccess()
  if (!access) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })
  }
  if (access.is_superadmin || !access.municipality_id) {
    return NextResponse.json(
      { error: 'Esta ruta está reservada a gestores municipales.' },
      { status: 403 },
    )
  }

  const parsed = AppearanceSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Datos inválidos.', details: parsed.error.flatten().fieldErrors },
      { status: 422 },
    )
  }

  const supabase = createAdminClient()
  const { data: existing, error: existingError } = await supabase
    .from('municipalities')
    .select('id, slug')
    .eq('id', access.municipality_id)
    .single()

  if (existingError || !existing) {
    return NextResponse.json(
      { error: 'Municipio no encontrado.' },
      { status: 404 },
    )
  }

  const { data, error } = await supabase
    .from('municipalities')
    .update(parsed.data)
    .eq('id', access.municipality_id)
    .select(
      'id, slug, colores_corporativos, hero_image_url, escudo_url, logo_url, layout_variant, textos_institucionales',
    )
    .single()

  if (error) {
    console.error('[PUT /api/municipio/appearance]', error.message)
    return NextResponse.json(
      { error: 'No se pudo actualizar la apariencia.' },
      { status: 500 },
    )
  }

  await tenantCache.delete(existing.slug as string)
  revalidatePath('/')
  revalidatePath('/municipio/apariencia')
  revalidatePath('/dashboard')
  revalidatePath('/dashboard/aplicaciones')

  return NextResponse.json({ data })
}
