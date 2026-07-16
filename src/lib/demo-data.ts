/**
 * Demo data — Tenants sintéticos para desarrollo y tests.
 *
 * Si `process.env.DEMO_MODE === 'true'`, getDemoTenant(slug) devuelve
 * una configuración prefabricada sin consultar Supabase. Útil para
 * preview sin backend en local.
 *
 * Requisito: 7.1 — preview sin instituciones reales.
 *
 * ── Histórico ──────────────────────────────────────────────────
 * - 2026-07-13: añadida `layout_variant: 'classic'` (migración 045)
 *   al objeto devuelto por getDemoTenant; se mantienen los exports
 *   históricos DEMO_APPS y DEMO_CATEGORIES que page.tsx sigue
 *   importando directamente (`appsData = DEMO_APPS` cuando DEMO_MODE).
 * ──────────────────────────────────────────────────────────────
 */

import type { MunicipalityConfig } from '@/types'

// ─────────────────────────────────────────────────────────────────
// Tipos internos del modo demo (no expuestos en @/types)
// ─────────────────────────────────────────────────────────────────

export interface DemoCategoryRow {
  id: string
  nombre: string
  descripcion: string | null
  icono_url: string | null
  orden: number
}

export interface DemoAppRow {
  application_id: string
  application: {
    id: string
    category_id: string
    nombre: string
    descripcion: string
    thumbnail_url: string | null
    tipo: 'programa' | 'herramienta' | 'encuesta' | 'recurso'
    activa: boolean
    created_at: string | null
    app_slug: string | null
    url_acceso: string | null
  } | null
}

// ─────────────────────────────────────────────────────────────────
// Datos de demo (catálogo + categorías)
// ─────────────────────────────────────────────────────────────────

export const DEMO_CATEGORIES: DemoCategoryRow[] = [
  {
    id: 'demo-cat-bienestar',
    nombre: 'Bienestar Mental',
    descripcion: 'Programas de mindfulness, gestión emocional y resiliencia.',
    icono_url: null,
    orden: 1,
  },
  {
    id: 'demo-cat-salud',
    nombre: 'Salud Física',
    descripcion: 'Hábitos saludables, actividad física y alimentación.',
    icono_url: null,
    orden: 2,
  },
  {
    id: 'demo-cat-familia',
    nombre: 'Apoyo Familiar',
    descripcion: 'Recursos para cuidadores, infancia y parentalidad positiva.',
    icono_url: null,
    orden: 3,
  },
  {
    id: 'demo-cat-desarrollo',
    nombre: 'Desarrollo Personal',
    descripcion: 'Habilidades, formación y orientación al empleo.',
    icono_url: null,
    orden: 4,
  },
]

export const DEMO_APPS: DemoAppRow[] = [
  {
    application_id: 'demo-app-mindful30',
    application: {
      id: 'demo-app-mindful30',
      category_id: 'demo-cat-bienestar',
      nombre: 'Mindful30',
      descripcion: '30 días de mindfulness guiado para reducir el estrés y mejorar el bienestar.',
      thumbnail_url: null,
      tipo: 'programa',
      activa: true,
      created_at: '2026-01-15T00:00:00Z',
      app_slug: 'mindful30',
      url_acceso: null,
    },
  },
  {
    application_id: 'demo-app-respira',
    application: {
      id: 'demo-app-respira',
      category_id: 'demo-cat-bienestar',
      nombre: 'Respira',
      descripcion: 'Ejercicios de respiración y grounding para momentos de ansiedad.',
      thumbnail_url: null,
      tipo: 'herramienta',
      activa: true,
      created_at: '2026-01-15T00:00:00Z',
      app_slug: null,
      url_acceso: null,
    },
  },
  {
    application_id: 'demo-app-pasoapaso',
    application: {
      id: 'demo-app-pasoapaso',
      category_id: 'demo-cat-salud',
      nombre: 'Paso a paso',
      descripcion: 'Plan personalizado de actividad física adaptado a tu ritmo.',
      thumbnail_url: null,
      tipo: 'programa',
      activa: true,
      created_at: '2026-02-01T00:00:00Z',
      app_slug: null,
      url_acceso: null,
    },
  },
  {
    application_id: 'demo-app-medidor',
    application: {
      id: 'demo-app-medidor',
      category_id: 'demo-cat-salud',
      nombre: 'Medidor de hábitos',
      descripcion: 'Encuesta semanal para registrar sueño, alimentación y movimiento.',
      thumbnail_url: null,
      tipo: 'encuesta',
      activa: true,
      created_at: '2026-02-10T00:00:00Z',
      app_slug: null,
      url_acceso: null,
    },
  },
  {
    application_id: 'demo-app-cuidadores',
    application: {
      id: 'demo-app-cuidadores',
      category_id: 'demo-cat-familia',
      nombre: 'Cuidadores',
      descripcion: 'Apoyo emocional, formación y red para personas cuidadoras.',
      thumbnail_url: null,
      tipo: 'programa',
      activa: true,
      created_at: '2026-02-20T00:00:00Z',
      app_slug: null,
      url_acceso: null,
    },
  },
  {
    application_id: 'demo-app-crianza',
    application: {
      id: 'demo-app-crianza',
      category_id: 'demo-cat-familia',
      nombre: 'Crianza con apoyo',
      descripcion: 'Guías, podcasts y comunidad para familias con menores.',
      thumbnail_url: null,
      tipo: 'recurso',
      activa: true,
      created_at: '2026-03-01T00:00:00Z',
      app_slug: null,
      url_acceso: null,
    },
  },
  {
    application_id: 'demo-app-orientacion',
    application: {
      id: 'demo-app-orientacion',
      category_id: 'demo-cat-desarrollo',
      nombre: 'Orientación laboral',
      descripcion: 'Acompañamiento para la búsqueda de empleo y mejora del CV.',
      thumbnail_url: null,
      tipo: 'programa',
      activa: true,
      created_at: '2026-03-12T00:00:00Z',
      app_slug: null,
      url_acceso: null,
    },
  },
  {
    application_id: 'demo-app-rrss',
    application: {
      id: 'demo-app-rrss',
      category_id: 'demo-cat-desarrollo',
      nombre: 'Comunidad',
      descripcion: 'Foro vecinal, propuestas ciudadanas y eventos del municipio.',
      thumbnail_url: null,
      tipo: 'herramienta',
      activa: true,
      created_at: '2026-03-20T00:00:00Z',
      app_slug: null,
      url_acceso: null,
    },
  },
]

// ─────────────────────────────────────────────────────────────────
// Helper: tenant sintético completo
// ─────────────────────────────────────────────────────────────────

export function getDemoTenant(slug: string): MunicipalityConfig {
  const capitalized = slug.charAt(0).toUpperCase() + slug.slice(1)
  // Previsualización editorial en DEMO_MODE sin tocar la DB. Sólo afecta
  // el helper de demo: en producción con SUPABASE_SERVICE_ROLE_KEY real,
  // el valor viene de `public.municipalities.layout_variant` (columna
  // introducida en #045 y sembrada para Villafranca en #046).
  //
  // El branch editorial vive en src/components/landing/editorial/ y se
  // activa condicionando `tenant.layout_variant === 'editorial'` al
  // final de HomePage en src/app/page.tsx. Para que el dev en localhost
  // pueda previsualizar el rediseño editorial sin conectar a Supabase,
  // /demo-data.ts mapea el slug canónico al variant editorial.
  const layoutVariant: MunicipalityConfig['layout_variant'] =
    slug === 'villafranca-de-los-barros' ? 'editorial' : 'classic'

  return {
    id: `demo-${slug}`,
    slug,
    nombre_municipio: capitalized,
    nombre_ayuntamiento: `Ayuntamiento de ${capitalized}`,
    dominio: `${slug}.tecuida.group`,
    escudo_url: '',
    logo_url: '',
    hero_image_url: '',
    layout_variant: layoutVariant,
    colores_corporativos: {
      primary: '#142c19',
      secondary: '#264d2c',
      accent: '#d79a35',
      background: '#f7f1e7',
      text: '#20231f',
    },
    imagenes_municipio: [],
    textos_institucionales: {
      bienvenida: 'Bienvenido/a al portal de bienestar',
      descripcion: 'Plataforma de bienestar emocional y salud comunitaria.',
      pie_pagina: '© Ayuntamiento — TE CUIDA',
    },
    modulos_activos: [],
    estado_suscripcion: 'activa',
  }
}
