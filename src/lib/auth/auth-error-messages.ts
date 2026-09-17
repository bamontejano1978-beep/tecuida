/**
 * Traducción de los errores de Supabase Auth que llegan al ciudadano.
 *
 * Supabase responde con mensajes técnicos en inglés («email rate limit
 * exceeded», «For security purposes, you can only request this after 58
 * seconds.») que hasta ahora se mostraban tal cual en el formulario de
 * registro: el ciudadano leía un error que no podía ni entender ni resolver.
 *
 * El caso más habitual no es un fallo del alta, sino un problema de ENVÍO de
 * correo: Supabase limita cuántos emails de confirmación manda por hora, así
 * que un pico de registros (una campaña, una presentación pública) agota la
 * cuota y a partir de ahí todas las altas fallan. Eso hay que decirlo con
 * claridad, porque la solución no es reintentar diez veces.
 *
 * El mensaje original se registra siempre en el servidor (console.error) para
 * poder diagnosticar sin exponerlo en pantalla.
 */

/** El proyecto agotó su cuota de envío de correos de autenticación. */
const EMAIL_SEND_LIMIT =
  'Ahora mismo no podemos enviar el correo de confirmación: se ha alcanzado el límite de envíos. Vuelve a intentarlo dentro de un rato y, si sigue fallando, avisa a tu ayuntamiento.'

/** Fallo genérico de alta, en español y sin culpar a quien lo lee. */
const GENERIC_FAILURE =
  'No se pudo crear la cuenta en este momento. Vuelve a intentarlo en unos minutos.'

/**
 * Describe un fallo de ENVÍO de correo, o devuelve `null` si el error no
 * tiene que ver con el envío (en cuyo caso no conviene comunicarlo: podría
 * revelar si un correo existe o no).
 */
export function describeEmailSendFailure(message: string): string | null {
  const lower = message.toLowerCase()

  if (lower.includes('email rate limit exceeded') || lower.includes('over_email_send_rate_limit')) {
    return EMAIL_SEND_LIMIT
  }

  if (lower.includes('for security purposes') || lower.includes('over_request_rate_limit')) {
    const seconds = message.match(/after (\d+) seconds/i)?.[1]
    return seconds
      ? `Por seguridad hay que esperar ${seconds} segundos antes de volver a intentarlo con este correo.`
      : 'Se han hecho demasiados intentos seguidos. Espera un minuto y vuelve a intentarlo.'
  }

  return null
}

/**
 * Mensaje para el ciudadano ante un error de alta. Los casos conocidos se
 * explican; el resto se resume en un mensaje neutro en español.
 */
export function describeCitizenAuthError(message: string): string {
  const sendFailure = describeEmailSendFailure(message)
  if (sendFailure) return sendFailure

  const lower = message.toLowerCase()

  if (lower.includes('email address not authorized')) {
    return 'Ese correo no está autorizado para registrarse en la plataforma. Avisa a tu ayuntamiento.'
  }

  if (lower.includes('signups not allowed')) {
    return 'El registro está cerrado en este momento. Inténtalo más tarde o avisa a tu ayuntamiento.'
  }

  if (lower.includes('unable to validate email address') || lower.includes('invalid format')) {
    return 'Ese correo electrónico no parece válido. Revísalo e inténtalo de nuevo.'
  }

  return GENERIC_FAILURE
}
