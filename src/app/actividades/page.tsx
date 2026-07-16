/**
 * Página pública — Listado de actividades marketplace (Fase 1).
 *
 * Server Component que:
 *   1. Resuelve el tenant desde los headers x-tenant-*
 *   2. Carga categorías (para los filtros) y actividades publicadas del municipio
 *   3. Aplica filtros vía query params validados con ActivityListQuerySchema
 *   4. Renderiza header institucional + grid de ActivityCard con paginación
 *
 * Es la página a la que apunta el botón "Volver" del detail.
 * La landing tiene un anchor #actividades hacia el bloque "Actividades del municipio".
 */

import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/server'
import { getTenantConfigFromDB, getTenantFromHeaders } from '@/lib/tenant/headers'
import { ActivityListQuerySchema, ACTIVITY_MODALIDAD } from '@/lib/validations/activity'
import ActivityCard from '@/components/landing/activity-card'
import ActivityFilter from './activity-filter'

// ─────────────────────────────────────────────────────────────────────────
// Tipos
// ─────────────────────────────────────────────────────────────────────────

interface Props {
  searchParams: {
    categoria_id?: string
    modalidad?: string
    q?: string
    page?: string
  }
}

interface CategoryLite {
  id: string
  nombre: string
}

// ─────────────────────────────────────────────────────────────────────────
// Render
// ─────────────────────────────────────────────────────────────────────────

const PAGE_SIZE = 24

export default async function PublicActivitiesPage({ searchParams }: Props) {
  const tenant = getTenantFromHeaders()
  if (!tenant?.slug) notFound()

  const tenantConfig = await getTenantConfigFromDB(tenant.slug)
  if (!tenantConfig) notFound()

  // 1. Validar query params con Zod (rechaza UUIDs inválidos, modalidades
  //    desconocidas, q demasiado largas, etc.).
  const filterParse = ActivityListQuerySchema.safeParse({
    categoria_id: searchParams.categoria_id,
    modalidad: searchParams.modalidad,
    q: searchParams.q,
  })
  const filter = filterParse.success
    ? filterParse.data
    : {
        categoria_id: undefined,
        modalidad: undefined,
        q: undefined,
        destacada: undefined,
        limit: PAGE_SIZE,
        offset: 0,
      }

  const page = Math.max(parseInt(searchParams.page ?? '1', 10) || 1, 1)
  const offset = (page - 1) * PAGE_SIZE

  // 2. Cargar categorías (para los filtros, no filtradas).
  const supabase = createAdminClient()
  const { data: catsData } = await supabase
    .from('categories')
    .select('id, nombre')
    .order('orden', { ascending: true })
  const cats: CategoryLite[] = (catsData || []) as CategoryLite[]

  // 3. Cargar actividades del tenant con filtros aplicados.
  //    Seguridad: scopeado por municipality_id — el header del middleware ya
  //    garantiza que estamos en el tenant correcto.
  //    Nota: usamos `!activities_category_id_fkey` para que Supabase devuelva
  //    el join como objeto singular en vez de array (la heurística por defecto
  //    trata cualquier join many-to-one como array).
  let query = supabase
    .from('activities')
    .select(
      `id, nombre, descripcion, thumbnail_url, modalidad, fecha_inicio, fecha_fin,
       plazas_inscritas, aforo, precio_texto, destacada,
       categoria:categories!activities_category_id_fkey(id, nombre)`,
    )
    .eq('municipality_id', tenantConfig.id)
    .eq('estado', 'publicada')
    .order('fecha_inicio', { ascending: true })
    .range(offset, offset + PAGE_SIZE - 1)

  if (filter.categoria_id) {
    query = query.eq('category_id', filter.categoria_id)
  }
  if (filter.modalidad) {
    query = query.eq('modalidad', filter.modalidad)
  }
  if (filter.q) {
    // LIKE insensible a mayúsculas por defecto en Postgres
    query = query.ilike('nombre', `%${filter.q}%`)
  }

  const { data: activitiesData } = await query
  // Con el hint `!fk`, Supabase devuelve categoria como objeto singular o null.
  // Cast minimal para alinear el join opcional con el tipo del componente.
  const activities = (activitiesData || []) as unknown as Array<{
    id: string
    nombre: string
    descripcion: string | null
    thumbnail_url: string | null
    modalidad: (typeof ACTIVITY_MODALIDAD)[number]
    fecha_inicio: string
    fecha_fin: string | null
    plazas_inscritas: number
    aforo: number | null
    precio_texto: string | null
    destacada: boolean
    categoria: { id: string; nombre: string } | null
  }>

  // Pintamos primaria del municipio si existe
  const primary =
    typeof tenantConfig.colores_corporativos?.primary === 'string'
      ? tenantConfig.colores_corporativos.primary
      : '#142c19'

  const inicialMunicipio = tenantConfig.nombre_municipio.charAt(0).toUpperCase()

  // Construir href del header según tenant config para volver al landing
  const enviarA = '/'

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#f7f1e7' }}>
      {/* ── Header sticky ── */}
      <header
        className="sticky top-0 z-50 flex items-center justify-between px-[clamp(20px,5vw,70px)] py-[18px] text-white shadow-lg"
        style={{ background: 'linear-gradient(90deg, #142c19 0%, #264d2c 100%)' }}
      >
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
            <span
              className="w-10 h-10 rounded-xl grid place-items-center text-white font-bold text-xl"
              style={{ background: 'linear-gradient(135deg,#e4aa45,#b87924)' }}
            >
              {inicialMunicipio}
            </span>
          )}
          <span>
            <strong className="block text-base leading-tight">
              {tenantConfig.nombre_ayuntamiento}
            </strong>
            <span className="block text-xs opacity-80 tracking-wider">
              {tenantConfig.nombre_municipio} te cuida
            </span>
          </span>
        </Link>
        <Link
          href={enviarA}
          className="border border-white/40 rounded-2xl px-4 py-2 text-sm font-bold bg-white/10 hover:bg-white/20 transition-colors no-underline text-white"
        >
          ← Volver al inicio
        </Link>
      </header>

      {/* ── Hero ── */}
      <section
        className="relative min-h-[260px] text-white flex items-end overflow-hidden"
        style={{
          backgroundImage: `linear-gradient(180deg, rgba(15,29,20,.4), rgba(15,29,20,.95)), url('https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=1920&q=80')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="relative z-10 mx-auto max-w-[1180px] w-full px-[clamp(22px,5vw,70px)] py-10 sm:py-16">
          <span className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-extrabold uppercase tracking-[.22em] backdrop-blur-md border border-white/30 bg-white/10 text-white">
            <span aria-hidden="true">🎭</span>
            Actividades del municipio
          </span>
          <h1 className="font-bold text-[clamp(34px,6vw,56px)] leading-[1.05] mt-3 mb-2 max-w-[820px] text-balance">
            Talleres, eventos y cursos en {tenantConfig.nombre_municipio}
          </h1>
          <p className="text-lg text-white/95 max-w-[680px]">
            Impulsado por profesionales y entidades del municipio. Apúntate, conoce
            a quien lo organiza y descubre el cambio concreto que genera cada actividad.
          </p>
        </div>
      </section>

      {/* ── Cuerpo ── */}
      <main className="mx-auto max-w-[1180px] w-full px-[clamp(20px,5vw,70px)] py-[48px]">
        {/*
          Layout 2 columnas: filtros sticky (md:col-span-3) — grid (md:col-span-9).
          En móvil el filtro va arriba, los resultados debajo.
        */}
        <div className="grid md:grid-cols-12 gap-8">
          {/* ── Filtros ── */}
          <aside className="md:col-span-3">
            <div className="md:sticky md:top-28">
              <div className="rounded-2xl bg-white border border-[rgba(35,45,30,.1)] shadow-[0_8px_24px_rgba(35,30,18,.05)] p-5">
                <ActivityFilter
                  categories={cats}
                  currentCategoria={filter.categoria_id}
                  currentModalidad={filter.modalidad}
                  currentQ={filter.q}
                  primaryColor={primary}
                />
                {/* Botón limpiar filtros */}
                {(filter.categoria_id || filter.modalidad || filter.q) && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <Link
                      href="/actividades"
                      className="inline-flex items-center gap-1 text-xs font-semibold text-[#38633e] hover:text-[#2c4f31] transition-colors"
                    >
                      ✕ Limpiar filtros
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </aside>

          {/* ── Grid ── */}
          <section className="md:col-span-9">
            <div className="flex flex-wrap items-baseline gap-3 mb-6">
              <h2 className="font-bold text-2xl text-gray-900">
                {activities.length === 0
                  ? 'Sin resultados'
                  : `${activities.length} ${activities.length === 1 ? 'actividad' : 'actividades'}`}
              </h2>
              {(filter.categoria_id || filter.modalidad || filter.q) && (
                <p className="text-sm text-gray-500">
                  con los filtros aplicados
                </p>
              )}
            </div>

            {activities.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
                <span aria-hidden="true" className="text-5xl block mb-4">🔍</span>
                <h3 className="text-base font-semibold text-gray-900">
                  No hay actividades con esos filtros
                </h3>
                <p className="mt-1 text-sm text-gray-500 max-w-md mx-auto">
                  Prueba a cambiar la categoría, modalidad o quitar la búsqueda libre.
                  Mientras tanto, vuelve al{' '}
                  <Link href="/" className="text-[#38633e] font-medium underline hover:no-underline">
                    inicio del municipio
                  </Link>
                  .
                </p>
                <Link
                  href="/actividades"
                  className="mt-6 inline-flex items-center gap-2 rounded-lg bg-[#38633e] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#2c4f31] transition-colors"
                >
                  Ver todas las actividades
                </Link>
              </div>
            ) : (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {activities.map((a) => (
                  <ActivityCard
                    key={a.id}
                    id={a.id}
                    nombre={a.nombre}
                    descripcion={a.descripcion}
                    thumbnail_url={a.thumbnail_url}
                    modalidad={a.modalidad}
                    fecha_inicio={a.fecha_inicio}
                    fecha_fin={a.fecha_fin}
                    plazas_inscritas={a.plazas_inscritas}
                    aforo={a.aforo}
                    precio_texto={a.precio_texto}
                    categoria_nombre={a.categoria?.nombre ?? null}
                    destacada={a.destacada}
                  />
                ))}
              </div>
            )}

            {/* Paginación simple: si la página está llena, mostramos "siguiente".
                Si hay menos, mostramos "anterior" cuando page > 1. */}
            {(activities.length === PAGE_SIZE || page > 1) && (
              <nav className="mt-10 flex justify-center gap-2" aria-label="Paginación">
                {page > 1 && (
                  <Link
                    href={buildPageHref(page - 1, searchParams)}
                    className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    ← Anterior
                  </Link>
                )}
                <span className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 text-sm font-medium text-gray-700">
                  Página {page}
                </span>
                {activities.length === PAGE_SIZE && (
                  <Link
                    href={buildPageHref(page + 1, searchParams)}
                    className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Siguiente →
                  </Link>
                )}
              </nav>
            )}
          </section>
        </div>
      </main>

      {/* ── Footer ── */}
      <footer className="mt-auto bg-[#152b19] text-white/75 py-[38px] px-[clamp(20px,5vw,70px)]">
        <div className="max-w-[1180px] mx-auto text-center text-sm">
          <p>
            © {new Date().getFullYear()} {tenantConfig.nombre_ayuntamiento} — TE CUIDA
          </p>
        </div>
      </footer>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────

function buildPageHref(
  page: number,
  searchParams: Props['searchParams'],
): string {
  const params = new URLSearchParams()
  if (searchParams.categoria_id) params.set('categoria_id', searchParams.categoria_id)
  if (searchParams.modalidad) params.set('modalidad', searchParams.modalidad)
  if (searchParams.q) params.set('q', searchParams.q)
  if (page > 1) params.set('page', String(page))
  const qs = params.toString()
  return qs.length > 0 ? `/actividades?${qs}` : '/actividades'
}
