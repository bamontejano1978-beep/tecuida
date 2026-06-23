/**
 * Página PWA de aplicación — servida en <appSlug>.tecuida.group
 *
 * Cada app tiene su propia identidad visual:
 *   - Hero con su thumbnail, color de marca y tipografía propia
 *   - Programas: ModuleAccordion + LessonViewer interactivos
 *   - Herramientas/Recursos/Encuestas: landing con acceso directo
 *
 * Server Component que:
 *   1. Lee x-app-* headers inyectados por el middleware
 *   2. Si no hay headers (acceso directo), busca por slug en DB
 *   3. Renderiza el hero de la app + el contenido según tipo
 *
 * Ruta: /apps/[appSlug] (reescrita internamente por el middleware)
 */

import { notFound } from 'next/navigation'
import { headers } from 'next/headers'
import { createAdminClient } from '@/lib/supabase/server'
import GenericAppLanding from '@/components/landing/generic-app-landing'
import type { Program, ProgramModule, Lesson } from '@/types'
import AppProgramClient from './program-client'
import Reto30ProgramClient from '../reto30-program-client'

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

interface Props {
  params: { appSlug: string }
}

// ---------------------------------------------------------------------------
// Colores por defecto según tipo
// ---------------------------------------------------------------------------

const TYPE_COLORS: Record<string, string> = {
  programa: '#4f46e5',
  herramienta: '#2563eb',
  encuesta: '#d97706',
  recurso: '#059669',
}

const TYPE_LABELS: Record<string, string> = {
  programa: 'Programa',
  herramienta: 'Herramienta',
  encuesta: 'Encuesta',
  recurso: 'Recurso',
}

const TYPE_CTAS: Record<string, { label: string; icon: string }> = {
  programa: { label: 'Ver módulos', icon: '📋' },
  herramienta: { label: 'Abrir aplicación', icon: '🚀' },
  encuesta: { label: 'Comenzar encuesta', icon: '📝' },
  recurso: { label: 'Explorar recurso', icon: '📖' },
}

// ---------------------------------------------------------------------------
// Subcomponente: Hero de la app (server)
// ---------------------------------------------------------------------------

function AppHero({
  nombre,
  descripcion,
  tipo,
  brandColor,
  thumbnailUrl,
  categoriaNombre,
  ctaLabel,
  ctaHref,
}: {
  nombre: string
  descripcion: string | null
  tipo: string
  brandColor: string
  thumbnailUrl: string | null
  categoriaNombre: string | null
  ctaLabel: string
  ctaHref: string
}) {
  const inicial = nombre.charAt(0).toUpperCase()
  const patternId = `app-hero-pattern-${nombre.replace(/\s+/g, '-').toLowerCase()}`

  return (
    <section className="relative isolate flex min-h-[55vh] items-end overflow-hidden text-white">
      {/* Capa 1: foto de fondo o color sólido */}
      <div
        aria-hidden="true"
        className="animate-fade-in absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: thumbnailUrl ? `url(${thumbnailUrl})` : undefined,
          backgroundColor: brandColor,
        }}
      />

      {/* Capa 2: overlay degradado para legibilidad */}
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background: thumbnailUrl
            ? `linear-gradient(180deg, rgba(0,0,0,.35) 0%, rgba(0,0,0,.55) 50%, rgba(0,0,0,.9) 100%)`
            : `linear-gradient(135deg, ${brandColor} 0%, ${brandColor}dd 50%, ${brandColor}66 100%)`,
        }}
      />

      {/* Capa 3: pattern SVG diagonal sutil */}
      <svg
        aria-hidden="true"
        focusable="false"
        className="absolute -right-40 top-1/2 h-[160%] w-[55%] -translate-y-1/2 opacity-[0.12] mix-blend-screen"
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

      {/* Contenido */}
      <div className="relative z-10 mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8 pb-12 pt-24 sm:pt-32">
        <div className="animate-fade-in-up">
          {/* Sello + pills */}
          <div className="mb-5 flex flex-wrap items-center gap-3">
            <div
              aria-hidden="true"
              className="grid h-[52px] w-[52px] place-items-center rounded-full border-2 border-white/40 shadow-[inset_0_0_0_3px_rgba(255,255,255,.12),0_0_0_5px_rgba(255,255,255,.06)] backdrop-blur-md"
              style={{ background: 'rgba(0,0,0,.3)' }}
            >
              <span className="font-extrabold text-[22px] leading-none text-white/90">
                {inicial}
              </span>
            </div>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3.5 py-1 text-[11px] font-extrabold uppercase tracking-[.18em] backdrop-blur-md">
              <span
                className="block h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: brandColor }}
              />
              {TYPE_LABELS[tipo] || tipo}
            </span>
            {categoriaNombre && (
              <span className="text-xs text-white/60 font-medium">
                {categoriaNombre}
              </span>
            )}
          </div>

          {/* Título */}
          <h1 className="mb-4 max-w-2xl text-balance font-bold text-[clamp(40px,7vw,72px)] leading-[.95]">
            {nombre}
          </h1>

          {/* Descripción */}
          <p className="mb-8 max-w-lg text-base sm:text-lg text-white/85 leading-relaxed">
            {descripcion || 'Aplicación de bienestar disponible en tu municipio.'}
          </p>

          {/* CTAs */}
          <div className="flex flex-wrap gap-3">
            <a
              href={ctaHref}
              className="inline-flex items-center gap-2.5 min-h-[48px] px-6 rounded-xl no-underline font-extrabold text-white shadow-lg hover:-translate-y-0.5 transition-transform"
              style={{
                background: `linear-gradient(135deg, ${brandColor}, ${brandColor}dd)`,
                boxShadow: `0 12px 28px ${brandColor}40`,
              }}
            >
              {ctaLabel} →
            </a>
          </div>
        </div>
      </div>

      {/* Máscara diagonal inferior */}
      <svg
        aria-hidden="true"
        focusable="false"
        viewBox="0 0 100 10"
        preserveAspectRatio="none"
        className="absolute inset-x-0 bottom-[-1px] h-8 w-full text-[#fafafa]"
      >
        <path d="M0,10 L0,3 L100,0 L100,10 Z" fill="currentColor" />
      </svg>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Página principal
// ---------------------------------------------------------------------------

export default async function AppSubdomainPage({ params }: Props) {
  const headerList = headers()
  const appId = headerList.get('x-app-id')
  const appName = headerList.get('x-app-name')
  const appType = headerList.get('x-app-type')
  const appUrl = headerList.get('x-app-url')
  const appBrandColor = headerList.get('x-app-brand-color')
  const appThumbnail = headerList.get('x-app-thumbnail')
  const appDescription = headerList.get('x-app-description')
  const appCategory = headerList.get('x-app-category')

  // Fallback: si no hay headers del middleware, buscar por slug
  if (!appId) {
    const adminClient = createAdminClient()
    const { data } = await adminClient
      .from('applications')
      .select('id, nombre, tipo, descripcion, thumbnail_url, brand_color, instrucciones, url_acceso, categoria:categories(nombre)')
      .eq('app_slug', params.appSlug)
      .eq('activa', true)
      .single()

    if (!data) notFound()

    const tipo = (data.tipo as string) || 'herramienta'
    const brandColor = (data.brand_color as string) || TYPE_COLORS[tipo] || '#4f46e5'
    const catNombre = (data.categoria as unknown as { nombre: string } | null)?.nombre ?? null
    const cta = TYPE_CTAS[tipo] || TYPE_CTAS.herramienta

    return (
      <>
        <AppHero
          nombre={data.nombre as string}
          descripcion={(data.descripcion as string) || null}
          tipo={tipo}
          brandColor={brandColor}
          thumbnailUrl={(data.thumbnail_url as string) || null}
          categoriaNombre={catNombre}
          ctaLabel={cta.label}
          ctaHref="#contenido"
        />
        <div id="contenido">
          <GenericAppLanding
            nombre={data.nombre as string}
            descripcion={(data.descripcion as string) || null}
            tipo={tipo}
            instrucciones={(data.instrucciones as string) || null}
            url_acceso={(data.url_acceso as string) || null}
            categoria_nombre={catNombre}
          />
        </div>
      </>
    )
  }

  // App resuelta por middleware
  const tipo = appType || 'programa'
  const brandColor = appBrandColor || TYPE_COLORS[tipo] || '#4f46e5'
  const nombre = appName || 'Aplicación'
  const descripcion = appDescription || null
  const thumbnailUrl = appThumbnail || null
  const catNombre = appCategory || null

  // ── No-programa: hero + landing genérica ──
  if (tipo !== 'programa') {
    const adminClient = createAdminClient()
    const { data } = await adminClient
      .from('applications')
      .select('descripcion, instrucciones, url_acceso, categoria:categories(nombre)')
      .eq('id', appId)
      .single()

    const cta = TYPE_CTAS[tipo] || TYPE_CTAS.herramienta
    const urlAcceso = appUrl ?? (data?.url_acceso as string) ?? null

    return (
      <>
        <AppHero
          nombre={nombre}
          descripcion={descripcion ?? (data?.descripcion as string) ?? null}
          tipo={tipo}
          brandColor={brandColor}
          thumbnailUrl={thumbnailUrl}
          categoriaNombre={catNombre ?? (data?.categoria as unknown as { nombre: string } | null)?.nombre ?? null}
          ctaLabel={cta.label}
          ctaHref={urlAcceso || '#contenido'}
        />
        <div id="contenido">
          <GenericAppLanding
            nombre={nombre}
            descripcion={data?.descripcion ? (data.descripcion as string) : descripcion}
            tipo={tipo}
            instrucciones={(data?.instrucciones as string) || null}
            url_acceso={urlAcceso}
            categoria_nombre={catNombre}
          />
        </div>
      </>
    )
  }

  // ── Programa: hero + datos completos (program, modules, lessons) ──
  const isReto30 = params.appSlug === 'reto30'

  const adminClient = createAdminClient()

  // Usamos `maybeSingle()` para no romper apps tipo='programa' que se crearon
  // con solo `url_acceso` (sin subir ZIP ni crear registro en `programs`).
  // En ese caso la app existe y es accesible → fallback a landing genérica
  // en lugar de devolver un 404 confuso para el ciudadano.
  const { data: programData } = await adminClient
    .from('programs')
    .select('*')
    .eq('application_id', appId)
    .maybeSingle()

  if (!programData) {
    console.warn(
      `[AppSubdomainPage] App "${nombre}" (${tipo}) no tiene programa asociado. Renderizando landing genérica.`,
    )

    // Necesitamos los datos del app (instrucciones, url_acceso, categoría) para
    // pintar la landing genérica con la misma coherencia que la rama no-programa.
    const { data: appRow } = await adminClient
      .from('applications')
      .select('descripcion, instrucciones, url_acceso, categoria:categories(nombre)')
      .eq('id', appId)
      .maybeSingle()

    const cta = TYPE_CTAS[tipo] || TYPE_CTAS.herramienta
    const urlAcceso = appUrl ?? (appRow?.url_acceso as string) ?? null
    const fallbackDescripcion =
      (appRow?.descripcion as string | null | undefined) ?? descripcion ?? null

    return (
      <>
        <AppHero
          nombre={nombre}
          descripcion={fallbackDescripcion}
          tipo={tipo}
          brandColor={brandColor}
          thumbnailUrl={thumbnailUrl}
          categoriaNombre={
            catNombre ??
            (appRow?.categoria as unknown as { nombre: string } | null)?.nombre ??
            null
          }
          ctaLabel={cta.label}
          ctaHref={urlAcceso || '#contenido'}
        />
        <div id="contenido">
          <GenericAppLanding
            nombre={nombre}
            descripcion={fallbackDescripcion}
            tipo={tipo}
            instrucciones={(appRow?.instrucciones as string) || null}
            url_acceso={urlAcceso}
            categoria_nombre={catNombre}
          />
        </div>
      </>
    )
  }

  const { data: modulesData } = await adminClient
    .from('program_modules')
    .select('*')
    .eq('program_id', programData.id)
    .order('numero', { ascending: true })

  const moduleIds = (modulesData || []).map((m) => m.id)
  const { data: lessonsData } = moduleIds.length > 0
    ? await adminClient
        .from('lessons')
        .select('*')
        .in('module_id', moduleIds)
        .order('orden', { ascending: true })
    : { data: [] }

  // Construir estructura anidada
  const lessonsByModule = new Map<string, Lesson[]>()
  ;(lessonsData || []).forEach((l) => {
    const lesson: Lesson = {
      id: l.id,
      module_id: l.module_id,
      titulo: l.titulo,
      tipo: l.tipo as Lesson['tipo'],
      contenido_texto: l.contenido_texto || undefined,
      audio_url: l.audio_url || undefined,
      video_url: l.video_url || undefined,
      ejercicio: l.ejercicio
        ? (l.ejercicio as unknown as Lesson['ejercicio'])
        : undefined,
      duracion_minutos: l.duracion_minutos,
      orden: l.orden,
    }
    const arr = lessonsByModule.get(l.module_id) || []
    arr.push(lesson)
    lessonsByModule.set(l.module_id, arr)
  })

  const modules: ProgramModule[] = (modulesData || []).map((m) => ({
    id: m.id,
    program_id: m.program_id,
    numero: m.numero,
    nombre: m.nombre,
    descripcion: (m.descripcion as string) || '',
    lessons: lessonsByModule.get(m.id) || [],
  }))

  const program: Program = {
    id: programData.id,
    application_id: programData.application_id,
    nombre: programData.nombre,
    descripcion: (programData.descripcion as string) || '',
    total_sesiones: programData.total_sesiones,
    modules,
  }

  const totalLessons = modules.reduce((sum, m) => sum + m.lessons.length, 0)
  const cta = TYPE_CTAS.programa

  return (
    <>
      <AppHero
        nombre={nombre}
        descripcion={descripcion ?? program.descripcion}
        tipo={tipo}
        brandColor={brandColor}
        thumbnailUrl={thumbnailUrl}
        categoriaNombre={catNombre}
        ctaLabel={cta.label}
        ctaHref="#modulos"
      />

      {/* ── Programa: acordeón de módulos + visor de lecciones ── */}
      <div id="modulos" className="bg-[#fafafa]">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
          {/* Resumen del programa */}
          <div className="mb-10">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {program.nombre}
            </h2>
            <p className="text-sm text-gray-500">
              {program.descripcion || 'Programa de bienestar'}
            </p>
            <div className="mt-4 flex flex-wrap gap-4 text-sm text-gray-500">
              <span className="inline-flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 8.25h-2.25A2.25 2.25 0 0 1 13.5 6V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z" />
                </svg>
                {modules.length} módulos
              </span>
              <span className="inline-flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
                {totalLessons} lecciones
              </span>
            </div>
          </div>

          {/* Visor interactivo (Client Component) */}
          {isReto30 ? (
            <Reto30ProgramClient
              modules={modules}
              programId={program.id}
              appBrandColor={brandColor}
            />
          ) : (
            <AppProgramClient
              modules={modules}
              programId={program.id}
              appBrandColor={brandColor}
            />
          )}
        </div>
      </div>
    </>
  )
}
