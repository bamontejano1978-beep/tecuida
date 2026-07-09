/**
 * API Admin — Purga manual del cache de la landing pública
 *
 * POST /api/admin/cache/purge[?slug=X]
 *   → revalidateTag(MUNICIPALITY_APPS_TAG) // entradas unstable_cache('municipality-apps')
 *   → revalidatePath('/')                    // red de seguridad: Route Cache de la raíz
 *
 * Cuando se invoca con `?slug=X` (opcional):
 *   • slug se valida contra `SLUG_PATTERN` (kebab-case 1..100 chars).
 *   • Si el slug es inválido → 400 sin tocar cache (no bypasea auth ni
 *     consume tokens de rate-limit más que una llamada normal).
 *   • Si es válido → log audit incluye `byTenant=true slug=X` para que el
 *     equipo de ops pueda discriminar invalidaciones globales de per-tenant.
 *
 * Cuándo usarlo desde el panel admin (en lugar de `vercel cache invalidate` por CLI):
 *   • Acabas de poblar `municipality_applications` con un seed/INSERT directo
 *     fuera de los endpoints admin y la landing sigue mostrando 0 apps.
 *   • Estás debuggeando un bug relativo a la cache y quieres forzar MISS sin
 *     esperar al TTL de 1h del `unstable_cache`.
 *   • Quieres purgar para todos los tenants desde una sola acción sin abrir
 *     terminal ni depender del Vercel CLI.
 *
 * Limitación conocida (documentada para el equipo de ops):
 *   Vercel keya el Route Cache por host + path. `revalidatePath('/')` desde
 *   `tecuida.group` no purga la entrada cacheada de `zafra.tecuida.group/`.
 *   El grueso de la invalidación cross-tenant va por TAG
 *   (`MUNICIPALITY_APPS_TAG` → entradas del helper
 *   `unstable_cache('municipality-apps')`), que SÍ es compartida por todos
 *   los hosts. El `revalidatePath('/')` y/o `?slug=X` aportan visibilidad
 *   operativa en logs + response; el comportamiento funcional es idéntico
 *   al tag purge. El panel ofrece un botón "Abrir landing" que abre
 *   `<slug>.tecuida.group/?_t=<now>` para forzar MISS del navegador en la
 *   capa Route Cache por host cuando sea necesario.
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
 * Tras éxito, devuelve el tag + path que se invalidaron + slug (si aplica)
 * + timestamp ISO para que el panel admin pueda mostrar feedback al usuario.
 */

import { NextResponse } from 'next/server'
import { revalidateTag, revalidatePath } from 'next/cache'
import { verifyAdminAccess } from '@/lib/admin/auth'
import { checkRateLimitAsync } from '@/lib/admin/rate-limit'
import { MUNICIPALITY_APPS_TAG } from '@/lib/tenant/municipality-apps-cache'

// Slug pattern compartido con `/api/admin/debug/[slug]`. No usamos el
// `SLUG_PATTERN` exportado del debug endpoint para evitar acoplamiento de
// archivos; el regex vive aquí también porque la validación corre ANTES de
// cualquier side-effect (revalidateTag, revalidatePath).
const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,98}[a-z0-9])?$/

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

  // Parsear `?slug=X` (opcional). Validar regex ANTES de cualquier side-effect.
  let perTenantSlug: string | null = null
  try {
    const url = new URL(request.url)
    const rawSlug = url.searchParams.get('slug')
    if (rawSlug !== null) {
      // Slug vacío (e.g. `?slug=`) se considera inválido para evitar
      // ambigüedad con la purga global; el caller debe omitir el param.
      if (!SLUG_PATTERN.test(rawSlug)) {
        return NextResponse.json(
          { error: 'Slug inválido' },
          { status: 400 },
        )
      }
      perTenantSlug = rawSlug
    }
  } catch (err) {
    // request.url malformada es muy improbable (Next.js siempre construye
    // URLs válidas), pero blindamos igual: si no podemos parsear, actuamos
    // como si no hubiera slug (modo global) pero logueamos el evento.
    console.warn(
      `[POST /api/admin/cache/purge] Could not parse URL: ${(err as Error).message}`,
    )
  }

  try {
    // 1. Tag-tageado: purga la entrada del helper unstable_cache.
    //    Aplica a TODOS los tenants en una sola operación (el slug param
    //    es audit/UX, no cambia el comportamiento de invalidación porque
    //    el tag es compartido multi-tenant).
    revalidateTag(MUNICIPALITY_APPS_TAG)

    // 2. Path-based: red de seguridad SOLO para la landing raíz del dominio
    //    (https://tecuida.group/). NO cubre subdominios multi-tenant
    //    (https://{slug}.tecuida.group/) porque Vercel keya Route Cache por
    //    host y `revalidatePath('/')` solo purga el root. El grueso de la
    //    invalidación cross-tenant va por tag (paso 1) — path es safety net.
    revalidatePath('/')

    // Log server-side: quién hizo la purga, qué scope, y cuándo. NO se
    // devuelve al cliente para evitar exponer admin id/email a través
    // de cualquier middleware de response-logging externo. El cliente solo
    // necesita ACK de éxito.
    console.info(
      `[POST /api/admin/cache/purge] tag=${MUNICIPALITY_APPS_TAG} ` +
        `path=/ byTenant=${perTenantSlug !== null} ` +
        `slug=${perTenantSlug ?? 'GLOBAL'} ` +
        `by adminId=${adminUser.id} email=${adminUser.email} rol=${adminUser.rol} ` +
        `ts=${new Date().toISOString()}`,
    )

    return NextResponse.json({
      message: perTenantSlug
        ? `Cache de datos invalidado para el tenant "${perTenantSlug}"`
        : 'Cache de la landing purgado correctamente',
      invalidated: {
        tag: MUNICIPALITY_APPS_TAG,
        path: '/',
        ...(perTenantSlug !== null ? { slug: perTenantSlug } : {}),
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
