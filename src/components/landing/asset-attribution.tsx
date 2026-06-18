/**
 * ============================================================
 * AssetAttribution — Server Component para cumplir CC-BY-SA
 * ============================================================
 * Lee la fila correspondiente de `public.municipality_assets`
 * (creada en 019 con RLS abierto por 020) y renderiza la línea de
 * crédito obligatoria bajo cada asset cacheado del municipio.
 *
 * Por qué un Server Component:
 *   * Sin estado. Sin effects. Una sola query de lectura.
 *   * Aprovecha el caché de Next.js (se rerenderiza solo si la tabla
 *     cambia; `revalidatePath` se llama desde el admin al editar un asset).
 *   * Cumple WAI-ARIA con role="doc-credit" (reconocido por lectores
 *     de pantalla como metadata de crédito/descripción).
 *
 * Por qué NO usa el cliente admin (service_role):
 *   * El componente se monta en páginas públicas (landing del municipio)
 *     servidas por RSC. La RLS de migration_020 permite SELECT público
 *     via `createClient()` (anon-key), que es la ruta segura y consistente
 *     con @/lib/supabase/server.
 *
 * Por qué `maybeSingle` y no `single`:
 *   * Si --write no se ha ejecutado o si la fila no existe (caso de los
 *     2 escudos NULL en jerez-de-los-caballeros y villafranca-de-los-barros),
 *     queremos un fallback elegante ("Atribución pendiente") y NO un 500.
 *   * `.maybeSingle()` devuelve `{ data: null }` sin lanzar error.
 *
 * Compliance CC-BY-SA / dominio público:
 *   La línea mínima obligatoria es "Autor + Licencia + URL fuente".
 *   El componente sigue exactamente el patrón `attribution_line` ya
 *   formateado por el script de discovery (formatAttributionLine en
 *   scripts/discover-municipality-assets.ts).
 * ============================================================
 */

import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

// -----------------------------------------------------------------------------
// Tipos
// -----------------------------------------------------------------------------

export type AttributionKind = 'hero' | 'escudo'

export interface AssetAttributionProps {
  /** FK a public.municipalities.id, inyectada por el padre. */
  municipalityId: string
  /** Qué kind de asset atribuir. */
  kind: AttributionKind
  /** Clases extra para posicionamiento (Tailwind). */
  className?: string
}

interface AttributionRow {
  author: string
  license: string
  attribution_line: string
  source_url: string
}

// -----------------------------------------------------------------------------
// Fetch
// -----------------------------------------------------------------------------

async function fetchAttribution(
  municipalityId: string,
  kind: AttributionKind,
): Promise<AttributionRow | null> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('municipality_assets')
      .select('author, license, attribution_line, source_url')
      .eq('municipality_id', municipalityId)
      .eq('kind', kind)
      .maybeSingle()
    if (error || !data) return null
    return data as AttributionRow
  } catch {
    // Nunca romper el render del hero si la tabla falla — el componente
    // cae al fallback "Atribución pendiente" y el usuario sigue viendo
    // su municipio. Solo perdería la línea de crédito obligatoria, no
    // la imagen.
    return null
  }
}

// -----------------------------------------------------------------------------
// Componente
// -----------------------------------------------------------------------------

export async function AssetAttribution({
  municipalityId,
  kind,
  className = '',
}: AssetAttributionProps) {
  const row = await fetchAttribution(municipalityId, kind)
  const assetLabel =
    kind === 'hero' ? 'principal' : 'del escudo institucional'

  // ----- Fallback: la fila no existe (aún no se ha ejecutado --write
  //       o el asset está pendiente de verificación, e.g. jerez/villafranca).
  //       <aside> semánticamente equivalente a un credit block; role de
  //       WAI-ARIA estándar (cross-browser) en vez de doc-credit (DPUB).
  if (!row) {
    return (
      <aside
        className={`text-[11px] leading-snug text-white/55 not-italic ${className}`}
        aria-label={`Atribución pendiente de verificación para la imagen ${assetLabel}`}
      >
        <em>Atribución pendiente de verificación</em>
      </aside>
    )
  }

  // ----- Render normal: CC-BY-SA / dominio público / Unsplash License
  return (
    <aside
      className={`text-[11px] leading-snug text-white/80 ${className}`}
      aria-label={`Crédito de la imagen ${assetLabel}: ${row.attribution_line}`}
    >
      {row.author ? (
        <span>
          <span className="font-semibold">{row.author}</span>,{' '}
        </span>
      ) : (
        <span>Imagen, </span>
      )}
      <span>{row.license}, </span>
      <Link
        href={row.source_url}
        target="_blank"
        rel="noopener noreferrer"
        className="underline decoration-white/35 decoration-1 underline-offset-2 hover:decoration-white hover:text-white transition-colors"
      >
        vía Wikimedia Commons
      </Link>
    </aside>
  )
}
