/**
 * Hero rediseñado para la landing de cada municipio.
 *
 * Mejoras visuales sobre el hero anterior (page.tsx, TenantPage):
 *   - Viewport casi completo (calc(100vh - 80px)) para impacto de entrada.
 *   - Capa de patrón SVG diagonal sutil como textura (sin imagen si no hay foto).
 *   - Foto de fondo via tenant.hero_image_url con degradado vertical fuerte.
 *     Sin foto → degradado diagonal sobre el color corporativo primario del municipio.
 *   - Escudo oficial (tenant.escudo_url) como marca de agua institucional
 *     a la derecha, semitransparente, sólo en pantallas >= md.
 *   - "Sello" institucional: badge circular con la inicial del municipio,
 *     borde dorado + sombra interior, junto a un pill con el nombre del ayuntamiento.
 *   - Animación de entrada fade-in-up (definida en globals.css) que respeta
 *     prefers-reduced-motion.
 *   - Máscara diagonal inferior con un SVG inline para fundir el hero
 *     con la sección blanca de stats (menos recorte abrupto).
 *
 * Server Component puro — sin estado ni effects — para minimizar el bundle
 * del cliente y conservar la estrategia RSC del proyecto.
 */

import Link from 'next/link'
import { useId } from 'react'

export interface MunicipalityHeroProps {
  nombre_municipio: string
  nombre_ayuntamiento: string
  hero_image_url: string | null
  escudo_url: string | null
  descripcion: string | null
  colores_corporativos: Record<string, string>
}

export function MunicipalityHero({
  nombre_municipio,
  nombre_ayuntamiento,
  hero_image_url,
  escudo_url,
  descripcion,
  colores_corporativos,
}: MunicipalityHeroProps) {
  const inicial = nombre_municipio.charAt(0).toUpperCase()
  const primary = colores_corporativos.primary || '#142c19'
  // useId() genera un id estable entre SSR/CSR y evita colisiones si varios
  // MunicipalityHero conviven en la misma página (<defs> reutilizable).
  const linesId = useId()
  const fallbackText = `Programas y recursos para cuidar de las personas, fortalecer nuestra comunidad y construir juntos un ${nombre_municipio} más saludable y solidario.`

  return (      <section
        id="inicio"
        className="relative isolate flex min-h-[calc(100svh-90px)] items-end overflow-hidden text-white"
      >
      {/* ── Capa 1: foto de fondo (si existe) o color corporativo ── */}
      <div
        aria-hidden="true"
        className="animate-fade-in absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: hero_image_url ? `url(${hero_image_url})` : undefined,
          backgroundColor: primary,
        }}
      />

      {/* ── Capa 2: degradado de legibilidad. Más fuerte que antes (era 0.88/0.52/0.2)
           para que el texto sobre la foto tenga contraste AAA incluso con foto clara. ── */}
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background: hero_image_url
            ? 'linear-gradient(180deg, rgba(15,29,20,.45) 0%, rgba(15,29,20,.7) 55%, rgba(15,29,20,.96) 100%)'
            : `linear-gradient(135deg, ${primary} 0%, ${primary}E6 50%, #050d08 100%)`,
        }}
      />

      {/* ── Capa 3: patrón SVG diagonal sutil como textura decorativa ── */}
      <svg
        aria-hidden="true"
        focusable="false"
        className="absolute -right-40 top-1/2 h-[160%] w-[55%] -translate-y-1/2 opacity-[0.18] mix-blend-screen"
        viewBox="0 0 200 800"
        preserveAspectRatio="none"
      >
        <defs>
          <pattern
            id={linesId}
            patternUnits="userSpaceOnUse"
            width="44"
            height="44"
            patternTransform="rotate(20)"
          >
            <line x1="0" y1="0" x2="0" y2="44" stroke="#ffffff" strokeWidth="1" strokeOpacity="0.7" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#${linesId})`} />
      </svg>

      {/* ── Capa 4: escudo institucional como marca de agua (sólo >= md) ── */}
      {escudo_url && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute right-[7%] top-1/2 hidden -translate-y-1/2 lg:block"
        >
          <div
            className="h-[min(460px,58vh)] w-[min(460px,58vh)] rounded-full bg-contain bg-center bg-no-repeat opacity-25 blur-[1.5px]"
            style={{ backgroundImage: `url(${escudo_url})` }}
          />
        </div>
      )}

      {/* ── Contenido principal ── */}
      <div className="relative z-10 mx-auto w-full max-w-[1180px] px-[clamp(22px,5vw,70px)] pb-[clamp(90px,12vw,140px)] pt-[clamp(110px,14vw,180px)]">
        <div className="animate-fade-in-up">
          {/* Sello institucional + pill del ayuntamiento */}
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
              {nombre_ayuntamiento}
            </span>
          </div>

          <div className="mb-4 text-[#f4b64b] text-[13px] font-extrabold uppercase tracking-[.22em]">
            Bienestar · comunidad · {nombre_municipio}
          </div>

          <h1 className="mb-7 max-w-[820px] text-balance font-bold text-[clamp(56px,9vw,112px)] leading-[.92]">
            {nombre_municipio}
            <br />
            <span className="bg-gradient-to-r from-[#f4d884] via-[#f4b64b] to-[#bd7c25] bg-clip-text text-transparent">
              te cuida
            </span>
          </h1>

          <p className="mb-[34px] max-w-[600px] text-lg text-white/90">
            {descripcion || fallbackText}
          </p>

          <div className="flex flex-wrap gap-3.5">
            <a
              href="#programas"
              className="inline-flex items-center gap-2.5 min-h-[52px] px-6 rounded-xl no-underline font-extrabold bg-gradient-to-br from-[#e0a13a] to-[#bd7c25] text-white shadow-[0_14px_32px_rgba(189,124,37,.3)] hover:-translate-y-0.5 transition-transform"
            >
              Descubre los programas →
            </a>
            <Link
              href="/login"
              className="inline-flex items-center gap-2.5 min-h-[52px] px-6 rounded-xl no-underline font-extrabold border border-white/45 bg-white/10 text-white backdrop-blur-sm hover:-translate-y-0.5 transition-transform"
            >
              Accede a tu área →
            </Link>
          </div>
        </div>
      </div>

      {/* ── Máscara diagonal inferior: funde el hero con la siguiente sección ── */}
      <svg
        aria-hidden="true"
        focusable="false"
        viewBox="0 0 100 10"
        preserveAspectRatio="none"
        className="absolute inset-x-0 bottom-[-1px] h-10 w-full text-[#f7f1e7]"
      >
        <path d="M0,10 L0,3 L100,0 L100,10 Z" fill="currentColor" />
      </svg>
    </section>
  )
}
