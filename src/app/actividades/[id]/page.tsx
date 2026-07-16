/**
 * Página pública — Detalle de actividad marketplace (Fase 1).
 *
 * Server Component que:
 *   1. Resuelve el tenant
 *   2. Carga la actividad (estado="publicada")
 *   3. Carga el profesional asociado
 *   4. Carga la inscripción (si el usuario está autenticado)
 *   5. Renderiza ficha completa + inscripción
 *
 * Sin dinero en la plataforma. La nota de pago del profesional se muestra
 * explícitamente, pero el pago se hace externamente.
 */

import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { getTenantConfigFromDB, getTenantFromHeaders } from '@/lib/tenant/headers'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import ActivityDetailClient from './activity-detail-client'
import type { ActivityWithRelations } from '@/types'

interface Props {
  params: { id: string }
}

export default async function PublicActivityPage({ params }: Props) {
  const tenant = getTenantFromHeaders()
  if (!tenant?.slug) notFound()

  const tenantConfig = await getTenantConfigFromDB(tenant.slug)
  if (!tenantConfig) notFound()

  const supabase = createAdminClient()

  const { data: municipality } = await supabase
    .from('municipalities')
    .select('id')
    .eq('slug', tenantConfig.slug)
    .maybeSingle()
  if (!municipality) notFound()

  const { data: activity } = await supabase
    .from('activities')
    .select(
      `*,
       professional:professionals!inner(*),
       categoria:categories(id, nombre, icono_url)`,
    )
    .eq('id', params.id)
    .eq('municipality_id', (municipality as { id: string }).id)
    .eq('estado', 'publicada')
    .maybeSingle()

  if (!activity) notFound()

  const act = activity as unknown as ActivityWithRelations

  // ¿Usuario autenticado y de este tenant?
  let userAuth = null as null | { id: string; email: string }
  let inscription_estado: string | null = null
  try {
    const srv = createClient()
    const { data: authData } = await srv.auth.getUser()
    const u = authData?.user
    if (u) {
      // Comprobar que pertenece a este municipio (RGPD: cada municipio solo ve lo suyo)
      const { data: userRow } = await srv
        .from('users')
        .select('id, email, municipality_id')
        .eq('id', u.id)
        .maybeSingle()
      const ur = userRow as { id: string; email: string; municipality_id: string } | null
      if (ur && ur.municipality_id === (municipality as { id: string }).id) {
        userAuth = { id: ur.id, email: ur.email }
        // Inscripción actual
        const { data: ins } = await supabase
          .from('activity_inscriptions')
          .select('estado')
          .eq('activity_id', params.id)
          .eq('user_id', u.id)
          .maybeSingle()
        inscription_estado = (ins as { estado: string } | null)?.estado ?? null
      }
    }
  } catch {
    // Usuario no autenticado → no pasa nada
  }

  const primary =
    typeof tenantConfig.colores_corporativos?.primary === 'string'
      ? tenantConfig.colores_corporativos.primary
      : '#142c19'

  const inicialActividad = act.nombre.charAt(0).toUpperCase()
  const modalidadLabel: Record<string, string> = {
    presencial: 'Presencial',
    online: 'Online',
    mixta: 'Mixta (presencial + online)',
  }
  const modalidadIcon: Record<string, string> = {
    presencial: '📍',
    online: '💻',
    mixta: '🔀',
  }

  const tBytes = tenantConfig.textos_institucionales ?? {}
  const piePagina =
   (typeof tBytes.pie_pagina === 'string' && tBytes.pie_pagina.length > 0)
      ? tBytes.pie_pagina
      : null
  // Volver al listado público de actividades del municipio.
  // (El anchor #actividades del landing ya existe en src/app/page.tsx para
  //  la navegación desde la navbar del ayuntamiento.)
  const enviarA = '/actividades'

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#f7f1e7' }}>
      <header className="sticky top-0 z-50 flex items-center justify-between px-[clamp(20px,5vw,70px)] py-[18px] text-white shadow-lg" style={{ background: 'linear-gradient(90deg, #142c19 0%, #264d2c 100%)' }}>
        <Link href="/" className="flex items-center gap-3.5 text-white no-underline">
          {tenantConfig.escudo_url ? (
            <Image
              src={tenantConfig.escudo_url}
              alt={`Escudo ${tenantConfig.nombre_municipio}`}
              width={40}
              height={40}
              className="h-10 w-10 object-contain"
            />
          ) : (
            <span className="w-10 h-10 rounded-xl grid place-items-center text-white font-bold text-xl" style={{ background: 'linear-gradient(135deg,#e4aa45,#b87924)' }}>
              {tenantConfig.nombre_municipio.charAt(0).toUpperCase()}
            </span>
          )}
          <span>
            <strong className="block text-base leading-tight">{tenantConfig.nombre_ayuntamiento}</strong>
            <span className="block text-xs opacity-80 tracking-wider">{tenantConfig.nombre_municipio} te cuida</span>
          </span>
        </Link>
        <Link
          href={enviarA + '#actividades'}
          className="border border-white/40 rounded-2xl px-4 py-2 text-sm font-bold bg-white/10 hover:bg-white/20 transition-colors no-underline text-white"
        >
          ← Volver
        </Link>
      </header>

      {/* Hero */}
      <section
        className="relative min-h-[300px] text-white flex items-end overflow-hidden"
        style={{
          backgroundImage: act.thumbnail_url
            ? `linear-gradient(180deg, rgba(15,29,20,.55), rgba(15,29,20,.96)), url('${act.thumbnail_url}')`
            : `linear-gradient(135deg, ${primary} 0%, #050d08 100%)`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="relative z-10 mx-auto max-w-[1180px] w-full px-[clamp(22px,5vw,70px)] py-12 sm:py-20">
          <div className="flex items-center gap-3 mb-4">
            <span className="grid h-14 w-14 place-items-center rounded-full border-2 border-[#e4aa45] bg-[rgba(15,29,20,.42)] text-2xl font-extrabold text-[#f4d884]" aria-hidden="true">
              {inicialActividad}
            </span>
            <span className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-extrabold uppercase tracking-[.22em] backdrop-blur-md border border-white/30 bg-white/10 text-white">
              <span aria-hidden="true">🎭</span> Actividad del municipio
            </span>
          </div>
          <h1 className="font-bold text-[clamp(40px,7vw,72px)] leading-[1.05] mb-4 max-w-[860px] text-balance">
            {act.nombre}
          </h1>
          <p className="text-lg text-white/95 max-w-[700px] mb-2">
            {act.descripcion}
          </p>
          <div className="flex flex-wrap items-center gap-2 text-sm text-white/85">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-3 py-1.5">
              {modalidadIcon[act.modalidad]} {modalidadLabel[act.modalidad]}
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-3 py-1.5">
              📅 {formatDateShort(act.fecha_inicio)}{act.fecha_fin ? ` → ${formatDateShort(act.fecha_fin)}` : ''}
            </span>
            {act.aforo !== null && (
              <span className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-3 py-1.5">
                🎟️ {act.plazas_inscritas} / {act.aforo} plazas ocupadas
              </span>
            )}
          </div>
        </div>
      </section>

      {/* Cuerpo */}
      <main className="max-w-[1180px] mx-auto px-[clamp(20px,5vw,70px)] py-[64px] grid lg:grid-cols-3 gap-10">
        <section className="lg:col-span-2 space-y-8">
          {/* Cuándo y dónde */}
          <article className="rounded-2xl bg-white border border-[rgba(35,45,30,.1)] shadow-[0_10px_40px_rgba(35,30,18,.07)] p-7">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Cuándo y dónde</h2>
            <dl className="grid sm:grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-xs font-bold uppercase tracking-wider text-gray-500">Fecha</dt>
                <dd className="text-gray-900 mt-0.5">
                  {formatDateLong(act.fecha_inicio)}{act.fecha_fin ? ` → ${formatDateLong(act.fecha_fin)}` : ''}
                </dd>
              </div>
              {act.horario_texto && (
                <div>
                  <dt className="text-xs font-bold uppercase tracking-wider text-gray-500">Horario</dt>
                  <dd className="text-gray-900 mt-0.5">{act.horario_texto}</dd>
                </div>
              )}
              {(act.modalidad === 'presencial' || act.modalidad === 'mixta') && act.direccion_texto && (
                <div className="sm:col-span-2">
                  <dt className="text-xs font-bold uppercase tracking-wider text-gray-500">Dirección</dt>
                  <dd className="text-gray-900 mt-0.5">{act.direccion_texto}</dd>
                </div>
              )}
              {(act.modalidad === 'online' || act.modalidad === 'mixta') && act.url_reunion && (
                <div className="sm:col-span-2">
                  <dt className="text-xs font-bold uppercase tracking-wider text-gray-500">URL de la reunión online</dt>
                  <dd className="text-gray-900 mt-0.5 font-mono text-xs">{act.url_reunion}</dd>
                </div>
              )}
              {act.categoria?.nombre && (
                <div>
                  <dt className="text-xs font-bold uppercase tracking-wider text-gray-500">Categoría</dt>
                  <dd className="text-gray-900 mt-0.5">{act.categoria.nombre}</dd>
                </div>
              )}
            </dl>
          </article>

          {/* Ficha de impacto */}
          {(act.impacto_objetivo || act.impacto_indicadores) && (
            <article className="rounded-2xl bg-gradient-to-br from-[#f5efe2] to-white border border-[rgba(228,170,69,.3)] shadow-[0_10px_40px_rgba(228,170,69,.15)] p-7">
              <h2 className="text-xl font-bold text-gray-900 mb-4 inline-flex items-center gap-2">
                <span aria-hidden="true">🌱</span> Ficha de impacto
              </h2>
              <p className="text-sm text-gray-600 mb-4">
                Más allá del dinero: el cambio concreto que genera tu participación.
              </p>
              <dl className="grid sm:grid-cols-2 gap-5 text-sm">
                {act.impacto_objetivo && (
                  <div className="sm:col-span-2">
                    <dt className="text-xs font-extrabold uppercase tracking-wider text-[#7c3aed]">🎯 Objetivo social</dt>
                    <dd className="text-gray-900 mt-1">{act.impacto_objetivo}</dd>
                  </div>
                )}
                {act.impacto_ambito && (
                  <div>
                    <dt className="text-xs font-extrabold uppercase tracking-wider text-[#7c3aed]">📍 Ámbito</dt>
                    <dd className="text-gray-900 mt-1">{act.impacto_ambito}</dd>
                  </div>
                )}
                {act.impacto_beneficiarios_estimados !== null && act.impacto_beneficiarios_estimados !== undefined && (
                  <div>
                    <dt className="text-xs font-extrabold uppercase tracking-wider text-[#7c3aed]">👥 Beneficiarios estimados</dt>
                    <dd className="text-gray-900 mt-1">{act.impacto_beneficiarios_estimados.toLocaleString('es-ES')}</dd>
                  </div>
                )}
                {act.impacto_indicadores && (
                  <div className="sm:col-span-2">
                    <dt className="text-xs font-extrabold uppercase tracking-wider text-[#7c3aed]">📊 Indicadores de éxito</dt>
                    <dd className="text-gray-900 mt-1">{act.impacto_indicadores}</dd>
                  </div>
                )}
              </dl>
            </article>
          )}
        </section>

        {/* Sidebar: profesional + inscripción */}
        <aside className="lg:col-span-1 space-y-5">
          <article className="rounded-2xl bg-white border border-[rgba(35,45,30,.12)] shadow-[0_8px_30px_rgba(35,30,18,.06)] p-6">
            <p className="text-xs font-bold uppercase tracking-wider text-[#38633e]">Organiza</p>
            <h3 className="mt-1 font-bold text-lg text-gray-900">{act.professional.nombre}</h3>
            <p className="text-sm text-gray-600 capitalize">{act.professional.tipo.replace('_', ' ')}</p>
            {act.professional.verificado && (
              <p className="mt-2 inline-flex items-center gap-1 text-xs text-emerald-700 font-medium">
                ✓ Verificado por el municipio
              </p>
            )}
            {act.professional.descripcion && (
              <p className="mt-3 text-sm text-gray-700">{act.professional.descripcion}</p>
            )}
            <hr className="my-4 border-gray-200" />
            <dl className="text-sm space-y-1">
              <div className="flex justify-between gap-2">
                <dt className="text-gray-500">Email</dt>
                <dd className="text-gray-900 truncate">{act.professional.email}</dd>
              </div>
              {act.professional.telefono && (
                <div className="flex justify-between gap-2">
                  <dt className="text-gray-500">Teléfono</dt>
                  <dd className="text-gray-900">{act.professional.telefono}</dd>
                </div>
              )}
              {act.professional.web_url && (
                <div className="flex justify-between gap-2">
                  <dt className="text-gray-500">Web</dt>
                  <dd>
                    <a
                      href={act.professional.web_url.startsWith('http') ? act.professional.web_url : `https://${act.professional.web_url}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-600 hover:text-indigo-500 transition-colors"
                    >
                      Visitar
                    </a>
                  </dd>
                </div>
              )}
            </dl>
          </article>

          {/* Inscripción */}
          <ActivityDetailClient
            activity={{
              id: act.id,
              nombre: act.nombre,
              fecha_inicio: act.fecha_inicio,
              plazas_inscritas: act.plazas_inscritas,
              aforo: act.aforo ?? null,
              precio_texto: act.precio_texto ?? null,
              nota_pago: act.nota_pago ?? null,
            }}
            user={userAuth}
            inscription_estado={inscription_estado}
          />
        </aside>
      </main>

      <footer className="mt-auto bg-[#152b19] text-white/75 py-[38px] px-[clamp(20px,5vw,70px)]">
        <div className="max-w-[1180px] mx-auto text-center text-sm">
          <p>
            {piePagina ??
              `© ${new Date().getFullYear()} ${tenantConfig.nombre_ayuntamiento} — TE CUIDA`
            }
          </p>
        </div>
      </footer>
    </div>
  )
}

// ─── Helpers ─────────────────────────────────────────────────────────────

function formatDateShort(s: string): string {
  try {
    const d = new Date(s + 'T00:00:00')
    const dd = String(d.getDate()).padStart(2, '0')
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    return `${dd}/${mm}/${d.getFullYear()}`
  } catch {
    return s
  }
}

function formatDateLong(s: string): string {
  try {
    const d = new Date(s + 'T00:00:00')
    return d.toLocaleDateString('es-ES', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  } catch {
    return s
  }
}
