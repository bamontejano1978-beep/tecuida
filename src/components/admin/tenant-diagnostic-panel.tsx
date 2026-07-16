'use client'

/**
 * TenantDiagnosticPanel — Panel de diagnóstico per-tenant para el superadmin.
 *
 * Caso de uso (cierra el bug "apps no aparecen en landings"):
 *   Hasta ahora, el superadmin tenía que:
 *     1. Exportar su cookie de sesión de DevTools a un .env,
 *     2. ejecutar `curl -b "sb-access-token=..." /api/admin/debug/<slug>`,
 *     3. leer la respuesta JSON cruda en terminal.
 *   Esto era tedioso + cada tenant requería su propia llamada + no dejaba
 *   rastro visual de qué tenants estaban en qué estado en el momento
 *   presente. Este panel elimina todos esos pasos.
 *
 * Funcionalidad:
 *   • Selector `<select>` con todos los tenants (ordenados alfabéticamente).
 *     Estado `oculto_admin=true` se etiqueta visualmente — útil para
 *     inspeccionar el platform tenant.
 *   • Al seleccionar un slug, hace fetch al endpoint `GET /api/admin/debug/[slug]`
 *     (que lee directo de la DB, bypasea `unstable_cache`). AbortController
 *     evita race conditions entre clicks rápidos.
 *   • Renderiza 6 cards discriminantes con códigos de color:
 *       rojo  si appsRaw === 0 (branch del seed 037)
 *       amber  si appsInactiveGlobal > 0 (filtro relajado en page.tsx)
 *       emerald si appsActive > 0 (estado sano)
 *       normal resto
 *   • Tabla con TODOS los appNames ordenados alfabéticamente (con badge
 *     huérfana / activa / inactiva-global / asignación off por fila).
 *   • Botón "Purgar cache de <slug>" → POST a
 *     `/api/admin/cache/purge?slug=<slug>`. Tras éxito, re-fetchea el
 *     diagnóstico para que el admin vea el estado fresco.
 *   • Link "Abrir landing pública" → `https://<slug>.tecuida.group/?_t=<now>`
 *     en nueva pestaña, forzando MISS del navegador al cachear-subdominio
 *     (Vercel Route Cache es per-host; el tag ya está purgado por el POST).
 *
 * Importante: este panel NO muta datos del tenant (apps, categorías,
 * assignments) — sólo LEE. La única mutación posible es purga de cache,
 * vía POST a `/api/admin/cache/purge?slug=<slug>` (que sólo ejecuta
 * `revalidateTag` para invalidar el helper cacheado del landing — no
 * toca la DB; ver `src/app/api/admin/cache/purge/route.ts`).
 * Por eso no necesita CSRF / form token: el endpoint admin ya valida
 * sesión + rate limit internamente.
 */

import { useState, useEffect, useCallback } from 'react'

// ─── Tipos exportados (espejo de los endpoints) ────────────────────────────

export type TenantEstado = 'activa' | 'prueba' | 'suspendida' | 'cancelada'

export interface TenantOption {
  slug: string
  nombre: string
  estado: TenantEstado
  /** `oculto_admin=true` → tenant platform o admin-only; no aparece al público. */
  oculto: boolean
}

export interface AppDiagnostic {
  nombre: string
  appActiva: boolean
  appOrfanada: boolean
  assignmentActiva: boolean
}

export interface DebugResponse {
  tenantId: string
  tenantSlug: string
  tenantName: string
  tenantEstado: TenantEstado
  tenantHidden: boolean
  appsRaw: number
  appsWithApplication: number
  appsActive: number
  appsInactiveGlobal: number
  appNames: AppDiagnostic[]
  categoriesCount: number
  categoriesWithApps: number
  timestamp: string
}

export interface PurgeResponse {
  message: string
  invalidated: {
    tag: string
    path: string
    slug?: string
  }
  timestamp: string
}

type DiagnosticsStatus =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'success'; data: DebugResponse }
  | { kind: 'error'; message: string }

type PurgeStatus =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'success'; data: PurgeResponse }
  | { kind: 'error'; message: string }

// ─── Constantes de presentación ────────────────────────────────────────────

const ESTADO_BADGE: Record<TenantEstado, { label: string; classes: string }> = {
  activa: { label: 'Activo', classes: 'bg-emerald-100 text-emerald-800' },
  prueba: { label: 'Prueba', classes: 'bg-sky-100 text-sky-800' },
  suspendida: { label: 'Suspendido', classes: 'bg-amber-100 text-amber-800' },
  cancelada: { label: 'Cancelado', classes: 'bg-gray-200 text-gray-600' },
}

// ─── Componente ────────────────────────────────────────────────────────────

export default function TenantDiagnosticPanel({
  tenants,
  initialSlug,
}: {
  tenants: TenantOption[]
  /**
   * Si está presente, el panel hace fetch automático al montar para ese slug.
   * Diseñado para deep-link vía query param `?slug=zafra` (Slack-shareable
   * cuando se detecta un bug per-tenant). Si el slug no está en la `tenants`
   * list (e.g. typo) o el endpoint devuelve 404 porque ya no existe, la UI
   * muestra el error panel estándar + el dropdown queda en placeholder — el
   * superadmin puede corregir manualmente sin necesidad de cambiar la URL.
   */
  initialSlug?: string
}) {
  // Lazy initial state: inicializa una sola vez al mount. Si initialSlug
  // cambia tras mount (e.g. navegación client-side), NO se actualiza
  // automáticamente — el usuario debe resetear vía dropdown. Esto es
  // comportamiento React estándar para props-inicialización-de-estado.
  const [selectedSlug, setSelectedSlug] = useState<string>(
    () => initialSlug ?? '',
  )
  const [diagnostics, setDiagnostics] = useState<DiagnosticsStatus>({ kind: 'idle' })
  const [purgeStatus, setPurgeStatus] = useState<PurgeStatus>({ kind: 'idle' })

  // Fetch diagnóstico cuando cambia el slug. AbortController + cancelled flag
  // blinda contra race conditions cuando el usuario cambia rápido de tenant
  // (si N requests están en vuelo, sólo la última importa).
  useEffect(() => {
    // `!selectedSlug` cubre '' (URL clear en /admin?slug= o sin ?slug=)
    // Y undefined (remount sin prop en tests / parent re-render). Cuando
    // el user navega fuera del deep-link (`/admin?slug=zafra` → `/admin`)
    // el parent pasa initialSlug=undefined → useState lazy initializer
    // setea selectedSlug='' → el guard de abajo retorna temprano sin
    // disparar fetch. Sin este guard, un re-mount vería selectedSlug=''
    // y haría un fetch contra `/api/admin/debug/[slug]/route.ts` que
    // valida `SLUG_PATTERN` y responde 400 `{error: 'Slug inválido'}`
    // → UI mostraría un error falso en vez del idle state esperado.
    if (!selectedSlug) {
      setDiagnostics({ kind: 'idle' })
      setPurgeStatus({ kind: 'idle' })
      return
    }

    const controller = new AbortController()
    let cancelled = false

    setDiagnostics({ kind: 'loading' })

    fetch(`/api/admin/debug/${encodeURIComponent(selectedSlug)}`, {
      signal: controller.signal,
    })
      .then(async (res) => {
        if (!res.ok) {
          // Belt-and-suspenders: el endpoint siempre devuelve { error } en
          // cualquier 4xx/5xx, pero si el response body no es JSON (CDN
          // middlebox rompió), caemos al HTTP status como mensaje.
          const body = await res
            .json()
            .catch(() => ({ error: `Error HTTP ${res.status}` }))
          throw new Error(
            (body && typeof body.error === 'string' && body.error) ||
              `Error HTTP ${res.status}`,
          )
        }
        return (await res.json()) as DebugResponse
      })
      .then((data) => {
        if (cancelled) return
        setDiagnostics({ kind: 'success', data })
      })
      .catch((err: Error) => {
        // AbortError es esperado cuando cambias de tenant rápido — NO es
        // un error de aplicación y NO debe mostrar el UI de error.
        if (cancelled || err.name === 'AbortError') return
        setDiagnostics({ kind: 'error', message: err.message })
      })

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [selectedSlug])

  // Retry handler: re-fetchea manualmente sin tener que esperar a que el
  // usuario cambie de tenant. Usa el slug actual (que sigue seleccionado).
  const handleRetryDiagnostics = useCallback(async () => {
    if (!selectedSlug) return
    setDiagnostics({ kind: 'loading' })
    try {
      const res = await fetch(
        `/api/admin/debug/${encodeURIComponent(selectedSlug)}`,
      )
      if (!res.ok) {
        const body = await res
          .json()
          .catch(() => ({ error: `Error HTTP ${res.status}` }))
        throw new Error(
          (body && typeof body.error === 'string' && body.error) ||
            `Error HTTP ${res.status}`,
        )
      }
      const data = (await res.json()) as DebugResponse
      setDiagnostics({ kind: 'success', data })
    } catch (err) {
      setDiagnostics({
        kind: 'error',
        message: err instanceof Error ? err.message : 'Error de red',
      })
    }
  }, [selectedSlug])

  // Purga per-tenant: POST con `?slug=X` y re-fetch del diagnóstico.
  // El botón es visually idéntico al PurgeCacheButton global pero opera
  // a nivel per-tenant.
  const handlePurge = useCallback(async () => {
    if (!selectedSlug) return
    setPurgeStatus({ kind: 'loading' })
    try {
      const res = await fetch(
        `/api/admin/cache/purge?slug=${encodeURIComponent(selectedSlug)}`,
        { method: 'POST' },
      )
      if (!res.ok) {
        const body = await res
          .json()
          .catch(() => ({ error: `Error HTTP ${res.status}` }))
        throw new Error(
          (body && typeof body.error === 'string' && body.error) ||
            `Error HTTP ${res.status}`,
        )
      }
      const data = (await res.json()) as PurgeResponse
      setPurgeStatus({ kind: 'success', data })

      // Re-fetch diagnóstico para reflejar el estado post-purge. El endpoint
      // /api/admin/debug/[slug] lee DIRECTO de la DB (no pasa por el helper
      // unstable_cache), así que refleja el ground truth al instante.
      setDiagnostics({ kind: 'loading' })
      try {
        const recheck = await fetch(
          `/api/admin/debug/${encodeURIComponent(selectedSlug)}`,
        )
        if (!recheck.ok) throw new Error(`Error HTTP ${recheck.status}`)
        const fresh = (await recheck.json()) as DebugResponse
        setDiagnostics({ kind: 'success', data: fresh })
      } catch {
        // Si falla el re-fetch, dejamos que el usuario use el botón Reintentar.
      }
    } catch (err) {
      setPurgeStatus({
        kind: 'error',
        message: err instanceof Error ? err.message : 'Error de red',
      })
    }
  }, [selectedSlug])

  return (
    <section
      aria-labelledby="diag-title"
      className="bg-white border border-gray-200 rounded-xl p-6"
    >
      <header className="mb-5">
        <h2
          id="diag-title"
          className="text-lg font-semibold text-gray-900"
        >
          🔍 Diagnóstico per-tenant
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Inspecciona el ground truth per-tenant y purga su cache sin abrir
          terminal — sin copiar cookies ni depender de Vercel CLI.
        </p>
      </header>

      {/* ── Selector ───────────────────────────────────────────────────── */}
      <div className="mb-5 max-w-md">
        <label
          htmlFor="diag-slug"
          className="block text-sm font-medium text-gray-700 mb-1.5"
        >
          Municipio
        </label>
        <select
          id="diag-slug"
          value={selectedSlug}
          onChange={(e) => setSelectedSlug(e.target.value)}
          className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
        >
          <option value="">— Selecciona un municipio —</option>
          {tenants.map((t) => (
            <option key={t.slug} value={t.slug}>
              {t.nombre} ({t.slug})
              {t.oculto ? ' — oculto' : ''}
            </option>
          ))}
        </select>
      </div>

      {/* ── Estados del fetch ─────────────────────────────────────────── */}
      {!selectedSlug && (
        <p className="text-sm text-gray-500 italic">
          Selecciona un tenant para ver su estado y las 6 métricas
          discriminantes del bug &quot;apps no aparecen&quot;.
        </p>
      )}

      {diagnostics.kind === 'loading' && (
        <div
          role="status"
          aria-busy="true"
          aria-live="polite"
          className="grid grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="h-20 rounded-lg bg-gray-100 animate-pulse"
            />
          ))}
        </div>
      )}

      {diagnostics.kind === 'error' && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-semibold text-red-800">
            Error al cargar el diagnóstico
          </p>
          <p className="mt-1 text-xs text-red-700">{diagnostics.message}</p>
          <button
            type="button"
            onClick={handleRetryDiagnostics}
            className="mt-3 inline-flex items-center gap-2 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-500 transition-colors"
          >
            Reintentar
          </button>
        </div>
      )}

      {diagnostics.kind === 'success' && (
        <SuccessView
          data={diagnostics.data}
          purgeStatus={purgeStatus}
          onPurge={handlePurge}
        />
      )}
    </section>
  )
}

// ─── Sub-componente: vista cuando hay datos ───────────────────────────────

function SuccessView({
  data,
  purgeStatus,
  onPurge,
}: {
  data: DebugResponse
  purgeStatus: PurgeStatus
  onPurge: () => void
}) {
  return (
    <>
      {/* Encabezado del tenant + link a la landing */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <h3 className="text-base font-semibold text-gray-900">
          {data.tenantName}
        </h3>
        <EstadoBadge estado={data.tenantEstado} />
        {data.tenantHidden && <HiddenBadge />}
        {/* href es estable (sin Date.now) para evitar hydration mismatch
            SSR↔client; el timestamp se inyecta bajo demanda SOLO en click
            izquierdo sin modificadores (preserva ctrl+click / middle-click
            / cmd+click para que el usuario decida dónde abrir). */}
        <a
          href={`https://${data.tenantSlug}.tecuida.group/`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => {
            // Detección explícita de clicks modificados: si el usuario usa
            // ctrl/meta/shift o middle-click, delegamos al navegador (deja
            // que abra en nueva pestaña vs ventana, según preferencia del
            // usuario y S.O.). No forceamos `?\_t` en estos casos para no
            // romper flujos establecidos de teclado/AT.
            if (
              e.ctrlKey ||
              e.metaKey ||
              e.shiftKey ||
              e.altKey ||
              e.button !== 0
            ) {
              return
            }
            e.preventDefault()
            const url = new URL(e.currentTarget.href)
            url.searchParams.set('_t', String(Date.now()))
            const opened = window.open(url.toString(), '_blank')
            // Fallback defensivo: si un popup blocker matase el window.open,
            // degradamos a click programático para que al menos algo
            // visible ocurra (vs. un click silencioso).
            if (!opened) {
              const a = document.createElement('a')
              a.href = url.toString()
              a.target = '_blank'
              a.rel = 'noopener noreferrer'
              document.body.appendChild(a)
              a.click()
              document.body.removeChild(a)
            }
          }}
          className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition-colors"
        >
          Abrir landing pública ↗
        </a>
      </div>

      {/* 6 cards discriminantes */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-5">
        <MetricCard
          label="Apps asignadas (raw)"
          value={data.appsRaw}
          variant={data.appsRaw === 0 ? 'danger' : 'normal'}
          hint={
            data.appsRaw === 0
              ? '‼️ Necesita re-seed (migration 038)'
              : undefined
          }
        />
        <MetricCard
          label="Con JOIN válido"
          value={data.appsWithApplication}
          variant={
            data.appsWithApplication < data.appsRaw ? 'warning' : 'normal'
          }
          hint={
            data.appsWithApplication < data.appsRaw
              ? `${data.appsRaw - data.appsWithApplication} apps borradas dejaron assignment huérfano`
              : undefined
          }
        />
        <MetricCard
          label="Activas (global)"
          value={data.appsActive}
          variant="emerald"
        />
        <MetricCard
          label="Inactivas globales (mostradas)"
          value={data.appsInactiveGlobal}
          variant={data.appsInactiveGlobal > 0 ? 'warning' : 'normal'}
          hint="post-filter relax en page.tsx"
        />
        <MetricCard
          label="Categorías globales"
          value={data.categoriesCount}
          variant="normal"
        />
        <MetricCard
          label="Categorías con apps"
          value={data.categoriesWithApps}
          variant="normal"
        />
      </div>

      {/* Tabla de appNames */}
      <div className="mb-5 overflow-hidden rounded-lg border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th
                scope="col"
                className="px-4 py-2 text-left font-semibold text-gray-700"
              >
                Nombre de la app
              </th>
              <th
                scope="col"
                className="px-4 py-2 text-left font-semibold text-gray-700"
              >
                Estado
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {data.appNames.length === 0 ? (
              <tr>
                <td
                  colSpan={2}
                  className="px-4 py-3 text-center italic text-gray-500"
                >
                  Sin apps asignadas
                </td>
              </tr>
            ) : (
              data.appNames.map((app, idx) => (
                <tr key={`${app.nombre}-${idx}`}>
                  <td className="px-4 py-2 font-mono text-gray-900">
                    {app.nombre}
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex flex-wrap gap-1.5">
                      {app.appOrfanada ? (
                        <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
                          huérfana
                        </span>
                      ) : app.appActiva ? (
                        <span className="rounded bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
                          activa
                        </span>
                      ) : (
                        <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                          inactiva (global)
                        </span>
                      )}
                      {app.assignmentActiva ? null : (
                        <span className="rounded bg-gray-200 px-2 py-0.5 text-xs font-medium text-gray-700">
                          asignación off
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Acciones + meta */}
      <div className="flex flex-wrap items-center gap-3 border-t border-gray-100 pt-4">
        <PurgeControl status={purgeStatus} onPurge={onPurge} slug={data.tenantSlug} />
        <span className="text-xs text-gray-500">
          Última lectura:{' '}
          {new Date(data.timestamp).toLocaleString('es-ES', {
            dateStyle: 'short',
            timeStyle: 'medium',
          })}
        </span>
      </div>
    </>
  )
}

// ─── Sub-componentes UI auxiliares ─────────────────────────────────────────

function EstadoBadge({ estado }: { estado: TenantEstado }) {
  const b = ESTADO_BADGE[estado]
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${b.classes}`}
    >
      {b.label}
    </span>
  )
}

function HiddenBadge() {
  return (
    <span className="inline-flex rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-semibold text-purple-800">
      Oculto
    </span>
  )
}

type MetricVariant = 'normal' | 'danger' | 'warning' | 'emerald'

function MetricCard({
  label,
  value,
  variant,
  hint,
}: {
  label: string
  value: number
  variant: MetricVariant
  hint?: string
}) {
  const variantClasses: Record<MetricVariant, string> = {
    normal: 'bg-white border-gray-200',
    danger: 'bg-red-50 border-red-300',
    warning: 'bg-amber-50 border-amber-300',
    emerald: 'bg-emerald-50 border-emerald-200',
  }
  const valueClasses: Record<MetricVariant, string> = {
    normal: 'text-gray-900',
    danger: 'text-red-700',
    warning: 'text-amber-800',
    emerald: 'text-emerald-700',
  }
  return (
    <div className={`rounded-lg border p-4 ${variantClasses[variant]}`}>
      <p
        className={`text-2xl font-bold ${valueClasses[variant]}`}
        aria-label={`${label}: ${value}`}
      >
        {value}
      </p>
      <p className="mt-1 text-xs font-medium text-gray-700">{label}</p>
      {hint && <p className="mt-0.5 text-xs text-gray-500">{hint}</p>}
    </div>
  )
}

function PurgeControl({
  status,
  onPurge,
  slug,
}: {
  status: PurgeStatus
  onPurge: () => void
  slug: string
}) {
  if (status.kind === 'success') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800 border border-emerald-200">
        ✓ Cache invalidado para {slug}
      </span>
    )
  }
  if (status.kind === 'error') {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-red-700">⚠️ {status.message}</span>
        <button
          type="button"
          onClick={onPurge}
          className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-500 transition-colors"
        >
          Reintentar purga
        </button>
      </div>
    )
  }
  return (
    <button
      type="button"
      onClick={onPurge}
      disabled={status.kind === 'loading'}
      className="inline-flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800 shadow-sm hover:bg-amber-100 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
    >
      {status.kind === 'loading' ? (
        <>
          <svg
            className="h-3.5 w-3.5 animate-spin"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          Purgando…
        </>
      ) : (
        `Purgar cache de "${slug}"`
      )}
    </button>
  )
}
