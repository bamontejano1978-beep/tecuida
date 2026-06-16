/**
 * Página principal — Landing institucional + catálogo de aplicaciones por tenant
 *
 * Server Component que:
 *   1. Lee los headers x-tenant-* inyectados por el middleware
 *   2. Obtiene la configuración completa del municipio desde DB
 *   3. Consulta las aplicaciones activas con sus categorías
 *   4. Renderiza una landing institucional con diseño de ayuntamiento
 *
 * Requisitos: 2.1, 6.2, 7.1
 */

import Link from 'next/link'
import { getTenantConfigFromDB, getTenantFromHeaders } from '@/lib/tenant/headers'
import { createAdminClient } from '@/lib/supabase/server'
import { DEMO_APPS, DEMO_CATEGORIES } from '@/lib/demo-data'
import CatalogClient from './catalog-client'
import { MunicipalityHero } from '@/components/landing/municipality-hero'

// ---------------------------------------------------------------------------
// Tipos locales
// ---------------------------------------------------------------------------

interface AppRow {
  application_id: string
  application: {
    id: string
    category_id: string
    nombre: string
    descripcion: string
    thumbnail_url: string | null
    tipo: string
    nivel_suscripcion: string
    activa: boolean
  } | null
}

interface CategoryRow {
  id: string
  nombre: string
}

// ===========================================================================
// Componente: Landing genérica (sin tenant — dominio raíz)
// ===========================================================================

function RootLanding() {
  return (
    <div className="min-h-screen font-sans text-[#20231f] bg-[#f7f1e7]">
      {/* ── Topbar ── */}
      <header className="sticky top-0 z-50 flex items-center justify-between gap-7 px-[clamp(20px,5vw,70px)] py-[18px] bg-gradient-to-r from-[#142c19] to-[#264d2c] text-white shadow-lg">
        <Link href="/" className="flex items-center gap-3.5 no-underline text-white min-w-max">
          <span className="w-12 h-12 rounded-2xl grid place-items-center bg-gradient-to-br from-[#e4aa45] to-[#b87924] text-white font-bold text-3xl shadow-[inset_0_0_0_1px_rgba(255,255,255,.38)]">
            T
          </span>
          <span>
            <strong className="block text-xl leading-tight">TE CUIDA</strong>
            <span className="block text-xs opacity-80 tracking-wider">Plataforma de bienestar ciudadano</span>
          </span>
        </Link>
        <Link
          href="/login"
          className="border border-white/40 rounded-2xl px-[18px] py-3 no-underline font-bold text-sm bg-white/10 hover:bg-white/20 transition-colors"
        >
          Área ciudadana
        </Link>
      </header>

      {/* ── Hero ── */}
      <section className="relative min-h-[650px] text-white overflow-hidden bg-cover bg-center" style={{ backgroundImage: "linear-gradient(90deg, rgba(15,29,20,.88), rgba(15,29,20,.52) 48%, rgba(15,29,20,.2)), url('https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=1920&q=80')" }}>
        <div className="py-[clamp(70px,11vw,135px)] px-[clamp(22px,5vw,70px)] max-w-[1180px] pb-[120px]">
          <div className="text-[#f4b64b] font-extrabold tracking-[.22em] uppercase text-[13px] mb-5">
            Bienestar · comunidad · futuro
          </div>
          <h1 className="font-bold text-[clamp(55px,9vw,104px)] leading-[.92] mb-6 max-w-[720px] text-balance">
            TE CUIDA
          </h1>
          <p className="max-w-[560px] text-xl mb-[34px] text-white/90">
            La plataforma que conecta ayuntamientos y ciudadanía para promover el bienestar emocional, la salud comunitaria y el apoyo a las familias en todo el territorio.
          </p>
          <div className="flex flex-wrap gap-3.5">
            <Link
              href="/register"
              className="inline-flex items-center gap-2.5 min-h-[52px] px-6 rounded-xl no-underline font-extrabold bg-gradient-to-br from-[#e0a13a] to-[#bd7c25] text-white shadow-[0_14px_32px_rgba(189,124,37,.3)] hover:-translate-y-0.5 transition-transform"
            >
              Comienza ahora →
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-2.5 min-h-[52px] px-6 rounded-xl no-underline font-extrabold border border-white/45 bg-white/10 text-white backdrop-blur-sm hover:-translate-y-0.5 transition-transform"
            >
              Iniciar sesión →
            </Link>
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      <section aria-label="Resumen de la plataforma" className="w-[min(1120px,calc(100%-40px))] -mt-[62px] mx-auto relative z-10 grid grid-cols-4 overflow-hidden bg-white/95 border border-white/70 rounded-[20px] shadow-[0_24px_70px_rgba(35,30,18,.13)] backdrop-blur-md max-md:grid-cols-2 max-sm:grid-cols-1">
        {[
          { icon: '🏛️', value: '26', label: 'Aplicaciones' },
          { icon: '📋', value: '6', label: 'Categorías' },
          { icon: '🌿', value: '30', label: 'Días Mindful30' },
          { icon: '👥', value: '360°', label: 'Bienestar integral' },
        ].map((stat, i) => (
          <div key={i} className="flex items-center gap-4 p-[28px_30px] border-r border-[rgba(35,45,30,.13)] last:border-r-0 max-md:[&:nth-child(2)]:border-r-0 max-md:[&:nth-child(1)]:border-b max-md:[&:nth-child(2)]:border-b max-sm:border-r-0 max-sm:border-b max-sm:last:border-b-0">
            <div className="w-[54px] h-[54px] rounded-full bg-[#f5efe2] grid place-items-center text-[26px] shrink-0">
              {stat.icon}
            </div>
            <div>
              <strong className="block text-[#38633e] font-bold text-[35px] leading-none">{stat.value}</strong>
              <span className="block text-[#30372e] text-xs font-extrabold tracking-[.06em] uppercase">{stat.label}</span>
            </div>
          </div>
        ))}
      </section>

      {/* ── Cómo funciona ── */}
      <main className="py-[70px] px-[clamp(20px,5vw,70px)]">
        <section>
          <div className="flex justify-between items-end gap-5 mx-auto mb-7 max-w-[1120px] max-sm:block">
            <div>
              <div className="text-[#38633e] text-[13px] font-black tracking-[.18em] uppercase mb-1.5">
                ¿Cómo funciona?
              </div>
              <h2 className="font-bold text-[clamp(34px,5vw,48px)] leading-tight mb-0">
                Tu municipio, tu bienestar
              </h2>
              <p className="text-[#64705e] max-w-[610px] mt-3.5">
                Cada ayuntamiento tiene su propio portal personalizado. Los ciudadanos acceden a programas de mindfulness, apoyo familiar, salud y más, todo adaptado a su comunidad.
              </p>
            </div>
          </div>

          <div className="max-w-[1120px] mx-auto grid grid-cols-3 gap-6 max-md:grid-cols-1">
            {[
              { icon: '🏛️', title: 'Portal municipal', desc: 'Cada municipio tiene su subdominio con colores, escudo y contenidos institucionales propios.' },
              { icon: '📱', title: 'Acceso ciudadano', desc: 'Los vecinos se registran con su email y acceden a todos los programas activos de su ayuntamiento.' },
              { icon: '📊', title: 'Seguimiento personal', desc: 'Cada ciudadano lleva su progreso en los programas, gana logros y recibe recomendaciones.' },
              { icon: '🌐', title: 'Multi-tenant', desc: 'Una sola plataforma, múltiples ayuntamientos. Cada uno gestiona sus aplicaciones y contenidos.' },
              { icon: '🔒', title: 'Datos protegidos', desc: 'Cada municipio solo ve los datos de sus ciudadanos. La privacidad es prioritaria con RLS.' },
              { icon: '♻️', title: 'Sostenible', desc: 'Los programas se actualizan centralizadamente y llegan a todos los municipios al instante.' },
            ].map((item, i) => (
              <div
                key={i}
                className="relative block min-h-[205px] p-7 rounded-[18px] no-underline bg-white/80 border border-[rgba(35,45,30,.13)] shadow-[0_16px_45px_rgba(53,45,31,.08)] overflow-hidden hover:-translate-y-1.5 hover:shadow-[0_22px_60px_rgba(53,45,31,.13)] transition-all border-t-4 border-t-[#38633e]"
              >
                <div className="w-16 h-16 rounded-[18px] grid place-items-center text-[32px] bg-[#eef5ea] mb-[18px]">
                  {item.icon}
                </div>
                <h3 className="font-bold text-2xl leading-tight mb-2.5">{item.title}</h3>
                <p className="text-[#52604e] text-[15px] m-0">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="mt-[70px] p-11 rounded-[26px] bg-gradient-to-br from-[#19371f] to-[#38633e] text-white max-w-[1120px] mx-auto max-sm:p-7 max-sm:px-5">
          <div className="text-[#f0b64e] text-[13px] font-black tracking-[.18em] uppercase mb-1.5">Acceso directo</div>
          <h2 className="font-bold text-[clamp(34px,5vw,48px)] leading-tight mb-0">Empieza ahora</h2>
          <div className="grid grid-cols-4 gap-3.5 mt-6 max-md:grid-cols-2 max-sm:grid-cols-1">
            <Link href="/register" className="p-[22px_16px] rounded-2xl text-center no-underline bg-white/10 border border-white/15 font-extrabold hover:bg-white/20 transition-colors">
              <b className="block text-[27px] mb-2">📋</b>Registrarse
            </Link>
            <Link href="/login" className="p-[22px_16px] rounded-2xl text-center no-underline bg-white/10 border border-white/15 font-extrabold hover:bg-white/20 transition-colors">
              <b className="block text-[27px] mb-2">🔑</b>Iniciar sesión
            </Link>
            <a href="#catalogo" className="p-[22px_16px] rounded-2xl text-center no-underline bg-white/10 border border-white/15 font-extrabold hover:bg-white/20 transition-colors">
              <b className="block text-[27px] mb-2">🌿</b>Ver programas
            </a>
            <a href="mailto:info@tecuida.group" className="p-[22px_16px] rounded-2xl text-center no-underline bg-white/10 border border-white/15 font-extrabold hover:bg-white/20 transition-colors">
              <b className="block text-[27px] mb-2">📧</b>Contactar
            </a>
          </div>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className="bg-[#152b19] text-white/75 py-[38px] px-[clamp(20px,5vw,70px)]">
        <div className="max-w-[1120px] mx-auto flex justify-between gap-7 flex-wrap">
          <div>
            <strong className="text-white font-bold text-2xl">TE CUIDA</strong>
            <p className="mt-2">Plataforma de bienestar emocional y salud comunitaria para ayuntamientos.</p>
          </div>
          <div>
            <b className="text-white">Contacto</b>
            <a href="mailto:info@tecuida.group" className="block mt-1.5 text-white/75 no-underline hover:text-white">info@tecuida.group</a>
          </div>
          <div>
            <b className="text-white">Plataforma</b>
            <Link href="/login" className="block mt-1.5 text-white/75 no-underline hover:text-white">Iniciar sesión</Link>
            <Link href="/register" className="block mt-1.5 text-white/75 no-underline hover:text-white">Registrarse</Link>
            <a href="#catalogo" className="block mt-1.5 text-white/75 no-underline hover:text-white">Programas</a>
          </div>
        </div>
      </footer>
    </div>
  )
}

// ===========================================================================
// Componente: Página de tenant (subdominio de municipio)
// ===========================================================================

async function TenantPage({
  tenant,
  validApps,
  categoriesWithCounts,
}: {
  tenant: {
    id: string
    nombre_municipio: string
    nombre_ayuntamiento: string
    escudo_url: string | null
    logo_url: string | null
    hero_image_url: string | null
    colores_corporativos: Record<string, string>
    textos_institucionales: Record<string, string>
  }
  validApps: {
    id: string
    categoria_id: string
    nombre: string
    descripcion: string
    thumbnail_url: string
    tipo: 'programa' | 'herramienta' | 'encuesta' | 'recurso'
    nivel: 'basico' | 'estandar' | 'premium'
    activa: boolean
  }[]
  categoriesWithCounts: { id: string; nombre: string; count: number }[]
}) {
  const inicial = tenant.nombre_municipio.charAt(0).toUpperCase()
  const primary = tenant.colores_corporativos.primary || '#142c19'

  return (
    <div className="min-h-screen font-sans text-[#20231f] bg-[#f7f1e7]">
      {/* ── Topbar ── */}
      <header className="sticky top-0 z-50 flex items-center justify-between gap-7 px-[clamp(20px,5vw,70px)] py-[18px] bg-gradient-to-r from-[#142c19] to-[#264d2c] text-white shadow-lg">
        <Link href="/" className="flex items-center gap-3.5 no-underline text-white min-w-max">
          <span className="w-12 h-12 rounded-2xl grid place-items-center bg-gradient-to-br from-[#e4aa45] to-[#b87924] text-white font-bold text-3xl shadow-[inset_0_0_0_1px_rgba(255,255,255,.38)]">
            {inicial}
          </span>
          <span>
            <strong className="block text-xl leading-tight">{tenant.nombre_ayuntamiento}</strong>
            <span className="block text-xs opacity-80 tracking-wider">{tenant.nombre_municipio} te cuida</span>
          </span>
        </Link>
        <nav className="flex items-center gap-7 list-none p-0 m-0 max-md:hidden">
          <a href="#inicio" className="no-underline text-sm font-semibold text-white/80 hover:text-white">Inicio</a>
          <a href="#programas" className="no-underline text-sm font-semibold text-white/80 hover:text-white">Programas</a>
          <a href="#catalogo" className="no-underline text-sm font-semibold text-white/80 hover:text-white">Catálogo</a>
          <a href="#contacto" className="no-underline text-sm font-semibold text-white/80 hover:text-white">Contacto</a>
        </nav>
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-sm font-semibold text-white/80 hover:text-white no-underline max-md:hidden">
            Iniciar sesión
          </Link>
          <Link
            href="/register"
            className="border border-white/40 rounded-2xl px-[18px] py-3 no-underline font-bold text-sm bg-white/10 hover:bg-white/20 transition-colors"
          >
            Área ciudadana
          </Link>
        </div>
      </header>

      {/* ── Hero (componente rediseñado) ── */}
      <MunicipalityHero
        nombre_municipio={tenant.nombre_municipio}
        nombre_ayuntamiento={tenant.nombre_ayuntamiento}
        hero_image_url={tenant.hero_image_url}
        escudo_url={tenant.escudo_url}
        descripcion={tenant.textos_institucionales.bienvenida ?? null}
        colores_corporativos={tenant.colores_corporativos}
      />

      {/* ── Stats ── */}
      <section aria-label="Resumen del programa" className="w-[min(1120px,calc(100%-40px))] -mt-[62px] mx-auto relative z-10 grid grid-cols-4 overflow-hidden bg-white/95 border border-white/70 rounded-[20px] shadow-[0_24px_70px_rgba(35,30,18,.13)] backdrop-blur-md max-md:grid-cols-2 max-sm:grid-cols-1">
        {[
          {
            value: `${validApps.length}+`,
            label: 'Programas activos',
            icon: (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
                <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19.2 2.2a1 1 0 0 1 1.6 1.5c-1.4 5.5-1.6 7-1.6 12.5a8 8 0 0 1-8 8" />
                <path d="M2 21c0-3 1.85-5.36 5.08-6" />
              </svg>
            ),
          },
          {
            value: 'Abierto',
            label: 'A toda la ciudadanía',
            icon: (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
                <circle cx="9" cy="7" r="4" />
                <path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                <circle cx="17" cy="7" r="3" />
              </svg>
            ),
          },
          {
            value: 'Gratuito',
            label: 'Para los vecinos',
            icon: (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            ),
          },
          {
            value: '365',
            label: 'Días disponible',
            icon: (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <path d="M16 2v4M8 2v4M3 10h18" />
              </svg>
            ),
          },
        ].map((stat, i) => (
          <div key={i} className="group flex items-center gap-4 p-[28px_30px] border-r border-[rgba(35,45,30,.13)] last:border-r-0 max-md:[&:nth-child(2)]:border-r-0 max-md:[&:nth-child(1)]:border-b max-md:[&:nth-child(2)]:border-b max-sm:border-r-0 max-sm:border-b max-sm:last:border-b-0">
            <div className="grid h-[54px] w-[54px] place-items-center rounded-full bg-[#f5efe2] text-[#38633e] shrink-0 transition-colors group-hover:bg-[#38633e] group-hover:text-white">
              <span aria-hidden="true" className="block h-7 w-7">{stat.icon}</span>
            </div>
            <div>
              <strong className="block text-[#38633e] font-bold text-[35px] leading-none">{stat.value}</strong>
              <span className="block text-[#30372e] text-xs font-extrabold tracking-[.06em] uppercase">{stat.label}</span>
            </div>
          </div>
        ))}
      </section>

      {/* ── Programas destacados ── */}
      <main className="py-[70px] px-[clamp(20px,5vw,70px)]">
        <section id="programas">
          <div className="flex justify-between items-end gap-5 mx-auto mb-7 max-w-[1120px] max-sm:block">
            <div>
              <div className="text-[#38633e] text-[13px] font-black tracking-[.18em] uppercase mb-1.5">
                ¿En qué podemos ayudarte?
              </div>
              <h2 className="font-bold text-[clamp(34px,5vw,48px)] leading-tight mb-0">
                Nuestros programas
              </h2>
              <p className="text-[#64705e] max-w-[610px] mt-3.5">
                Iniciativas pensadas para acompañarte en cada etapa de tu vida y promover el bienestar emocional de toda la ciudadanía de {tenant.nombre_municipio}.
              </p>
            </div>
            <a
              href="#catalogo"
              className="inline-flex items-center gap-2.5 min-h-[52px] px-6 rounded-xl no-underline font-extrabold bg-gradient-to-br from-[#e0a13a] to-[#bd7c25] text-white shadow-[0_14px_32px_rgba(189,124,37,.3)] hover:-translate-y-0.5 transition-transform max-sm:mt-4"
            >
              Ver todos →
            </a>
          </div>

          {/* Grid de programas */}
          <div className="max-w-[1120px] mx-auto grid grid-cols-3 gap-6 max-md:grid-cols-1">
            {validApps.slice(0, 6).map((app, i) => (
              <Link
                key={app.id}
                href={`/app/${app.id}`}
                className={`relative block min-h-[205px] p-7 rounded-[18px] no-underline bg-white/80 border border-[rgba(35,45,30,.13)] shadow-[0_16px_45px_rgba(53,45,31,.08)] overflow-hidden hover:-translate-y-1.5 hover:shadow-[0_22px_60px_rgba(53,45,31,.13)] transition-all border-t-4 ${i % 2 === 0 ? 'border-t-[#38633e]' : 'border-t-[#d79a35]'}`}
              >
                <div className={`w-16 h-16 rounded-[18px] grid place-items-center text-[32px] mb-[18px] ${i % 2 === 0 ? 'bg-[#eef5ea]' : 'bg-[#fbf0dc]'}`}>
                  {app.tipo === 'programa' ? '🌿' : app.tipo === 'herramienta' ? '🔧' : app.tipo === 'encuesta' ? '📋' : '📖'}
                </div>
                <h3 className="font-bold text-2xl leading-tight mb-2.5 text-[#20231f]">
                  {app.nombre}
                </h3>
                <p className="text-[#52604e] text-[15px] m-0 line-clamp-3">
                  {app.descripcion || 'Sin descripción'}
                </p>
                <span className="absolute right-[26px] bottom-[22px] text-[#38633e] text-2xl">→</span>
              </Link>
            ))}
          </div>
        </section>

        {/* ── Acceso rápido ── */}
        <section id="catalogo" className="mt-[70px] p-11 rounded-[26px] bg-gradient-to-br from-[#19371f] to-[#38633e] text-white max-w-[1120px] mx-auto max-sm:p-7 max-sm:px-5">
          <div className="text-[#f0b64e] text-[13px] font-black tracking-[.18em] uppercase mb-1.5">Acceso directo</div>
          <h2 className="font-bold text-[clamp(34px,5vw,48px)] leading-tight mb-0">
            Todo lo que necesitas, a un clic.
          </h2>
          <div className="grid grid-cols-4 gap-3.5 mt-6 max-md:grid-cols-2 max-sm:grid-cols-1">
            <Link href="/register" className="p-[22px_16px] rounded-2xl text-center no-underline bg-white/10 border border-white/15 font-extrabold hover:bg-white/20 transition-colors">
              <b className="block text-[27px] mb-2">📋</b>Registro en programa
            </Link>
            <Link href="/login" className="p-[22px_16px] rounded-2xl text-center no-underline bg-white/10 border border-white/15 font-extrabold hover:bg-white/20 transition-colors">
              <b className="block text-[27px] mb-2">🔑</b>Mi área ciudadana
            </Link>
            <Link href="/dashboard" className="p-[22px_16px] rounded-2xl text-center no-underline bg-white/10 border border-white/15 font-extrabold hover:bg-white/20 transition-colors">
              <b className="block text-[27px] mb-2">📊</b>Mi progreso
            </Link>
            <Link href="/perfil" className="p-[22px_16px] rounded-2xl text-center no-underline bg-white/10 border border-white/15 font-extrabold hover:bg-white/20 transition-colors">
              <b className="block text-[27px] mb-2">👤</b>Mi perfil
            </Link>
          </div>
        </section>

        {/* ── Catálogo completo ── */}
        <section className="max-w-[1120px] mx-auto mt-16">
          <div className="mb-8 text-center">
            <div className="text-[#38633e] text-[13px] font-black tracking-[.18em] uppercase mb-1.5">
              Catálogo completo
            </div>
            <h2 className="font-bold text-[clamp(34px,5vw,48px)] leading-tight mb-0">
              Todas las aplicaciones
            </h2>
            <p className="text-[#64705e] mt-3.5">
              {validApps.length} aplicaci{validApps.length === 1 ? 'ón' : 'ones'} disponible{validApps.length === 1 ? '' : 's'} en {tenant.nombre_municipio}
            </p>
          </div>
          <CatalogClient
            apps={validApps}
            categories={categoriesWithCounts}
            primaryColor={primary}
          />
        </section>
      </main>

      {/* ── Footer ── */}
      <footer id="contacto" className="bg-[#152b19] text-white/75 py-[38px] px-[clamp(20px,5vw,70px)]">
        <div className="max-w-[1120px] mx-auto flex justify-between gap-7 flex-wrap">
          <div className="flex items-start gap-4">
            {tenant.escudo_url && (
              <img
                src={tenant.escudo_url}
                alt={`Escudo oficial de ${tenant.nombre_municipio}`}
                className="h-16 w-16 shrink-0 object-contain [filter:drop-shadow(0_2px_6px_rgba(0,0,0,.45))]"
                loading="lazy"
                decoding="async"
              />
            )}
            <div>
              <strong className="text-white font-bold text-2xl">
                {tenant.nombre_municipio} te cuida
              </strong>
              <p className="mt-2">
                Una iniciativa del {tenant.nombre_ayuntamiento} para el bienestar emocional de sus vecinos y vecinas.
              </p>
            </div>
          </div>
          <div>
            <b className="text-white">Enlaces</b>
            <Link href="/login" className="block mt-1.5 text-white/75 no-underline hover:text-white">Iniciar sesión</Link>
            <Link href="/register" className="block mt-1.5 text-white/75 no-underline hover:text-white">Registrarse</Link>
            <Link href="/dashboard" className="block mt-1.5 text-white/75 no-underline hover:text-white">Dashboard</Link>
          </div>
          <div>
            <b className="text-white">{tenant.nombre_ayuntamiento}</b>
            <a href={`mailto:info@${tenant.nombre_municipio.toLowerCase().replace(/\s+/g, '')}.es`} className="block mt-1.5 text-white/75 no-underline hover:text-white">
              Contactar
            </a>
            <a href="#inicio" className="block mt-1.5 text-white/75 no-underline hover:text-white">Inicio</a>
            <a href="#programas" className="block mt-1.5 text-white/75 no-underline hover:text-white">Programas</a>
          </div>
        </div>
        <div className="max-w-[1120px] mx-auto mt-6 pt-6 border-t border-white/10 text-center text-sm text-white/45">
          {tenant.textos_institucionales.pie_pagina || `© ${new Date().getFullYear()} ${tenant.nombre_ayuntamiento} — TE CUIDA`}
        </div>
      </footer>
    </div>
  )
}

// ===========================================================================
// Componente principal
// ===========================================================================

export default async function HomePage() {
  // 1. Leer tenant desde los headers inyectados por el middleware
  const tenantHeaders = getTenantFromHeaders()

  // 2. Obtener configuración completa del municipio (con caché)
  const tenant = tenantHeaders?.slug
    ? await getTenantConfigFromDB(tenantHeaders.slug)
    : null

  // 3. Si no hay tenant, mostrar landing genérica
  if (!tenant) {
    return <RootLanding />
  }

  // 4. Consultar aplicaciones activas del municipio
  let appsData: unknown = null
  let categoriesData: unknown = null

  if (process.env.DEMO_MODE === 'true') {
    appsData = DEMO_APPS
    categoriesData = DEMO_CATEGORIES
  } else {
    const supabase = createAdminClient()

    const { data: apps } = await supabase
      .from('municipality_applications')
      .select(
        `application_id,
        application:applications!inner (
          id,
          category_id,
          nombre,
          descripcion,
          thumbnail_url,
          tipo,
          nivel_suscripcion,
          activa
        )`,
      )
      .eq('municipality_id', tenant.id)
      .eq('activa', true)

    appsData = apps

    const { data: cats } = await supabase
      .from('categories')
      .select('id, nombre')
      .order('orden', { ascending: true })

    categoriesData = cats
  }

  // 5. Procesar datos
  const apps: AppRow[] = (appsData || []) as unknown as AppRow[]
  const categories: CategoryRow[] = (categoriesData || []) as CategoryRow[]

  const goodApps = apps.filter(
    (a) => a.application !== null && a.application.activa,
  )

  const categoryCounts = new Map<string, number>()
  goodApps.forEach((a) => {
    if (a.application?.category_id) {
      categoryCounts.set(
        a.application.category_id,
        (categoryCounts.get(a.application.category_id) || 0) + 1,
      )
    }
  })

  const categoriesWithCounts = categories.map((cat) => ({
    id: cat.id,
    nombre: cat.nombre,
    count: categoryCounts.get(cat.id) || 0,
  }))

  // 6. Renderizar
  return (
    <TenantPage
      tenant={{
        id: tenant.id,
        nombre_municipio: tenant.nombre_municipio,
        nombre_ayuntamiento: tenant.nombre_ayuntamiento,
        escudo_url: tenant.escudo_url,
        logo_url: tenant.logo_url,
        hero_image_url: tenant.hero_image_url,
        colores_corporativos: tenant.colores_corporativos as unknown as Record<string, string>,
        textos_institucionales: tenant.textos_institucionales as unknown as Record<string, string>,
      }}
      validApps={goodApps
        .filter((a) => a.application !== null)
        .map((a) => ({
          id: a.application!.id,
          categoria_id: a.application!.category_id,
          nombre: a.application!.nombre,
          descripcion: a.application!.descripcion,
          thumbnail_url: a.application!.thumbnail_url || '',
          tipo: a.application!.tipo as 'programa' | 'herramienta' | 'encuesta' | 'recurso',
          nivel: a.application!.nivel_suscripcion as 'basico' | 'estandar' | 'premium',
          activa: a.application!.activa,
        }))}
      categoriesWithCounts={categoriesWithCounts}
    />
  )
}
