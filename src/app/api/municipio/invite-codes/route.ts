import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { checkRateLimitAsync } from '@/lib/admin/rate-limit'
import { getAdminAccess } from '@/lib/admin/activities'
import { createAdminClient } from '@/lib/supabase/server'
import {
  generateMunicipalInviteCode,
  hashInviteCode,
  isInviteCodesConfigured,
} from '@/lib/auth/municipal-invite-codes'

const RequestSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('generate'),
    nombre: z.string().trim().min(1).max(100),
    cantidad: z.number().int().min(1).max(500),
    expires_in_days: z.number().int().min(1).max(365),
  }),
  z.object({
    action: z.literal('set_required'),
    enabled: z.boolean(),
  }),
  z.object({
    action: z.literal('revoke_batch'),
    batch_id: z.string().uuid(),
  }),
])

export async function POST(request: Request) {
  const rateLimit = await checkRateLimitAsync(request, {
    limit: 20,
    windowMs: 60_000,
    namespace: 'municipio:invite-codes',
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

  const parsed = RequestSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos inválidos.' }, { status: 422 })
  }

  const supabase = createAdminClient()
  const municipalityId = access.municipality_id
  const { data: municipality, error: municipalityError } = await supabase
    .from('municipalities')
    .select('id, slug')
    .eq('id', municipalityId)
    .eq('oculto_admin', false)
    .single()

  if (municipalityError || !municipality) {
    return NextResponse.json({ error: 'Municipio no encontrado.' }, { status: 404 })
  }

  try {
    if (
      !isInviteCodesConfigured() &&
      (parsed.data.action === 'generate' ||
        (parsed.data.action === 'set_required' && parsed.data.enabled))
    ) {
      return NextResponse.json(
        { error: 'La generación de códigos no está configurada.' },
        { status: 503 },
      )
    }

    if (parsed.data.action === 'generate') {
      const expiresAt = new Date(
        Date.now() + parsed.data.expires_in_days * 86_400_000,
      ).toISOString()
      const codes = Array.from({ length: parsed.data.cantidad }, () =>
        generateMunicipalInviteCode(municipality.slug),
      )

      const { data: batch, error: batchError } = await supabase
        .from('municipal_invite_batches')
        .insert({
          municipality_id: municipalityId,
          nombre: parsed.data.nombre,
          cantidad: parsed.data.cantidad,
          expires_at: expiresAt,
          created_by: access.user_id,
        })
        .select('id')
        .single()

      if (batchError || !batch) {
        throw new Error(batchError?.message || 'No se pudo crear el lote')
      }

      const rows = codes.map((code) => ({
        batch_id: batch.id,
        municipality_id: municipalityId,
        code_value: code,
        code_hash: hashInviteCode(code),
        code_prefix: `${code.slice(0, 7)}…`,
        expires_at: expiresAt,
      }))
      const { error: codesError } = await supabase
        .from('municipal_invite_codes')
        .insert(rows)

      if (codesError) {
        await supabase.from('municipal_invite_batches').delete().eq('id', batch.id)
        throw new Error(codesError.message)
      }

      revalidatePath('/municipio/codigos')
      return NextResponse.json({
        batch_id: batch.id,
        nombre: parsed.data.nombre,
        expires_at: expiresAt,
        codes,
      }, { status: 201 })
    }

    if (parsed.data.action === 'set_required') {
      if (parsed.data.enabled) {
        const now = new Date().toISOString()
        const { data: available } = await supabase
          .from('municipal_invite_codes')
          .select('id')
          .eq('municipality_id', municipalityId)
          .eq('estado', 'disponible')
          .or(`expires_at.is.null,expires_at.gt.${now}`)
          .limit(1)
        if (!available?.length) {
          return NextResponse.json(
            { error: 'Genera al menos un código vigente antes de activar la restricción.' },
            { status: 422 },
          )
        }
      }

      const { error } = await supabase
        .from('municipalities')
        .update({ invite_codes_required: parsed.data.enabled })
        .eq('id', municipalityId)
      if (error) throw new Error(error.message)

      revalidatePath('/municipio/codigos')
      return NextResponse.json({ enabled: parsed.data.enabled })
    }

    const { data: batch, error: batchError } = await supabase
      .from('municipal_invite_batches')
      .select('id')
      .eq('id', parsed.data.batch_id)
      .eq('municipality_id', municipalityId)
      .single()
    if (batchError || !batch) {
      return NextResponse.json({ error: 'Lote no encontrado.' }, { status: 404 })
    }

    const revokedAt = new Date().toISOString()
    const { error: revokeBatchError } = await supabase
      .from('municipal_invite_batches')
      .update({ estado: 'revocado', revoked_at: revokedAt })
      .eq('id', batch.id)
      .eq('municipality_id', municipalityId)
    if (revokeBatchError) throw new Error(revokeBatchError.message)

    const { error: revokeCodesError } = await supabase
      .from('municipal_invite_codes')
      .update({
        estado: 'revocado',
        reservation_token: null,
        reserved_until: null,
        reserved_email_hash: null,
      })
      .eq('batch_id', batch.id)
      .eq('municipality_id', municipalityId)
      .in('estado', ['disponible', 'reservado'])
    if (revokeCodesError) throw new Error(revokeCodesError.message)

    revalidatePath('/municipio/codigos')
    return NextResponse.json({ revoked: true })
  } catch (error) {
    console.error('[municipio/invite-codes]', error)
    return NextResponse.json(
      { error: 'No se pudo completar la operación con los códigos.' },
      { status: 500 },
    )
  }
}
