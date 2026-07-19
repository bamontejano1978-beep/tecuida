import { NextResponse } from 'next/server'
import { z } from 'zod'
import { checkRateLimitAsync } from '@/lib/admin/rate-limit'
import { logEvent } from '@/lib/observability/logger'

const ClientErrorSchema = z.object({
  digest: z.string().max(160).optional(),
  path: z.string().max(500).optional(),
  message: z.string().max(300).optional(),
})

export async function POST(request: Request) {
  const rateLimit = await checkRateLimitAsync(request, {
    namespace: 'client-errors',
    limit: 20,
    windowMs: 60_000,
  })
  if (rateLimit) return rateLimit

  const parsed = ClientErrorSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Datos no válidos' }, { status: 422 })

  logEvent('error', 'client_render_error', {
    requestId: request.headers.get('x-request-id'),
    tenantId: request.headers.get('x-tenant-id'),
    ...parsed.data,
  })
  return new NextResponse(null, { status: 204 })
}
