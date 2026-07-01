/**
 * ApplicationCard — Tarjeta de aplicación del catálogo
 *
 * Client Component que muestra una aplicación con:
 *   - Icono según el tipo (programa, herramienta, encuesta, recurso)
 *   - Badge de nivel de suscripción
 *   - Nombre, descripción y categoría
 *   - Hover: elevación, borde de color, escala sutil
 *   - Click: navega a la aplicación (o muestra disabled si no activa)
 *
 * Requisitos: 6.2, 7.1
 */

'use client'

import Link from 'next/link'
import { normalizeExternalUrl } from '@/lib/urls'
import type { Application, ApplicationType } from '@/types'

// ---------------------------------------------------------------------------
// Iconos por tipo de aplicación (SVG inline)
// ---------------------------------------------------------------------------

const typeIcons: Record<ApplicationType, React.ReactNode> = {
  programa: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342M6.75 15a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm0 0v-3.675A55.378 55.378 0 0 1 12 8.443m-7.007 11.55A5.981 5.981 0 0 0 6.75 15.75v-1.5" />
    </svg>
  ),
  herramienta: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17 17.25 21A2.652 2.652 0 0 0 21 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 1 1-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 0 0 4.486-6.336l-3.276 3.277a3.004 3.004 0 0 1-2.25-2.25l3.276-3.276a4.5 4.5 0 0 0-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437 1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008Z" />
    </svg>
  ),
  encuesta: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15a2.25 2.25 0 0 1 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z" />
    </svg>
  ),
  recurso: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
    </svg>
  ),
}

const typeLabels: Record<ApplicationType, string> = {
  programa: 'Programa',
  herramienta: 'Herramienta',
  encuesta: 'Encuesta',
  recurso: 'Recurso',
}

const typeColors: Record<ApplicationType, string> = {
  programa: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  herramienta: 'bg-sky-50 text-sky-700 border-sky-200',
  encuesta: 'bg-amber-50 text-amber-700 border-amber-200',
  recurso: 'bg-violet-50 text-violet-700 border-violet-200',
}

const tierBadges: Record<string, { label: string; className: string }> = {
  programa: { label: 'Programa', className: 'bg-emerald-100 text-emerald-700' },
  herramienta: { label: 'Herramienta', className: 'bg-sky-100 text-sky-700' },
  encuesta: { label: 'Encuesta', className: 'bg-amber-100 text-amber-800' },
  recurso: { label: 'Recurso', className: 'bg-violet-100 text-violet-700' },
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ApplicationCardProps {
  application: Application
  /** Nombre de la categoría (viene del join en el Server Component) */
  categoryName?: string
}

// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------

export default function ApplicationCard({
  application,
  categoryName,
}: ApplicationCardProps) {
  const icon = typeIcons[application.tipo] || typeIcons.programa
  const typeLabel = typeLabels[application.tipo] || application.tipo
  const typeColor = typeColors[application.tipo] || typeColors.programa
  const tier = tierBadges[application.tipo] || tierBadges.programa

  // Prioridad de href para evitar 404 al click:
  //    1) app_slug      → subdominio propio (<slug>.tecuida.group) gestionado por el middleware
  //    2) url_acceso    → URL externa (normalizada: si el operador escribió
  //                       "example.com" sin scheme, aquí se le antepone
  //                       "https://" para que el navegador no lo trate como
  //                       una ruta relativa y no caiga en /404). Defensa
  //                       contra el bug típico de apps tipo='programa'
  //                       huérfanas con URL externa (migrations 029/031 +
  //                       fallback GenericLanding en /app/[id]/page.tsx).
  //    3) fallback      → /app/<id> (programas reales, recursos internos, etc.)
  const normalizedUrlAcceso = normalizeExternalUrl(application.url_acceso)
  const hasAppSlug = !!application.app_slug
  const hasExternalUrl = !hasAppSlug && normalizedUrlAcceso != null

  const href = hasAppSlug
    ? `https://${application.app_slug}.tecuida.group`
    : hasExternalUrl
      ? normalizedUrlAcceso!
      : `/app/${application.id}`

  const isExternal = hasAppSlug || hasExternalUrl

  return (
    <Link
      href={href}
      target={isExternal ? '_blank' : undefined}
      rel={isExternal ? 'noopener noreferrer' : undefined}
      className="group relative flex flex-col rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-all duration-200 hover:shadow-lg hover:border-indigo-200 hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
    >
      {/* Badge de nivel */}
      <div className="absolute top-3 right-3">
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${tier.className}`}
        >
          {tier.label}
        </span>
      </div>

      {/* Icono y tipo */}
      <div className="flex items-center gap-3 mb-3">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-lg border ${typeColor}`}
        >
          {icon}
        </div>
        <div>
          <span
            className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${typeColor}`}
          >
            {typeLabel}
          </span>
        </div>
      </div>

      {/* Nombre */}
      <h3 className="text-base font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">
        {application.nombre}
      </h3>

      {/* Descripción */}
      <p className="mt-2 flex-1 text-sm text-gray-500 line-clamp-3">
        {application.descripcion || 'Sin descripción disponible.'}
      </p>

      {/* Categoría y CTA */}
      <div className="mt-4 flex items-center justify-between pt-3 border-t border-gray-100">
        {categoryName && (
          <span className="text-xs text-gray-400">{categoryName}</span>
        )}
        <span className="text-xs font-medium text-indigo-600 group-hover:translate-x-0.5 transition-transform">
          {application.tipo === 'herramienta' || application.tipo === 'recurso'
            ? 'Instalar →'
            : 'Abrir →'}
        </span>
      </div>
    </Link>
  )
}
