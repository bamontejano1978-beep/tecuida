import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { checkRateLimitAsync } from '@/lib/admin/rate-limit'
import { getAdminAccess } from '@/lib/admin/activities'
import { createAdminClient } from '@/lib/supabase/server'
import { hasBatchAppColumn } from '@/lib/ods/batch-app-capability'
import { hashInviteCode, normalizeInviteCode } from '@/lib/auth/municipal-invite-codes'
import {
  encryptDestinationEmail,
  hashDestinationEmail,
  decryptDestinationEmail,
} from '@/lib/ods/destination-crypto'
import { hashParticipationEmail } from '@/lib/ods/grants'
import { isEmailSendingConfigured, sendOdsCodeEmail } from '@/lib/ods/email'

/**
 * POST /api/municipio/ods — gestión del programa ODS del municipio.
 *
 * Acciones:
 *  - import_destinations: asigna el correo destino a códigos (CSV de urnas).
 *  - send_pending: envía por email los códigos con destino y sin enviar.
 *  - resend_code / update_destination / revoke_code: acciones por código.
 *  - register_participations: registra las participaciones semanales.
 *
 * Solo gestores municipales (municipio propio) y superadmin (con
 * municipality_id explícito). ODS_DESTINATION_KEY y RESEND_API_KEY son
 * necesarios para importar destinos y enviar correos respectivamente.
 */

const destinationRowSchema = z.object({
  code_value: z.string().trim().min(4).max(64),
  email: z.string().trim().email().max(200),
})

const RequestSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('import_destinations'),
    rows: z.array(destinationRowSchema).min(1).max(500),
  }),
  z.object({
    action: z.literal('send_pending'),
    batch_id: z.string().uuid().optional(),
  }),
  z.object({
    action: z.literal('resend_code'),
    code_id: z.string().uuid(),
  }),
  z.object({
    action: z.literal('update_destination'),
    code_id: z.string().uuid(),
    email: z.string().trim().email().max(200),
  }),
  z.object({
    action: z.literal('revoke_code'),
    code_id: z.string().uuid(),
  }),
  z.object({
    action: z.literal('register_participations'),
    week_monday: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    rows: z
      .array(
        z.object({
          email: z.string().trim().email().max(200),
          ods_code: z.number().int().min(1).max(17).optional(),
        }),
      )
      .min(1)
      .max(500),
  }),
])

function odsBaseUrl(request: Request): string {
  const origin = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin
  return `${origin.replace(/\/$/, '')}/activar`
}

export async function POST(request: Request) {
  const limited = await checkRateLimitAsync(request, {
    namespace: 'municipio:ods',
    limit: 20,
    windowMs: 60_000,
  })
  if (limited) return limited

  const access = await getAdminAccess()
  if (!access) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })
  if (access.is_superadmin && !access.municipality_id) {
    return NextResponse.json(
      { error: 'Indica el municipio del programa ODS.' },
      { status: 403 },
    )
  }

  const parsed = RequestSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos inválidos.' }, { status: 422 })
  }

  const supabase = createAdminClient()
  const municipalityId = access.municipality_id as string

  try {
    // ---------------------------------------------------------------
    // import_destinations
    // ---------------------------------------------------------------
    if (parsed.data.action === 'import_destinations') {
      const results: { code_value: string; ok: boolean; error?: string }[] = []
      for (const row of parsed.data.rows) {
        const codeHash = hashInviteCode(normalizeInviteCode(row.code_value))
        const { data: code } = await supabase
          .from('municipal_invite_codes')
          .select('id, estado')
          .eq('municipality_id', municipalityId)
          .eq('code_hash', codeHash)
          .maybeSingle()

        if (!code) {
          results.push({ code_value: row.code_value, ok: false, error: 'Código no encontrado' })
          continue
        }
        if (code.estado === 'consumido' || code.estado === 'revocado') {
          results.push({ code_value: row.code_value, ok: false, error: `Código ${code.estado}` })
          continue
        }

        const { error: updateError } = await supabase
          .from('municipal_invite_codes')
          .update({
            destination_email_hash: hashDestinationEmail(row.email),
            destination_email_encrypted: encryptDestinationEmail(row.email),
          })
          .eq('id', code.id)

        results.push(
          updateError
            ? { code_value: row.code_value, ok: false, error: updateError.message }
            : { code_value: row.code_value, ok: true },
        )
      }
      const okCount = results.filter((r) => r.ok).length
      revalidatePath('/municipio/ods')
      return NextResponse.json({ imported: okCount, results }, { status: 200 })
    }

    // ---------------------------------------------------------------
    // send_pending
    // ---------------------------------------------------------------
    if (parsed.data.action === 'send_pending') {
      if (!isEmailSendingConfigured()) {
        return NextResponse.json(
          { error: 'El envío de correo no está configurado (RESEND_API_KEY).' },
          { status: 503 },
        )
      }
      // Join al lote para saber si el código lleva app pre-asignada
      // (migración 069) y personalizar el correo. Sin la 069, sin join.
      const appJoin = (await hasBatchAppColumn())
        ? ', batch:municipal_invite_batches(application:applications(nombre))'
        : ''
      let query = supabase
        .from('municipal_invite_codes')
        .select(`id, code_value, expires_at, destination_email_encrypted${appJoin}`)
        .eq('municipality_id', municipalityId)
        .in('estado', ['disponible', 'reservado'])
        .not('destination_email_encrypted', 'is', null)
        .is('sent_at', null)
      if (parsed.data.batch_id) query = query.eq('batch_id', parsed.data.batch_id)

      const { data: pendingRaw, error: queryError } = await query
      if (queryError) throw new Error(queryError.message)
      // Cast manual: el select es dinámico (capacidad 069) y el tipado
      // estático de Supabase no puede parsearlo.
      const pending = (pendingRaw ?? []) as unknown as Array<{
        id: string
        code_value: string | null
        expires_at: string | null
        destination_email_encrypted: string | null
        batch?: { application?: { nombre?: string } | null } | null
      }>

      const sent: string[] = []
      const failed: { code_value: string | null; error: string }[] = []
      for (const code of pending || []) {
        const destination = code.destination_email_encrypted
          ? decryptDestinationEmail(code.destination_email_encrypted)
          : null
        if (!destination || !code.code_value) {
          failed.push({
            code_value: code.code_value,
            error: !code.code_value ? 'Código sin valor visible' : 'Destino ilegible',
          })
          continue
        }
        const result = await sendOdsCodeEmail({
          to: destination,
          code: code.code_value,
          activateUrl: odsBaseUrl(request),
          expiresAt: code.expires_at,
          applicationName:
            ((code.batch as { application?: { nombre?: string } | null } | null)?.application
              ?.nombre as string | undefined) || null,
        })
        if (result.ok) {
          const { error: markError } = await supabase
            .from('municipal_invite_codes')
            .update({
              sent_at: new Date().toISOString(),
              last_sent_at: new Date().toISOString(),
              sent_count: 1,
            })
            .eq('id', code.id)
          if (markError) {
            failed.push({ code_value: code.code_value, error: markError.message })
          } else {
            sent.push(destination)
          }
        } else {
          failed.push({ code_value: code.code_value, error: result.error || 'Error de envío' })
        }
      }
      revalidatePath('/municipio/ods')
      return NextResponse.json({ sent: sent.length, failed }, { status: 200 })
    }

    // ---------------------------------------------------------------
    // Acciones sobre un código individual (verificando propiedad)
    // ---------------------------------------------------------------
    const singleCodeActions = ['resend_code', 'update_destination', 'revoke_code'] as const
    if (singleCodeActions.includes(parsed.data.action as (typeof singleCodeActions)[number])) {
      // Join al lote para la app pre-asignada (migración 069) en el reenvío.
      // Sin la 069, sin join (applicationName quedará null).
      const appJoinSingle = (await hasBatchAppColumn())
        ? ', batch:municipal_invite_batches(application:applications(nombre))'
        : ''
      const { data: codeRaw } = await supabase
        .from('municipal_invite_codes')
        .select(`id, estado, code_value, expires_at, destination_email_encrypted, sent_at${appJoinSingle}`)
        .eq('id', (parsed.data as { code_id: string }).code_id)
        .eq('municipality_id', municipalityId)
        .maybeSingle()
      const code = codeRaw as unknown as {
        id: string
        estado: string
        code_value: string | null
        expires_at: string | null
        destination_email_encrypted: string | null
        sent_at: string | null
        batch?: { application?: { nombre?: string } | null } | null
      } | null
      if (!code) return NextResponse.json({ error: 'Código no encontrado.' }, { status: 404 })

      if (parsed.data.action === 'revoke_code') {
        const { error: rpcError } = await supabase.rpc('revoke_invite_code', {
          p_code_id: code.id,
        })
        if (rpcError) throw new Error(rpcError.message)
        revalidatePath('/municipio/ods')
        return NextResponse.json({ revoked: true }, { status: 200 })
      }

      if (parsed.data.action === 'update_destination') {
        const { error: updateError } = await supabase
          .from('municipal_invite_codes')
          .update({
            destination_email_hash: hashDestinationEmail(parsed.data.email),
            destination_email_encrypted: encryptDestinationEmail(parsed.data.email),
            sent_at: null, // vuelve a quedar pendiente de envío al nuevo correo
          })
          .eq('id', code.id)
        if (updateError) throw new Error(updateError.message)
        revalidatePath('/municipio/ods')
        return NextResponse.json({ updated: true }, { status: 200 })
      }

      // resend_code
      if (!isEmailSendingConfigured()) {
        return NextResponse.json(
          { error: 'El envío de correo no está configurado (RESEND_API_KEY).' },
          { status: 503 },
        )
      }
      const destination = code.destination_email_encrypted
        ? decryptDestinationEmail(code.destination_email_encrypted)
        : null
      if (!destination || !code.code_value) {
        return NextResponse.json(
          { error: 'El código no tiene destino legible o valor visible.' },
          { status: 422 },
        )
      }
      const result = await sendOdsCodeEmail({
        to: destination,
        code: code.code_value,
        activateUrl: odsBaseUrl(request),
        expiresAt: code.expires_at,
        applicationName:
          ((code.batch as { application?: { nombre?: string } | null } | null)?.application
            ?.nombre as string | undefined) || null,
      })
      if (!result.ok) {
        return NextResponse.json(
          { error: result.error || 'No se pudo enviar el correo.' },
          { status: 502 },
        )
      }
      const { error: markError } = await supabase
        .from('municipal_invite_codes')
        .update({
          sent_at: code.sent_at || new Date().toISOString(),
          last_sent_at: new Date().toISOString(),
        })
        .eq('id', code.id)
      if (markError) throw new Error(markError.message)
      revalidatePath('/municipio/ods')
      return NextResponse.json({ sent: true }, { status: 200 })
    }

    // ---------------------------------------------------------------
    // register_participations
    // ---------------------------------------------------------------
    if (parsed.data.action === 'register_participations') {
      const weekMonday = parsed.data.week_monday
      // Validar que la fecha es un lunes
      const date = new Date(`${weekMonday}T12:00:00Z`)
      if (Number.isNaN(date.getTime()) || date.getUTCDay() !== 1) {
        return NextResponse.json(
          { error: 'week_monday debe ser el lunes (formato YYYY-MM-DD) de la semana ISO.' },
          { status: 422 },
        )
      }
      const rows = parsed.data.rows.map((row) => ({
        municipality_id: municipalityId,
        week_monday: weekMonday,
        email_hash: hashParticipationEmail(row.email),
        ods_code: row.ods_code ?? null,
        registered_by: access.user_id,
      }))
      const { error: insertError } = await supabase
        .from('ods_weekly_participations')
        .upsert(rows, { onConflict: 'municipality_id,week_monday,email_hash', ignoreDuplicates: true })
      if (insertError) throw new Error(insertError.message)
      revalidatePath('/municipio/ods')
      return NextResponse.json({ registered: rows.length }, { status: 201 })
    }

    return NextResponse.json({ error: 'Acción no soportada.' }, { status: 422 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error inesperado'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
