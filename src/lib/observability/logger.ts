export type LogLevel = 'info' | 'warn' | 'error'

function serializeError(error: unknown) {
  if (!(error instanceof Error)) return error ? String(error) : undefined
  return {
    name: error.name,
    message: error.message,
    stack: process.env.NODE_ENV === 'production' ? undefined : error.stack,
  }
}

/** Logs JSON consultables y correlacionables en Vercel, sin incluir cuerpos ni PII. */
export function logEvent(
  level: LogLevel,
  event: string,
  context: Record<string, unknown> = {},
  error?: unknown,
) {
  const entry = JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    event,
    deployment: process.env.VERCEL_GIT_COMMIT_SHA || 'local',
    ...context,
    error: serializeError(error),
  })
  console[level](entry)
}

/** Aviso opcional a un webhook operativo configurado en el gestor de secretos. */
export async function notifyOperationalAlert(
  event: string,
  context: Record<string, unknown> = {},
) {
  const webhookUrl = process.env.HEALTH_ALERT_WEBHOOK_URL
  if (!webhookUrl) return
  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event, timestamp: new Date().toISOString(), ...context }),
      signal: AbortSignal.timeout(5_000),
    })
  } catch (error) {
    logEvent('error', 'operational_alert_failed', { sourceEvent: event }, error)
  }
}
