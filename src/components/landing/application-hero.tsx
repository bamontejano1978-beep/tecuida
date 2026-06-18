/**
 * Hero para la página de detalle de aplicación (`/app/[id]`).
 *
 * Replica el lenguaje visual del `MunicipalityHero` rebrandándolo para
 * el contenido de la plataforma en lugar de la identidad institucional del
 * municipio:
 *   - Foto de fondo desde `applications.thumbnail_url` con overlay
 *     degradado vertical fuerte (igual que el hero municipal).
 *   - Sello con la **inicial del nombre de la aplicación** (no del municipio)
 *     en el mismo círculo dorado visto antes.
 *   - Pills de tipología (`programa`, `herramienta`, `encuesta`, `recurso`)
 *     y nivel de suscripción (`basico`, `estandar`, `premium`) — el segundo
 *     con gradient dorado para premium (más destacado).
 *   - Chip de progreso flotante arriba a la derecha cuando el usuario
 *     autenticado ya empezó el programa (overlay absoluto, no inline).
 *   - Eyebrow con el nombre de la categoría (vía join `categoria:categories`).
 *   - Mismas capas decorativas: pattern SVG diagonal + animación fade-in-up
 *     + máscara diagonal inferior (color `text-gray-50` para fundir con el
 *     `bg-gray-50` del body actual).
 *   - Sin estado ni effects → Server Component puro, mismo principio
 *     que `MunicipalityHero`.
 */

import Link from 'next/link'
import { useId } from 'react'

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export type ApplicationTipo = 'programa' | 'herramienta' | 'encuesta' | 'recurso'
export type ApplicationNivel = 'basico' | 'estandar' | 'premium'

export interface ApplicationHeroProgress {
  percent: number
  completed: number
  total: number
}

export interface ApplicationHeroProps {
  nombre: string
  descripcion: string | null
  tipo: ApplicationTipo
  nivel: ApplicationNivel
  thumbnail_url: string | null
  categoria_nombre: string | null
  /** Progreso del usuario autenticado. Si es null/undefined, no se muestra. */
  progress?: ApplicationHeroProgress | null
  /** Href del botón "← Volver al catálogo". Default: raíz (apex/tenant). */
  backHref?: string
}

// ---------------------------------------------------------------------------
// Subcomponentes locales — minimal, sin estado
// ---------------------------------------------------------------------------

const TIER_LABELS: Record<ApplicationNivel, string> = {
  basico: 'Básico',
  estandar: 'Estándar',
  premium: 'Premium',
}

/**
 * Estilos de la pill de nivel:
 *   - basico: neutro (mismo look que el pill de nombre_ayuntamiento del hero municipal)
 *   - estandar: azul tenue
 *   - premium: gradient dorado para destacar (mismo dorado que el sello)
 */
const TIER_PILL_CLASS: Record<ApplicationNivel, string> = {
  basico: 'border border-white/30 bg-white/10 text-white',
  estandar: 'border border-[#60a5fa]/45 bg-[#3b82f6]/20 text-[#bfdbfe]',
  premium:
    'border border-[#f4d884]/45 bg-gradient-to-br from-[#e4aa45]/30 to-[#bd7c25]/20 text-[#f4d884]',
}

const TIPO_LABELS: Record<ApplicationTipo, string> = {
  programa: 'Programa',
  herramienta: 'Herramienta',
  encuesta: 'Encuesta',
  recurso: 'Recurso',
}

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------

export function ApplicationHero({
  nombre,
  descripcion,
  tipo,
  nivel,
  thumbnail_url,
  categoria_nombre,
  progress,
  backHref = '/',
}: ApplicationHeroProps) {
  const inicial = nombre.charAt(0).toUpperCase()
  const patternId = useId()

  // Validación defensiva (solo dev). En runtime los campos vienen como
  // `string` desde Supabase pero TS cast nos promete literales — alertamos
  // si la BD trae un valor inesperado (riesgo tras seeds/bulk-assigns).
  // Usamos readonly array literal + .includes() en vez de Set para evitar
  // widening a `string[]` y problemas de iteration protocol con targets viejos.
  if (process.env.NODE_ENV !== 'production') {
    const VALID_TIPOS: readonly ApplicationTipo[] = [
      'programa', 'herramienta', 'encuesta', 'recurso',
    ]
    const VALID_NIVELES: readonly ApplicationNivel[] = [
      'basico', 'estandar', 'premium',
    ]
    if (!VALID_TIPOS.includes(tipo)) {
      console.warn(
        `[ApplicationHero] Invalid tipo="${tipo}" — expected one of ${VALID_TIPOS.join(', ')}. Verifica applications.tipo.`,
      )
    }
    if (!VALID_NIVELES.includes(nivel)) {
      console.warn(
        `[ApplicationHero] Invalid nivel="${nivel}" — expected one of ${VALID_NIVELES.join(', ')}. Verifica applications.nivel_suscripcion.`,
      )
    }
  }

  // Las páginas de aplicación no tienen tenant colors corporativo propios,
  // así que usan la paleta base de la plataforma (mismo verde oscuro
  // #142c19 que MunicipalityHero cuando hero_image_url es null).
  const primary = '#142c19'
  const fallbackText = `Aplicación de bienestar disponible en tu municipio. Pulsa "Ver lecciones" para empezar.`

  const talloProgress = progress && progress.percent > 0

  return (
    <section className="relative isolate flex min-h-[calc(100svh-90px)] items-end overflow-hidden text-white">
      {/* ── Capa 1: foto de fondo o color corporativo de la plataforma ── */}
      <div
        aria-hidden="true"
        className="animate-fade-in absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: thumbnail_url ? `url(${thumbnail_url})` : undefined,
          backgroundColor: primary,
        }}
      />

      {/* ── Capa 2: overlay degradado fuerte para legibilidad del texto ── */}
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background: thumbnail_url
            ? 'linear-gradient(180deg, rgba(15,29,20,.45) 0%, rgba(15,29,20,.7) 55%, rgba(15,29,20,.96) 100%)'
            : `linear-gradient(135deg, ${primary} 0%, ${primary}E6 50%, #050d08 100%)`,
        }}
      />

      {/* ── Capa 3: pattern SVG diagonal sutil como textura decorativa ── */}
      <svg
        aria-hidden="true"
        focusable="false"
        className="absolute -right-40 top-1/2 h-[160%] w-[55%] -translate-y-1/2 opacity-[0.18] mix-blend-screen"
        viewBox="0 0 200 800"
        preserveAspectRatio="none"
      >
        <defs>
          <pattern
            id={patternId}
            patternUnits="userSpaceOnUse"
            width="44"
            height="44"
            patternTransform="rotate(20)"
          >
            <line x1="0" y1="0" x2="0" y2="44" stroke="#ffffff" strokeWidth="1" strokeOpacity="0.7" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#${patternId})`} />
      </svg>

      {/* ── Chip de progreso flotante (overlay arriba-derecha) ── */}
      {talloProgress && progress && (
        <div
          aria-live="polite"
          className="absolute right-[clamp(22px,5vw,70px)] top-7 z-20 hidden items-center gap-3 rounded-full border border-emerald-200/35 bg-emerald-500/25 px-5 py-2 backdrop-blur-md sm:inline-flex"
        >
          <span className="block h-2 w-2 rounded-full bg-emerald-200 [box-shadow:0_0_8px_rgba(167,243,208,.7)]" />
          <span className="text-sm font-extrabold text-emerald-50">
            {progress.percent}% completado
          </span>
          <span className="text-xs font-semibold text-emerald-100/80">
            ({progress.completed}/{progress.total})
          </span>
        </div>
      )}

      {/* ── Contenido principal ── */}
      <div className="relative z-10 mx-auto w-full max-w-[1180px] px-[clamp(22px,5vw,70px)] pb-[clamp(90px,12vw,140px)] pt-[clamp(110px,14vw,180px)]">
        <div className="animate-fade-in-up">
          {/* Sello + pills de tipo + nivel */}
          <div className="mb-7 flex flex-wrap items-center gap-3.5">
            <div
              aria-hidden="true"
              className="grid h-[58px] w-[58px] place-items-center rounded-full border-2 border-[#e4aa45] shadow-[inset_0_0_0_4px_rgba(228,170,69,.18),0_0_0_6px_rgba(228,170,69,.08)] backdrop-blur-md transition-transform hover:rotate-3"
              style={{ background: 'rgba(15,29,20,.42)' }}
            >
              <span className="font-extrabold text-[26px] leading-none text-[#f4d884]">
                {inicial}
              </span>
            </div>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-4 py-1.5 text-[11px] font-extrabold uppercase tracking-[.22em] backdrop-blur-md">
              <span className="block h-1.5 w-1.5 rounded-full bg-[#e4aa45]" />
              {TIPO_LABELS[tipo] || tipo}
            </span>
            <span
              className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-[11px] font-extrabold uppercase tracking-[.22em] backdrop-blur-md ${TIER_PILL_CLASS[nivel]}`}
            >
              {TIER_LABELS[nivel]}
            </span>
          </div>

          {/* Eyebrow: categoría + pista del contexto */}
          <div className="mb-4 text-[#f4b64b] text-[13px] font-extrabold uppercase tracking-[.22em]">
            {categoria_nombre ? `${categoria_nombre} · bienestar · plataforma` : 'Aplicación · bienestar · plataforma'}
          </div>

          <h1 className="mb-7 max-w-[820px] text-balance font-bold text-[clamp(56px,9vw,112px)] leading-[.92]">
            {nombre}
          </h1>

          <p className="mb-[34px] max-w-[600px] text-lg text-white/90">
            {descripcion || fallbackText}
          </p>

          <div className="flex flex-wrap gap-3.5">
            <a
              href="#lecciones"
              className="inline-flex items-center gap-2.5 min-h-[52px] px-6 rounded-xl no-underline font-extrabold bg-gradient-to-br from-[#e0a13a] to-[#bd7c25] text-white shadow-[0_14px_32px_rgba(189,124,37,.3)] hover:-translate-y-0.5 transition-transform"
            >
              Ver lecciones →
            </a>
            <Link
              href={backHref}
              className="inline-flex items-center gap-2.5 min-h-[52px] px-6 rounded-xl no-underline font-extrabold border border-white/45 bg-white/10 text-white backdrop-blur-sm hover:-translate-y-0.5 transition-transform"
            >
              ← Volver al catálogo
            </Link>
          </div>
        </div>
      </div>

      {/* ── Máscara diagonal inferior: funde con `bg-gray-50` del body ── */}
      <svg
        aria-hidden="true"
        focusable="false"
        viewBox="0 0 100 10"
        preserveAspectRatio="none"
        className="absolute inset-x-0 bottom-[-1px] h-10 w-full text-gray-50"
      >
        <path d="M0,10 L0,3 L100,0 L100,10 Z" fill="currentColor" />
      </svg>
    </section>
  )
}
