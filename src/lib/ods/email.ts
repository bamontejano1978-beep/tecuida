import 'server-only'

/**
 * Envío de correo transaccional con Resend.
 *
 * Sigue el patrón ya usado en `managers/route.ts` y `delete-account/route.ts`
 * (fetch a api.resend.com con RESEND_API_KEY), centralizado aquí para el
 * programa ODS.
 */

const RESEND_ENDPOINT = 'https://api.resend.com/emails'

export const ODS_PROGRAM_TAGLINE = 'Una idea para mejorar Villafranca. Un recurso para cuidarte a ti.'

export interface EmailResult {
  ok: boolean
  error?: string
}

export function isEmailSendingConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY)
}

interface SendArgs {
  to: string
  subject: string
  html: string
  from?: string
}

export async function sendEmail({ to, subject, html, from }: SendArgs): Promise<EmailResult> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return { ok: false, error: 'RESEND_API_KEY no configurada' }

  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        // Mismo remitente verificado que usa el flujo de invitaciones (managers).
        from: from || process.env.ODS_EMAIL_FROM || process.env.RESEND_FROM_EMAIL || 'TE CUIDA <no-reply@tecuida.group>',
        to: [to],
        subject,
        html,
      }),
    })
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      return { ok: false, error: `Resend API ${res.status}: ${body.slice(0, 200)}` }
    }
    return { ok: true }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Error de red' }
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** Plantilla del correo con el código ODS individual.
 *
 * `applicationName` (migración 069): cuando el lote del código tiene una
 * app pre-asignada, el correo lo indica y aclara que la activación da
 * acceso directo a esa aplicación (el ciudadano no elige). Si no hay app
 * asignada, el texto clásico se mantiene y el ciudadano elige al activar.
 */
export function renderOdsCodeEmail({
  code,
  activateUrl,
  expiresAt,
  applicationName,
}: {
  code: string
  activateUrl: string
  expiresAt?: string | null
  applicationName?: string | null
}): string {
  const expiry = expiresAt
    ? `<p style="color:#6b7280;font-size:14px">Este código caduca el ${new Date(expiresAt).toLocaleDateString('es-ES')}.</p>`
    : ''
  const appIntro = applicationName
    ? `Tu código individual de acceso a <strong>${escapeHtml(applicationName)}</strong> es:`
    : 'Tu código individual de acceso es:'
  const appNote = applicationName
    ? `<p style="font-size:14px;color:#374151">
      Al activar el código tendrás acceso directo a <strong>${escapeHtml(applicationName)}</strong>,
      el recurso elegido para esta edición del programa.
    </p>`
    : ''
  const buttonLabel = applicationName
    ? `Activar ${escapeHtml(applicationName)}`
    : 'Activar mi recurso'
  return `
  <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:560px;margin:0 auto;padding:24px">
    <p style="font-size:16px;color:#111827">Hola,</p>
    <p style="font-size:16px;color:#111827">
      Gracias por participar en el programa <strong>ODS de VCA TE CUIDA</strong>.
      ${escapeHtml(ODS_PROGRAM_TAGLINE)}
    </p>
    <p style="font-size:16px;color:#111827">${appIntro}</p>
    <p style="font-size:28px;font-weight:700;letter-spacing:2px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;background:#f3f4f6;padding:16px;border-radius:12px;text-align:center">${escapeHtml(code)}</p>
    ${appNote}
    <p style="margin:24px 0">
      <a href="${activateUrl}"
         style="background:#4f46e5;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:12px;font-weight:600;display:inline-block">
        ${buttonLabel}
      </a>
    </p>
    <p style="font-size:14px;color:#374151">
      Regístrate o inicia sesión en VCA TE CUIDA <strong>con este mismo correo electrónico</strong>
      (el que escribiste en tu tarjeta) para poder activar el código.
    </p>
    ${expiry}
    <p style="font-size:12px;color:#9ca3af;margin-top:32px">
      Si no has participado en el programa ODS de tu ayuntamiento, ignora este mensaje.
    </p>
  </div>`
}

export async function sendOdsCodeEmail({
  to,
  code,
  activateUrl,
  expiresAt,
  applicationName,
}: {
  to: string
  code: string
  activateUrl: string
  expiresAt?: string | null
  applicationName?: string | null
}): Promise<EmailResult> {
  return sendEmail({
    to,
    subject: applicationName
      ? `Tu acceso a ${applicationName} · VCA TE CUIDA`
      : 'Tu código de acceso a VCA TE CUIDA',
    html: renderOdsCodeEmail({ code, activateUrl, expiresAt, applicationName }),
  })
}
