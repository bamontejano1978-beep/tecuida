/**
 * API Admin — Purga manual del cache de la landing pública
 *
 * POST /api/admin/cache/purge
 *   → revalidateTag(MUNICIPALITY_APPS_TAG) // entradas unstable_cache('municipality-apps')
 *   → revalidatePath('/')                    // red de seguridad: Route Cache de la raíz
 *
 * Cuándo usarlo desde el panel admin (en lugar de `vercel cache invalidate` por CLI):
 *   • Acabas de poblar `municipality_applications` con un seed/INSERT directo
 *     fuera de los endpoints admin y la landing sigue mostrando 0 apps.
 *   • Estás debuggeando un bug relativo a la cache y quieres forzar MISS sin
 *     esperar al TTL de 1h del `unstable_cache`.
 *   • Quieres purgar para todos los tenants desde una sola acción sin abrir
 *     terminal ni depender del Vercel CLI.
 *
 * Idempotente: si la cache ya está invalidada, llamarlo de nuevo sigue
 * haciendo MISS → fetch fresco en la siguiente request (no causa daño).
 *
 * Seguridad (mismo patrón que el resto del admin):
 *   • `verifyAdminAccess()` — requiere sesión activa de superadmin (o
 *     admin_municipio si en el futuro se permite por municipio). Sin
 *     sesión → 401 sin tocar cache.
 *   • `checkRateLimitAsync(request)` — protect contra brute-force del
 *     endpoint. 429 si excede.
 *   • Si alguno de los dos falla, NO se invalida el cache (la BD no cambió:
 *     no hay nada que purgar).
 *
 * Tras éxito, devuelve el tag + path que se invalidaron + timestamp ISO
 * para que el panel admin pueda mostrar feedback al usuario.
 */

import { NextResponse } from 'next/server'
import { revalidateTag, revalidatePath } from 'next/cache'
import { verifyAdminAccess } from '@/lib/admin/auth'
import { checkRateLimitAsync } from '@/lib/admin/rate-limit'
import { MUNICIPALITY_APPS_TAG } from '@/lib/tenant/municipality-apps-cache'

// ────────────────────────────────────────────────────────────────────────────
// POST — Invalidar cache de la landing + Route Cache raíz
// ────────────────────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  const rateLimit = await checkRateLimitAsync(request)
  if (rateLimit) return rateLimit

  const adminUser = await verifyAdminAccess()
  // Belt-and-suspenders: si verifyAdminAccess devuelve un NextResponse (e.g.
  // 401 por sesión expirada) lo devolvemos tal cual. Si por un cambio
  // futuro de contrato devolviera null/undefined/falsy, NO accedemos a
  // sus propiedades — devolvemos 401 explícito para evitar NRE.
  if (adminUser instanceof NextResponse) return adminUser
  if (!adminUser || typeof adminUser !== 'object') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  try {
    // 1. Tag-tageado: purga la entrada del helper unstable_cache.
    //    Aplica a TODOS los tenants en una sola operación.
    revalidateTag(MUNICIPALITY_APPS_TAG)

    // 2. Path-based: red de seguridad SOLO para la landing raíz del dominio
    //    (https://tecuida.group/). NO cubre subdominios multi-tenant
    //    (https://{slug}.tecuida.group/) porque Vercel keya Route Cache por
    //    host y `revalidatePath('/')` solo purga el root. El grueso de la
    //    invalidación cross-tenant va por tag (paso 1) — path es safety net.
    revalidatePath('/')

    // Log server-side: quién hizo la purga y cuándo. NO se devuelve al cliente
    // para evitar exponer admin id/email a través de cualquier middleware de
    // response-logging externo. El cliente solo necesita ACK de éxito.
    console.info(
      `[POST /api/admin/cache/purge] tag=${MUNICIPALITY_APPS_TAG} path=/ by adminId=${adminUser.id} email=${adminUser.email} rol=${adminUser.rol} ts=${new Date().toISOString()}`,
    )

    return NextResponse.json({
      message: 'Cache de la landing purgado correctamente',
      invalidated: {
        tag: MUNICIPALITY_APPS_TAG,
        path: '/',
      },
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    console.error('[POST /api/admin/cache/purge] Unexpected:', err)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 },
    )
  }
}
