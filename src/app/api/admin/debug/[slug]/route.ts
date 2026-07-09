/**
 * API Admin — Diagnóstico del estado per-tenant en una sola lectura.
 *
 * GET /api/admin/debug/[slug]
 *
 * Retorna el estado completo de un municipio sin pasar por `unstable_cache`:
 * el superadmin obtiene ground truth sin necesidad de Vercel logs ni psql.
 *
 * Casos de uso (todos cubren el bug "apps no aparecen en landings"):
 *   • `appsRaw === 0`             → JOIN no devolvió nada. Indica que las
 *     assignments en `municipality_applications` no existen o están todas
 *     con `activa=false`. Fix: ver migration `037_seed_default_*` o el
 *     endpoint PUT de asignación admin.
 *
 *   • `appsWithApplication < appsRaw` → existen assignments cuyo JOIN a
 *     `applications` falla. Indica que se borró la app pero el assignment
 *     quedó huérfano. Fix: cleanup de rows en `municipality_applications`.
 *
 *   • `appsActive < appsWithApplication` → existen apps asignadas pero
 *     con `applications.activa=false` global. Indica el branch del fix
 *     de `page.tsx` (filter relajado). Si ya se desplegó, la landing ya
 *     debería renderizar; este contador es ahora métrica informativa.
 *
 *   • `categoriesWithApps === 0` pero `appsRaw > 0` → las apps existen
 *     pero sus category_id son inválidos (huérfanos de categorías borradas).
 *
 * Seguridad (mismo patrón que el resto del admin):
 *   • `verifyAdminAccess()` → requiere sesión activa de superadmin. Sin
 *     sesión → 401.
 *   • `checkRateLimitAsync(request)` → 429 si excede.
 *   • Slug validado contra regex kebab-case (no SQL injection, no path
 *     traversal, no caracteres extraños).
 *
 * Read-only: NO muta estado. Sin revalidateTag. Idempotente.
 */

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { verifyAdminAccess } from '@/lib/admin/auth'
import { checkRateLimitAsync } from '@/lib/admin/rate-limit'

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------

// Slugs de `municipalities.slug` son kebab-case lowercase alfanumérico.
// El regex acepta 2..100 chars (mínimo 2 para evitar slugs de 1 char como
// "a" que son ambiguos operativamente) y previene path traversal o SQL
// injection (defense-in-depth: Supabase ya parametriza, pero validamos antes).
const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,98}[a-z0-9])?$/

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

/** Tipo del row de `municipality_applications` con su LEFT JOIN a `applications`. */
interface AssignmentRow {
  /** `municipality_applications.activa` per-tenant. */
  activa: boolean
  /** `applications` join row o null si la app fue borrada (LEFT JOIN). */
  application: {
    id: string
    nombre: string
    /** `applications.activa` global. */
    activa: boolean
    category_id: string
  } | null
}

/**
 * Tipo exportado de cada fila de la response. Permite a tests y consumidores
 * tipar sin re-derivar la estructura.
 */
export interface AppDiagnostic {
  /** Nombre de la app. "(app borrada)" cuando el LEFT JOIN devuelve null. */
  nombre: string
  /** `applications.activa` global. False si el JOIN no devolvió app row. */
  appActiva: boolean
  /** True cuando el LEFT JOIN devolvió null (assignment huérfana). */
  appOrfanada: boolean
  /** `municipality_applications.activa`. Único gate per-tenant. */
  assignmentActiva: boolean
}

/** Tipo exportado de la response del endpoint. */
export interface DebugResponse {
  tenantId: string
  tenantSlug: string
  tenantName: string
  tenantEstado: string
  tenantHidden: boolean
  appsRaw: number
  appsWithApplication: number
  appsActive: number
  /** appsWithApplication - appsActive. Info tras relax del filter en page.tsx. */
  appsInactiveGlobal: number
  appNames: AppDiagnostic[]
  categoriesCount: number
  categoriesWithApps: number
  timestamp: string
}

// ---------------------------------------------------------------------------
// GET — Diagnóstico per-tenant
// ---------------------------------------------------------------------------

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  // 1. Rate limit (mismo guard que el resto de endpoints admin).
  const rateLimit = await checkRateLimitAsync(request)
  if (rateLimit) return rateLimit

  // 2. Auth + belt-and-suspenders null guard (mismo patrón que POST /api/admin/cache/purge).
  //
  //    Belt-and-suspenders tri-layer guard:
  //    - `instanceof NextResponse` → captura errores 401/403 de verify.
  //    - `!adminUser`              → null/undefined/falsy.
  //    - `typeof !== 'object'`     → primitivos (string/number/boolean).
  //    - `Array.isArray`           → arrays pasan `typeof === 'object'`; la
  //                                  contract de verifyAdminAccess nunca
  //                                  debería devolverlos, pero si una versión
  //                                  futura cambiase el shape, esto evita que
  //                                  `adminUser.id` lance NRE silenciosamente
  //                                  y rompa el audit log.
  const adminUser = await verifyAdminAccess()
  if (adminUser instanceof NextResponse) return adminUser
  if (
    !adminUser ||
    typeof adminUser !== 'object' ||
    Array.isArray(adminUser)
  ) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  // 3. Validación de slug (defense-in-depth evita SQLi/path traversal).
  const { slug } = await params
  if (!slug || !SLUG_PATTERN.test(slug)) {
    return NextResponse.json({ error: 'Slug inválido' }, { status: 400 })
  }

  try {
    const supabase = createAdminClient()

    // 4. Query tenant (mockSingle devuelve null si no existe).
    const { data: tenantRow, error: tenantErr } = await supabase
      .from('municipalities')
      .select('id, slug, nombre_municipio, estado_suscripcion, oculto_admin')
      .eq('slug', slug)
      .maybeSingle()

    if (tenantErr) {
      console.error(
        `[GET /api/admin/debug/[slug]] tenant query error: ${tenantErr.message}`,
      )
      return NextResponse.json(
        { error: 'Error interno del servidor' },
        { status: 500 },
      )
    }

    if (!tenantRow) {
      return NextResponse.json(
        { error: `Municipio '${slug}' no existe` },
        { status: 404 },
      )
    }

    // 5. Query assignments + LEFT JOIN a applications.
    //    LEFT JOIN (no !inner) para ver también apps huérfanas (assignment sin app).
    //    NO filtramos `assignment.activa` aquí — la respuesta breakdown
    //    discrimina activas/inactivas per-tenant vs global.
    const { data: assignmentRows, error: assignmentsErr } = await supabase
      .from('municipality_applications')
      .select('activa, application:applications (id, nombre, activa, category_id)')
      .eq('municipality_id', tenantRow.id)

    if (assignmentsErr) {
      console.error(
        `[GET /api/admin/debug/[slug]] assignments query error: ${assignmentsErr.message}`,
      )
      return NextResponse.json(
        { error: 'Error interno del servidor' },
        { status: 500 },
      )
    }

    // 6. Count de categorías totales (para validar el breakdown per-tenant).
    const { count: categoriesCount, error: categoriesErr } = await supabase
      .from('categories')
      .select('id', { count: 'exact', head: true })

    if (categoriesErr) {
      console.error(
        `[GET /api/admin/debug/[slug]] categories query error: ${categoriesErr.message}`,
      )
      return NextResponse.json(
        { error: 'Error interno del servidor' },
        { status: 500 },
      )
    }

    // 7. Breakdown: 4 métricas que discriminan cada branch del bug.
    //
    //    `as unknown as AssignmentRow[]` (doble cast) es necesario porque
    //    supabase-js devuelve una forma estructural que strict TS de
    //    Next.js no acepta como directamente convertible: la inferencia
    //    del cliente proyecta el JOIN como array de objetos con sólo las
    //    propiedades de `applications`, no del wrapper `municipality_applications`.
    //    TS2352 se evita con doble cast explícito. Confiamos en el schema
    //    de la DB (cuyas migrations están en `supabase/migrations/`) para
    //    que el shape runtime sea el correcto.
    const assignments: AssignmentRow[] =
      (assignmentRows ?? []) as unknown as AssignmentRow[]

    const appsRaw = assignments.length
    const appsWithApplication = assignments.filter(
      (r) => r.application !== null,
    ).length
    const appsActive = assignments.filter(
      (r) => r.application !== null && r.application.activa,
    ).length
    const appsInactiveGlobal = appsWithApplication - appsActive

    const appNames: AppDiagnostic[] = assignments
      .map((r) => ({
        nombre: r.application?.nombre ?? '(app borrada)',
        appActiva: r.application?.activa ?? false,
        appOrfanada: r.application === null,
        assignmentActiva: r.activa,
      }))
      // Estabiliza el output para diffs estables en CI / monitoring.
      .sort((a, b) => a.nombre.localeCompare(b.nombre))

    // `flatMap` con operador ternario inline → TS narrow dentro de la rama,
    // no necesita `!` ni eslint-disable. Asignar `[]` cuando no hay aplicacion.
    const categoriesWithApps = new Set(
      assignments.flatMap((r) =>
        r.application ? [r.application.category_id] : [],
      ),
    ).size

    // 8. Audit log server-side (no se devuelve al cliente; evita leak vía
    //    response-logging middleware). Quién y cuándo consultaron.
    //
    //    `needsMigration` discriminante explícito en el log para que el
    //    equipo de ops identifique el branch del bug sin tener que revisar
    //    el código fuente del endpoint. Útil en alertas de Vercel monitoring.
    const needsMigrationHint = appsRaw === 0 ? ' [NEEDS 037_SEED]' : ''
    console.info(
      `[GET /api/admin/debug/[slug]] slug=${slug} ` +
        `tenant_id=${tenantRow.id} appsRaw=${appsRaw} ` +
        `appsWithApplication=${appsWithApplication} appsActive=${appsActive}` +
        needsMigrationHint +
        ` by adminId=${adminUser.id} ts=${new Date().toISOString()}`,
    )

    const response: DebugResponse = {
      tenantId: tenantRow.id,
      tenantSlug: tenantRow.slug,
      tenantName: tenantRow.nombre_municipio,
      tenantEstado: tenantRow.estado_suscripcion,
      tenantHidden: tenantRow.oculto_admin,
      appsRaw,
      appsWithApplication,
      appsActive,
      appsInactiveGlobal,
      appNames,
      categoriesCount: categoriesCount ?? 0,
      categoriesWithApps,
      timestamp: new Date().toISOString(),
    }

    return NextResponse.json(response)
  } catch (err) {
    console.error('[GET /api/admin/debug/[slug]] Unexpected:', err)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 },
    )
  }
}
