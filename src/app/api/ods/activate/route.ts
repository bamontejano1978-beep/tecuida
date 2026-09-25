import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { checkRateLimitAsync } from '@/lib/admin/rate-limit'
import { hashInviteCode, normalizeInviteCode } from '@/lib/auth/municipal-invite-codes'
import { hashDestinationEmail } from '@/lib/ods/destination-crypto'

/**
 * POST /api/ods/activate
 *
 * Activa un código ODS y concede acceso a una aplicación:
 *   - Si el lote del código tiene app pre-asignada (migración 069), esa
 *     es la concedida y el cliente no necesita enviar application_id.
 *   - Si no, se usa la application_id elegida por el ciudadano.
 * Toda la lógica de negocio (correo destino, caducidad, app publicada,
 * límite semanal, app no repetida, consumo y concesión) vive en la función
 * transaccional `activate_code_grant` (migraciones 068/069).
 */

const schema = z.object({
  code: z.string().trim().min(8).max(64),
  application_id: z.string().uuid().nullish(),
})

const ERROR_MESSAGES: Record<string, string> = {
  CODE_NOT_FOUND: 'Código no válido. Revisa que lo hayas copiado bien.',
  CODE_EMAIL_MISMATCH:
    'Este código fue emitido para otro correo. Regístrate o inicia sesión con el correo que escribiste en tu tarjeta.',
  CODE_NOT_ACTIVE: 'Este código ya no está disponible (consumido, caducado o revocado).',
  // Migración 070: el código pertenece a un lote de 'acceso' (alta de
  // ciudadanos), no del programa ODS; no concede aplicaciones.
  CODE_NOT_ODS:
    'Este código es de acceso al registro municipal, no del programa de recursos. Revisa la tarjeta o el correo donde te lo enviaron.',
  APP_REQUIRED: 'Falta la aplicación a activar. Vuelve a introducir tu código en /activar.',
  APP_NOT_AVAILABLE: 'La aplicación elegida no está disponible en tu municipio.',
  WEEKLY_LIMIT_REACHED:
    'Ya has activado un recurso esta semana. Podrás activar otro a partir del lunes.',
  APP_ALREADY_GRANTED: 'Ya tienes acceso a esa aplicación. Elige otra distinta.',
  USER_WITHOUT_MUNICIPALITY: 'Tu cuenta no tiene municipio asignado.',
}

function mapError(message: string): string {
  const key = Object.keys(ERROR_MESSAGES).find((k) => message.includes(k))
  return key ? ERROR_MESSAGES[key] : 'No se pudo activar el código. Inténtalo de nuevo.'
}

export async function POST(request: Request) {
  const limited = await checkRateLimitAsync(request, {
    namespace: 'citizen:ods-activate',
    limit: 10,
    windowMs: 60_000,
  })
  if (limited) return limited

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  // El código ODS se activa con el correo destino autenticado.
  if (!user || !user.email) {
    return NextResponse.json(
      { error: 'Inicia sesión con el correo de tu tarjeta para activar el código.' },
      { status: 401 },
    )
  }

  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos inválidos.' }, { status: 422 })
  }

  const admin = createAdminClient()
  const { data: grantId, error } = await admin.rpc('activate_code_grant', {
    p_code_hash: hashInviteCode(normalizeInviteCode(parsed.data.code)),
    p_email_hash: hashDestinationEmail(user.email),
    p_user_id: user.id,
    // NULL cuando el lote trae la app pre-asignada (migración 069).
    p_application_id: parsed.data.application_id ?? null,
  })

  if (error) {
    return NextResponse.json({ error: mapError(error.message) }, { status: 422 })
  }

  return NextResponse.json({ application_id: grantId }, { status: 200 })
}
