/**
 * Página principal del ciudadano — Catálogo de aplicaciones
 *
 * Server Component que:
 *   1. Lee los headers x-tenant-* inyectados por el middleware
 *   2. Obtiene la configuración completa del municipio desde DB
 *   3. Consulta las aplicaciones activas con sus categorías
 *   4. Renderiza el header institucional + catálogo interactivo
 *
 * Requisitos: 2.1, 6.2, 7.1
 */

import Link from 'next/link'
import Image from 'next/image'
import { getTenantConfigFromDB, getTenantFromHeaders } from '@/lib/tenant/headers'
import { createAdminClient } from '@/lib/supabase/server'
import { DEMO_APPS, DEMO_CATEGORIES } from '@/lib/demo-data'
import CatalogClient from './catalog-client'

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

// ---------------------------------------------------------------------------
// Página
// ---------------------------------------------------------------------------

export default async function HomePage() {
  // 1. Leer tenant desde los headers inyectados por el middleware
  const tenantHeaders = getTenantFromHeaders()

  // 2. Obtener configuración completa del municipio (con caché)
  const tenant = tenantHeaders?.slug
    ? await getTenantConfigFromDB(tenantHeaders.slug)
    : null

  // 3. Si no hay tenant (dominio raíz sin subdominio), mostrar landing
  if (!tenant) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50">
        <div className="text-center px-6 max-w-lg">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
            TE CUIDA
          </h1>
          <p className="mt-4 text-lg text-gray-600">
            Plataforma de bienestar emocional y salud comunitaria para municipios.
          </p>
          <p className="mt-2 text-sm text-gray-500">
            Para acceder al portal de tu municipio, visita{' '}
            <code className="bg-gray-100 px-1.5 py-0.5 rounded text-indigo-600 font-mono">
              tumunicipio.tecuida.es
            </code>
          </p>
          <div className="mt-8">
            <Link
              href="/login"
              className="inline-flex items-center rounded-lg bg-indigo-600 px-6 py-3 text-base font-semibold text-white shadow-sm hover:bg-indigo-500 transition-colors"
            >
              Iniciar sesión
            </Link>
          </div>
        </div>
      </div>
    )
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
        `
      application_id,
      application:applications!inner (
        id,
        category_id,
        nombre,
        descripcion,
        thumbnail_url,
        tipo,
        nivel_suscripcion,
        activa
      )
    `,
      )
      .eq('municipality_id', tenant.id)
      .eq('activa', true)

    appsData = apps

    // 5. Consultar categorías para los filtros
    const { data: cats } = await supabase
      .from('categories')
      .select('id, nombre')
      .order('orden', { ascending: true })

    categoriesData = cats
  }

  // 6. Procesar datos
  const apps: AppRow[] = (appsData || []) as unknown as AppRow[]
  const categories: CategoryRow[] = (categoriesData || []) as CategoryRow[]

  // Filtrar apps activas (aunque !inner ya garantiza existencia)
  const validApps = apps.filter(
    (a) => a.application !== null && a.application.activa,
  )

  // Construir mapa de categorías con conteos
  const categoryCounts = new Map<string, number>()
  validApps.forEach((a) => {
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

  // 7. Renderizar
  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Header institucional ── */}
      <header
        className="relative overflow-hidden"
        style={{
          backgroundColor: tenant.colores_corporativos.primary,
          color: tenant.colores_corporativos.text,
        }}
      >
        {/* Gradiente decorativo sobre el header */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />

        <div className="relative mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-16">
          <div className="flex flex-col items-center text-center sm:flex-row sm:text-left sm:gap-6">
            {/* Escudo */}
            {tenant.escudo_url && (
              <Image
                src={tenant.escudo_url}
                alt={`Escudo de ${tenant.nombre_municipio}`}
                width={96}
                height={96}
                className="h-20 w-auto sm:h-24 drop-shadow-md"
              />
            )}
            <div className="mt-4 sm:mt-0">
              <p className="text-sm font-medium tracking-wide uppercase opacity-80">
                {tenant.nombre_ayuntamiento}
              </p>
              <h1 className="mt-1 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                TE CUIDA
              </h1>
              <p className="mt-3 max-w-lg text-base text-white/90">
                {tenant.textos_institucionales.bienvenida}
              </p>
            </div>
          </div>
        </div>

        {/* Onda decorativa inferior */}
        <div className="relative h-8">
          <svg
            className="absolute bottom-0 w-full h-8 text-gray-50"
            viewBox="0 0 1440 32"
            fill="currentColor"
            preserveAspectRatio="none"
          >
            <path d="M0,16 C240,32 480,0 720,16 C960,32 1200,0 1440,16 L1440,32 L0,32 Z" />
          </svg>
        </div>
      </header>

      {/* ── Barra de usuario ── */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 -mt-2 relative z-10">
        <div className="flex items-center justify-between rounded-lg bg-white px-4 py-3 shadow-sm border border-gray-200">
          <div className="flex items-center gap-3">
            {tenant.logo_url && (
              <Image
                src={tenant.logo_url}
                alt={tenant.nombre_municipio}
                width={32}
                height={32}
                className="h-8 w-auto"
              />
            )}
            <span className="text-sm font-medium text-gray-700">
              {tenant.nombre_municipio}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm font-medium text-indigo-600 hover:text-indigo-500 transition-colors"
            >
              Iniciar sesión
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 transition-colors"
            >
              Registrarse
            </Link>
          </div>
        </div>
      </div>

      {/* ── Catálogo de aplicaciones ── */}
      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900">
            Catálogo de programas
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            {validApps.length} aplicaci{validApps.length === 1 ? 'ón' : 'ones'}{' '}
            disponible{validApps.length === 1 ? '' : 's'} en{' '}
            {tenant.nombre_municipio}
          </p>
        </div>

        {/* Pasar datos al Client Component que maneja el filtrado */}
        <CatalogClient
          apps={validApps
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
          categories={categoriesWithCounts}
          primaryColor={tenant.colores_corporativos.primary}
        />
      </main>

      {/* ── Footer institucional ── */}
      <footer className="border-t border-gray-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-gray-500">
            {tenant.textos_institucionales.pie_pagina}
          </p>
        </div>
      </footer>
    </div>
  )
}
