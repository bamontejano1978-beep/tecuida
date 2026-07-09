'use client'

/**
 * PurgeCacheButton — Botón "Purgar cache de landing" para el panel superadmin.
 *
 * DX objetivo: el admin puede invalidar entradas stale del cache
 * `unstable_cache('municipality-apps')` sin abrir terminal ni recordar el
 * tag name. Cierra el bucle abierto por `src/app/api/admin/cache/purge/route.ts`.
 *
 * Flujo de UI:
 *   1. Click → abre modal de confirmación explicando qué se va a purgar y los
 *      efectos visibles (siguiente request al landing será MISS).
 *   2. Confirmar → POST a `/api/admin/cache/purge` con feedback loading.
 *   3. Éxito → muestra `{ message, invalidated, timestamp }` formateado.
 *   4. Error → muestra mensaje HTTP (401, 429, 500) + botón Reintentar.
 *   5. Esc o backdrop → cierra el modal (resetea estado en next open).
 */

import { useState, useCallback, useEffect } from 'react'

// ---------------------------------------------------------------------------
// Tipos (espejo de la respuesta de /api/admin/cache/purge/route.ts)
// ---------------------------------------------------------------------------

interface PurgeResponse {
  message: string
  invalidated: {
    tag: string
    path: string
  }
  timestamp: string
}

type Status =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'success'; data: PurgeResponse }
  | { kind: 'error'; message: string }

// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------

export default function PurgeCacheButton() {
  const [open, setOpen] = useState(false)
  const [status, setStatus] = useState<Status>({ kind: 'idle' })

  const closeModal = useCallback(() => {
    setOpen(false)
    // Reset diferido para que la animación de cierre no muestre flicker.
    // 250ms > duration estándar de `transition-opacity` en Tailwind.
    window.setTimeout(() => setStatus({ kind: 'idle' }), 250)
  }, [])

  // Esc cierra el modal cuando está abierto (estándar UX).
  useEffect(() => {
    if (!open) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && status.kind !== 'loading') {
        closeModal()
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [open, status.kind, closeModal])

  async function handlePurge() {
    setStatus({ kind: 'loading' })
    try {
      const res = await fetch('/api/admin/cache/purge', { method: 'POST' })
      // El endpoint puede devolver 401/429/500 — todas con `{ error: string }`.
      if (!res.ok) {
        const body = await res
          .json()
          .catch(() => ({ error: 'Error desconocido del servidor' }))
        const msg =
          (body && typeof body.error === 'string' && body.error) ||
          `Error HTTP ${res.status}`
        setStatus({ kind: 'error', message: msg })
        return
      }
      const data = (await res.json()) as PurgeResponse
      setStatus({ kind: 'success', data })
    } catch (err) {
      // Network error / CORS / etc. — no asumimos nada del shape.
      const msg =
        err instanceof Error ? err.message : 'Error de red desconocido'
      setStatus({ kind: 'error', message: msg })
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-800 shadow-sm hover:bg-amber-100 transition-colors"
      >
        <svg
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"
          />
        </svg>
        Purgar cache de landing
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 p-4 transition-opacity"
          onClick={() => {
            if (status.kind !== 'loading') closeModal()
          }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="purge-cache-title"
        >
          <div
            className="w-full max-w-lg rounded-xl bg-white shadow-2xl ring-1 ring-gray-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* ── Body: cambia según status ── */}
            {status.kind === 'success' ? (
              <SuccessPanel data={status.data} onClose={closeModal} />
            ) : status.kind === 'error' ? (
              // IMPORTANTE: NO pasamos `loading` aquí — TS narrowing garantiza
              // que `status.kind === 'loading'` es unreachable en este branch.
              // Manejar retry lo hace `handlePurge` → setStatus({kind:'loading'})
              // que re-renderiza este árbol en la rama ConfirmPanel con loading=true.
              <ErrorPanel
                message={status.message}
                onRetry={handlePurge}
                onClose={closeModal}
              />
            ) : (
              <ConfirmPanel
                loading={status.kind === 'loading'}
                onCancel={closeModal}
                onConfirm={handlePurge}
              />
            )}
          </div>
        </div>
      )}
    </>
  )
}

// ---------------------------------------------------------------------------
// Sub-paneles del modal
// ---------------------------------------------------------------------------

function ConfirmPanel({
  loading,
  onCancel,
  onConfirm,
}: {
  loading: boolean
  onCancel: () => void
  onConfirm: () => void
}) {
  return (
    <>
      <div className="px-6 pt-6">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100">
            <svg
              className="h-6 w-6 text-amber-600"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
              />
            </svg>
          </div>
          <div>
            <h3
              id="purge-cache-title"
              className="text-base font-semibold text-gray-900"
            >
              ¿Purgar el cache de la landing pública?
            </h3>
            <p className="mt-1 text-sm text-gray-600">
              Esta acción invalida la entrada cacheada de
              <code className="mx-1 rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs text-gray-800">
                municipality-apps
              </code>
              para <strong>todos los municipios</strong>. La próxima visita al
              landing será un <code className="font-mono text-xs">MISS</code>{' '}
              contra la base de datos (latencia +50ms aprox.) y re-populará el
              cache automáticamente.
            </p>
          </div>
        </div>

        <div className="mt-5 rounded-lg border border-gray-200 bg-gray-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Cuándo usar este botón
          </p>
          <ul className="mt-2 space-y-1.5 text-xs text-gray-700">
            <li className="flex gap-2">
              <span className="text-gray-400">•</span>
              <span>
                Hiciste un <code className="font-mono">INSERT</code> directo en{' '}
                <code className="font-mono">municipality_applications</code> con
                seed SQL y la landing sigue mostrando 0 apps.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-gray-400">•</span>
              <span>
                Estás debuggeando un bug relativo al cache y quieres forzar{' '}
                <code className="font-mono">MISS</code> sin esperar al TTL de 1h.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-gray-400">•</span>
              <span>
                Deployaste una migración que cambió datos existentes y quieres
                que se vean inmediatamente.
              </span>
            </li>
          </ul>
          <p className="mt-3 text-xs text-gray-500">
            La operación es <strong>idempotente</strong>: si el cache ya está
            limpio, llamarlo no causa daño.
          </p>
        </div>
      </div>

      <div className="mt-6 flex flex-col-reverse gap-2 border-t border-gray-100 bg-gray-50 px-6 py-4 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-amber-500 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? (
            <>
              <svg
                className="h-4 w-4 animate-spin"
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
                  d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                />
              </svg>
              Purgando…
            </>
          ) : (
            'Sí, purgar cache'
          )}
        </button>
      </div>
    </>
  )
}

function SuccessPanel({
  data,
  onClose,
}: {
  data: PurgeResponse
  onClose: () => void
}) {
  const formattedTs = new Date(data.timestamp).toLocaleString('es-ES', {
    dateStyle: 'medium',
    timeStyle: 'medium',
  })
  return (
    <>
      <div className="px-6 pt-6">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100">
            <svg
              className="h-6 w-6 text-emerald-600"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m4.5 12.75 6 6 9-13.5"
              />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-base font-semibold text-gray-900">
              Cache purgado correctamente
            </h3>
            <p className="mt-1 text-sm text-gray-600">{data.message}</p>
          </div>
        </div>

        <dl className="mt-5 overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
          <div className="px-4 py-3 sm:grid sm:grid-cols-3 sm:gap-4">
            <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Tag invalidado
            </dt>
            <dd className="mt-1 font-mono text-xs text-gray-900 sm:col-span-2 sm:mt-0">
              {data.invalidated.tag}
            </dd>
          </div>
          <div className="border-t border-gray-200 px-4 py-3 sm:grid sm:grid-cols-3 sm:gap-4">
            <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Path invalidado
            </dt>
            <dd className="mt-1 font-mono text-xs text-gray-900 sm:col-span-2 sm:mt-0">
              {data.invalidated.path}
            </dd>
          </div>
          <div className="border-t border-gray-200 px-4 py-3 sm:grid sm:grid-cols-3 sm:gap-4">
            <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Timestamp
            </dt>
            <dd className="mt-1 font-mono text-xs text-gray-900 sm:col-span-2 sm:mt-0">
              {formattedTs}
            </dd>
          </div>
        </dl>

        <p className="mt-4 text-xs text-gray-500">
          Verificación rápida (terminal):{' '}
          <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs text-gray-700">
            curl -sI https://tecuida.group/ | grep -i x-vercel-cache
          </code>{' '}
          debe devolver <code className="font-mono text-xs">MISS</code>.
        </p>
      </div>

      <div className="mt-6 flex flex-col-reverse gap-2 border-t border-gray-100 bg-gray-50 px-6 py-4 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-500 transition-colors"
        >
          Cerrar
        </button>
      </div>
    </>
  )
}

function ErrorPanel({
  message,
  onRetry,
  onClose,
}: {
  message: string
  onRetry: () => void
  onClose: () => void
}) {
  // NOTA: este panel NO recibe `loading` como prop. La transición
  // error → loading se hace via el padre: al pulsar "Reintentar",
  // `handlePurge` ejecuta `setStatus({kind:'loading'})` lo que re-renderiza
  // este árbol y muestra el ConfirmPanel con spinner ("Purgando…").
  // Por tanto, durante el retry el usuario ve el spinner en el botón
  // primario de ConfirmPanel, NO en este botón.
  return (
    <>
      <div className="px-6 pt-6">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100">
            <svg
              className="h-6 w-6 text-red-600"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z"
              />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-base font-semibold text-gray-900">
              No se pudo purgar el cache
            </h3>
            <p className="mt-1 text-sm text-gray-600">
              El endpoint rechazó la operación. El cache{' '}
              <strong>no se modificó</strong>, así que no hay nada que deshacer.
            </p>
            <pre className="mt-3 max-h-40 overflow-auto rounded-lg border border-red-200 bg-red-50 px-3 py-2 font-mono text-xs text-red-800 whitespace-pre-wrap break-words">
              {message}
            </pre>
            <p className="mt-3 text-xs text-gray-500">
              Causas más comunes: sesión expirada (401), demasiadas requests en
              poco tiempo (429), o error interno del servidor (500).
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-col-reverse gap-2 border-t border-gray-100 bg-gray-50 px-6 py-4 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-100 transition-colors"
        >
          Cerrar
        </button>
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500 transition-colors"
        >
          Reintentar
        </button>
      </div>
    </>
  )
}
