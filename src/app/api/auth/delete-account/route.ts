/**
 * API Route — Eliminación de cuenta RGPD
 *
 * POST /api/auth/delete-account
 *   Solicita la eliminación. Requiere reingreso de contraseña.
 *   Genera un token único, lo almacena en public.users y devuelve
 *   la URL de confirmación.
 *
 * GET /api/auth/delete-account?token=XXX
 *   Confirma la eliminación con el token. Valida expiración (1h).
 *   Borra datos del usuario, anonimiza analytics y elimina la cuenta
 *   de auth.users.
 */

import { createServerClient } from '@supabase/ssr'
import { type NextRequest, NextResponse } from 'next/server'
import { createAuthCookiesAdapter, createReadOnlyCookiesAdapter } from '@/lib/supabase/cookies'
import { randomUUID } from 'crypto'
import { requestSchema, isTokenExpired } from '@/lib/delete-account-utils'

// ---------------------------------------------------------------------------
// POST — Solicitar eliminación
// ---------------------------------------------------------------------------

async function handleRequestDeletion(request: NextRequest) {
  const { origin } = new URL(request.url)

  try {
    // 1. Autenticar usuario
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: createAuthCookiesAdapter(request.cookies) },
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user?.email) {
      return NextResponse.json({ error: 'No autenticado.' }, { status: 401 })
    }

    // 2. Validar contraseña
    const formData = await request.formData()
    const parsed = requestSchema.safeParse({
      password: formData.get('password'),
    })

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message || 'Contraseña requerida.' },
        { status: 400 },
      )
    }

    // Verificar contraseña re-login
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: parsed.data.password,
    })

    if (signInError) {
      return NextResponse.json(
        { error: 'Contraseña incorrecta. Inténtalo de nuevo.' },
        { status: 403 },
      )
    }

    // 3. Generar token y guardarlo
    const token = randomUUID()
    const adminClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: createReadOnlyCookiesAdapter(),
        auth: { autoRefreshToken: false, persistSession: false },
      },
    )

    const { error: updateError } = await adminClient
      .from('users')
      .update({
        deletion_token: token,
        deletion_requested_at: new Date().toISOString(),
      })
      .eq('id', user.id)

    if (updateError) {
      console.error('[delete-account] Error guardando token:', updateError)
      return NextResponse.json(
        { error: 'Error interno al procesar la solicitud.' },
        { status: 500 },
      )
    }

    // 4. Construir URL de confirmación
    const confirmationUrl = `${origin}/api/auth/delete-account?token=${token}`

    // 5. Intentar enviar email (best-effort). Si no hay proveedor configurado,
    //    la URL se muestra en la UI como fallback.
    try {
      await sendDeletionEmail(user.email, confirmationUrl)
    } catch (emailErr) {
      console.warn(
        '[delete-account] No se pudo enviar el email de confirmación — la URL se mostrará en pantalla.',
        emailErr,
      )
    }

    return NextResponse.json({
      message:
        'Te hemos enviado un email con el enlace de confirmación. Revisa tu bandeja de entrada (y spam).',
      confirmationUrl,
    })
  } catch (err) {
    console.error('[delete-account] Error en solicitud:', err)
    return NextResponse.json(
      { error: 'Error inesperado. Inténtalo de nuevo.' },
      { status: 500 },
    )
  }
}

// ---------------------------------------------------------------------------
// Envío de email (función interna)
// ---------------------------------------------------------------------------

async function sendDeletionEmail(
  email: string,
  confirmationUrl: string,
): Promise<void> {
  // Si hay una API key de Resend configurada, usarla
  const resendKey = process.env.RESEND_API_KEY
  if (resendKey) {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${resendKey}`,
      },
      body: JSON.stringify({
        from: 'TE CUIDA <no-reply@tecuida.group>',
        to: email,
        subject: 'Confirma la eliminación de tu cuenta — TE CUIDA',
        html: deletionEmailHtml(email, confirmationUrl),
      }),
    })

    if (!res.ok) {
      const body = await res.text()
      throw new Error(`Resend API error: ${res.status} ${body}`)
    }
    return
  }

  // Sin proveedor de email configurado: informamos por consola y la UI
  // muestra el enlace como fallback.
  console.log(
    `[delete-account] Email NO enviado (sin RESEND_API_KEY).\n` +
      `  Para: ${email}\n` +
      `  Link: ${confirmationUrl}\n` +
      `  ⚠️  Muestra este link al usuario como fallback.`,
  )
}

function deletionEmailHtml(email: string, link: string): string {
  return `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"></head>
<body style="font-family: system-ui, sans-serif; background:#f7f1e7; padding:40px 20px; color:#1a2e1d;">
  <div style="max-width:520px; margin:0 auto; background:white; border-radius:16px; padding:32px; box-shadow:0 8px 40px rgba(0,0,0,.08);">
    <div style="font-size:28px; font-weight:bold; color:#142c19; margin-bottom:16px;">TE CUIDA</div>
    <h1 style="font-size:22px; color:#1a2e1d; margin:0 0 12px;">Confirmación de eliminación de cuenta</h1>
    <p style="color:#52604e; line-height:1.6;">
      Hemos recibido una solicitud para <strong>eliminar permanentemente</strong> tu cuenta de TE CUIDA
      asociada a <strong>${email}</strong>.
    </p>
    <p style="color:#52604e; line-height:1.6;">
      Si has sido tú, haz clic en el botón de abajo para confirmar la eliminación.
      <strong>Esta acción es irreversible</strong>: todos tus datos personales, progreso y
      configuración se borrarán de forma permanente.
    </p>
    <div style="text-align:center; margin:28px 0;">
      <a href="${link}" style="display:inline-block; background:#dc2626; color:white; padding:14px 32px; border-radius:10px; text-decoration:none; font-weight:bold; font-size:15px;">
        Eliminar mi cuenta →
      </a>
    </div>
    <p style="color:#64705e; font-size:13px;">
      Este enlace caduca en <strong>1 hora</strong>. Si no has solicitado esta eliminación,
      puedes ignorar este mensaje — tu cuenta seguirá segura.
    </p>
    <hr style="border:none; border-top:1px solid #e5e7eb; margin:24px 0;">
    <p style="color:#9ca3af; font-size:12px; margin:0;">
      TE CUIDA — Plataforma de bienestar ciudadano<br>
      Este es un mensaje automático, por favor no respondas a este correo.
    </p>
  </div>
</body>
</html>`
}

// ---------------------------------------------------------------------------
// GET — Confirmar eliminación con token
// ---------------------------------------------------------------------------

async function handleConfirmDeletion(request: NextRequest) {
  const { origin } = new URL(request.url)
  const token = request.nextUrl.searchParams.get('token')

  if (!token) {
    return NextResponse.redirect(
      `${origin}/perfil?error=${encodeURIComponent('Token de confirmación no proporcionado.')}`,
      303,
    )
  }

  try {
    // 1. Buscar usuario por token
    const adminClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: createReadOnlyCookiesAdapter(),
        auth: { autoRefreshToken: false, persistSession: false },
      },
    )

    const { data: targetUser } = await adminClient
      .from('users')
      .select('id, deletion_token, deletion_requested_at, email')
      .eq('deletion_token', token)
      .single()

    if (!targetUser) {
      return NextResponse.redirect(
        `${origin}/perfil?error=${encodeURIComponent('Token inválido o ya utilizado.')}`,
        303,
      )
    }

    // 2. Validar expiración (1 hora) usando función pura testable
    if (isTokenExpired(targetUser.deletion_requested_at)) {
      // Limpiar token expirado
      await adminClient
        .from('users')
        .update({ deletion_token: null, deletion_requested_at: null })
        .eq('id', targetUser.id)

      return NextResponse.redirect(
        `${origin}/perfil?error=${encodeURIComponent('El enlace ha caducado (más de 1 hora). Solicita una nueva eliminación.')}`,
        303,
      )
    }

    const userId = targetUser.id

    // 3. Anonimizar eventos de analytics (RGPD: conservar datos agregados, eliminar PII)
    try {
      await adminClient
        .from('analytics_events')
        .update({ user_id: null })
        .eq('user_id', userId)
    } catch (err) {
      console.error('[delete-account] Error anonimizando analytics:', err)
      // No bloqueante: continuamos con el borrado
    }

    // 4. Borrar progreso del usuario
    try {
      await adminClient
        .from('user_progress')
        .delete()
        .eq('user_id', userId)
    } catch (err) {
      console.error('[delete-account] Error borrando progreso:', err)
    }

    // 5. Borrar fila de public.users
    try {
      await adminClient
        .from('users')
        .delete()
        .eq('id', userId)
    } catch (err) {
      console.error('[delete-account] Error borrando usuario:', err)
      return NextResponse.redirect(
        `${origin}/perfil?error=${encodeURIComponent('Error al eliminar tu cuenta. Contacta con soporte.')}`,
        303,
      )
    }

    // 6. Borrar usuario de auth.users (Supabase Auth)
    try {
      await adminClient.auth.admin.deleteUser(userId)
    } catch (err) {
      console.error('[delete-account] Error borrando auth user:', err)
      // Si llegamos aquí, public.users ya está borrado. El auth user
      // quedará huérfano pero sin datos personales asociados.
    }

    // 7. Redirigir a página de despedida
    return NextResponse.redirect(
      `${origin}/login?message=${encodeURIComponent('Tu cuenta ha sido eliminada. Gracias por haber formado parte de TE CUIDA.')}`,
      303,
    )
  } catch (err) {
    console.error('[delete-account] Error en confirmación:', err)
    return NextResponse.redirect(
      `${origin}/perfil?error=${encodeURIComponent('Error inesperado al eliminar tu cuenta.')}`,
      303,
    )
  }
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  return handleRequestDeletion(request)
}

export async function GET(request: NextRequest) {
  return handleConfirmDeletion(request)
}
