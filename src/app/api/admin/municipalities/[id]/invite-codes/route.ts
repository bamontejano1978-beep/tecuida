import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { verifyAdminAccess } from '@/lib/admin/auth'
import { checkRateLimitAsync } from '@/lib/admin/rate-limit'
import { createAdminClient } from '@/lib/supabase/server'
import {
  generateMunicipalInviteCode,
  hashInviteCode,
  isInviteCodesConfigured,
} from '@/lib/auth/municipal-invite-codes'
import { getBatchCapability } from '@/lib/ods/batch-app-capability'

const RequestSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('generate'),
    nombre: z.string().trim().min(1).max(100),
    cantidad: z.number().int().min(1).max(500),
    expires_in_days: z.number().int().min(1).max(365),
    // Categoría del lote (migración 070): 'acceso' = alta de ciudadanos
    // (registro); 'ods' = invitaciones a aplicaciones (programa ODS).
    proposito: z.enum(['acceso', 'ods']).optional(),
    // Programa ODS (migración 069): app pre-asignada al lote. Todos los
    // códigos del lote concederán esta aplicación al activarse. Solo
    // admite en lotes 'ods'.
    application_id: z.string().uuid().nullish(),
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

export async function POST(
  request: Request,
  { params }: { params: { id: string } },
) {
  const rateLimit = await checkRateLimitAsync(request, {
    limit: 20,
    windowMs: 60_000,
    namespace: 'admin:invite-codes',
  })
  if (rateLimit) return rateLimit

  const adminUser = await verifyAdminAccess()
  if (adminUser instanceof NextResponse) return adminUser

  const parsed = RequestSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos inválidos' }, { status: 422 })
  }

  const supabase = createAdminClient()
  const { data: municipality, error: municipalityError } = await supabase
    .from('municipalities')
    .select('id, slug')
    .eq('id', params.id)
    .eq('oculto_admin', false)
    .single()

  if (municipalityError || !municipality) {
    return NextResponse.json({ error: 'Municipio no encontrado' }, { status: 404 })
  }

  try {
    if (
      !isInviteCodesConfigured() &&
      (parsed.data.action === 'generate' ||
        (parsed.data.action === 'set_required' && parsed.data.enabled))
    ) {
      return NextResponse.json(
        { error: 'Configura INVITE_CODE_PEPPER antes de generar o exigir códigos.' },
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

      // Capacidades de BD (migraciones 069/070). Sin las columnas, las
      // peticiones se degradan: sin 070 todo lote es 'acceso' (clásico) y
      // sin 069 no hay app pre-asignada (el ciudadano elige al activar).
      const capability = await getBatchCapability()
      const proposito = parsed.data.proposito ?? 'acceso'
      if (parsed.data.proposito === 'ods' && !capability.hasPurposeColumn) {
        return NextResponse.json(
          { error: 'Aún no está activa la categoría ODS en la base de datos (migración 070 pendiente).' },
          { status: 503 },
        )
      }

      // Validación de la app pre-asignada (migración 069): solo en lotes ODS,
      // debe existir, pertenecer al municipio y estar publicada y activa en él.
      // Si la BD aún no tiene la 069, se ignora la app solicitada (modo 068).
      let assignedApplicationId: string | null = null
      if (parsed.data.application_id) {
        if (proposito !== 'ods') {
          return NextResponse.json(
            { error: 'La aplicación pre-asignada solo admite en lotes del programa ODS.' },
            { status: 422 },
          )
        }
        const { data: appRow } = await supabase
          .from('municipality_applications')
          .select('application_id')
          .eq('municipality_id', municipality.id)
          .eq('application_id', parsed.data.application_id)
          .eq('activa', true)
          .eq('publication_status', 'publicada')
          .limit(1)
          .maybeSingle()
        if (!appRow) {
          return NextResponse.json(
            { error: 'La aplicación indicada no está publicada en este municipio.' },
            { status: 422 },
          )
        }
        // Solo escribir la columna si la migración 069 está aplicada;
        // si no, se ignora la app solicitada (modo 068).
        if (capability.hasAppColumn) {
          assignedApplicationId = parsed.data.application_id
        }
      }

      const batchPayload: Record<string, unknown> = {
        municipality_id: municipality.id,
        nombre: parsed.data.nombre,
        cantidad: parsed.data.cantidad,
        expires_at: expiresAt,
        created_by: adminUser.id,
      }
      // Columnas solo presentes si la BD ya tiene las migraciones aplicadas;
      // si no, no se envían (modo clásico).
      if (capability.hasPurposeColumn) {
        batchPayload.proposito = proposito
      }
      if (assignedApplicationId) {
        batchPayload.application_id = assignedApplicationId
      }

      const { data: batch, error: batchError } = await supabase
        .from('municipal_invite_batches')
        .insert(batchPayload)
        .select('id')
        .single()

      if (batchError || !batch) throw new Error(batchError?.message || 'No se pudo crear el lote')

      const rows = codes.map((code) => ({
        batch_id: batch.id,
        municipality_id: municipality.id,
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

      revalidatePath(`/admin/municipios/${params.id}/codigos`)
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
          .eq('municipality_id', municipality.id)
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
        .eq('id', municipality.id)
      if (error) throw new Error(error.message)

      revalidatePath(`/admin/municipios/${params.id}/codigos`)
      return NextResponse.json({ enabled: parsed.data.enabled })
    }

    const { data: batch, error: batchError } = await supabase
      .from('municipal_invite_batches')
      .select('id')
      .eq('id', parsed.data.batch_id)
      .eq('municipality_id', municipality.id)
      .single()
    if (batchError || !batch) {
      return NextResponse.json({ error: 'Lote no encontrado' }, { status: 404 })
    }

    const revokedAt = new Date().toISOString()
    const { error: revokeBatchError } = await supabase
      .from('municipal_invite_batches')
      .update({ estado: 'revocado', revoked_at: revokedAt })
      .eq('id', batch.id)
    if (revokeBatchError) throw new Error(revokeBatchError.message)

    const { error: revokeCodesError } = await supabase
      .from('municipal_invite_codes')
      .update({ estado: 'revocado', reservation_token: null, reserved_until: null, reserved_email_hash: null })
      .eq('batch_id', batch.id)
      .in('estado', ['disponible', 'reservado'])
    if (revokeCodesError) throw new Error(revokeCodesError.message)

    revalidatePath(`/admin/municipios/${params.id}/codigos`)
    return NextResponse.json({ revoked: true })
  } catch (error) {
    console.error('[invite-codes]', error)
    return NextResponse.json(
      { error: 'No se pudo completar la operación con los códigos.' },
      { status: 500 },
    )
  }
}
