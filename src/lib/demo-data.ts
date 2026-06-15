/**
 * Demo Data — Datos simulados para el modo demostración.
 *
 * Se activa cuando DEMO_MODE=true en las variables de entorno.
 * Proporciona un tenant, categorías y aplicaciones de ejemplo
 * para que la app sea navegable sin Supabase real.
 */

import type { MunicipalityConfig, CorporateColors, InstitutionalTexts } from '@/types'

// ---------------------------------------------------------------------------
// Tenant de demostración
// ---------------------------------------------------------------------------

export function getDemoTenant(slug: string): MunicipalityConfig {
  const colors: CorporateColors = {
    primary: '#1e40af',
    secondary: '#3b82f6',
    accent: '#f59e0b',
    background: '#ffffff',
    text: '#f8fafc',
  }

  const texts: InstitutionalTexts = {
    bienvenida:
      'Bienvenido/a al portal de bienestar de tu municipio. Este es un entorno de demostración.',
    descripcion:
      'Explora los programas y herramientas disponibles para tu salud y bienestar.',
    pie_pagina: `© Ayuntamiento de ${slug} — TE CUIDA · Modo Demo`,
  }

  return {
    id: 'demo-tenant-id',
    slug,
    nombre_municipio: slug.charAt(0).toUpperCase() + slug.slice(1),
    nombre_ayuntamiento: `Ayuntamiento de ${slug}`,
    dominio: `${slug}.tecuida.group`,
    escudo_url: '',
    logo_url: '',
    hero_image_url: '',
    colores_corporativos: colors,
    imagenes_municipio: [],
    textos_institucionales: texts,
    modulos_activos: ['catalog', 'mindfulness'],
    tipo_suscripcion: 'premium',
    estado_suscripcion: 'activa',
  }
}

// ---------------------------------------------------------------------------
// Datos demo para la página principal
// ---------------------------------------------------------------------------

export interface DemoAppRow {
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

export interface DemoCategoryRow {
  id: string
  nombre: string
}

export const DEMO_CATEGORIES: DemoCategoryRow[] = [
  { id: 'cat-1', nombre: 'Bienestar Mental' },
  { id: 'cat-2', nombre: 'Salud Física' },
  { id: 'cat-3', nombre: 'Apoyo Familiar' },
  { id: 'cat-4', nombre: 'Desarrollo Personal' },
]

export const DEMO_APPS: DemoAppRow[] = [
  {
    application_id: 'app-mindful-30',
    application: {
      id: 'app-mindful-30',
      category_id: 'cat-1',
      nombre: 'Mindful 30',
      descripcion:
        'Programa de mindfulness de 30 días con meditaciones guiadas, ejercicios de respiración y técnicas de gestión del estrés.',
      thumbnail_url: null,
      tipo: 'programa',
      nivel_suscripcion: 'estandar',
      activa: true,
    },
  },
  {
    application_id: 'app-estres',
    application: {
      id: 'app-estres',
      category_id: 'cat-1',
      nombre: 'Gestión del Estrés',
      descripcion:
        'Herramientas prácticas para identificar y manejar el estrés diario. Incluye tests de autoevaluación y planes personalizados.',
      thumbnail_url: null,
      tipo: 'herramienta',
      nivel_suscripcion: 'basico',
      activa: true,
    },
  },
  {
    application_id: 'app-ejercicio',
    application: {
      id: 'app-ejercicio',
      category_id: 'cat-2',
      nombre: 'Ejercicio en Casa',
      descripcion:
        'Rutinas de ejercicio adaptadas a todos los niveles. Sin necesidad de equipamiento especial.',
      thumbnail_url: null,
      tipo: 'programa',
      nivel_suscripcion: 'basico',
      activa: true,
    },
  },
  {
    application_id: 'app-nutricion',
    application: {
      id: 'app-nutricion',
      category_id: 'cat-2',
      nombre: 'Nutrición Saludable',
      descripcion:
        'Guías de alimentación equilibrada, recetas saludables y planificación de menús semanales.',
      thumbnail_url: null,
      tipo: 'recurso',
      nivel_suscripcion: 'estandar',
      activa: true,
    },
  },
  {
    application_id: 'app-familia',
    application: {
      id: 'app-familia',
      category_id: 'cat-3',
      nombre: 'Apoyo a las Familias',
      descripcion:
        'Recursos para mejorar la comunicación familiar, gestión de conflictos y crianza positiva.',
      thumbnail_url: null,
      tipo: 'programa',
      nivel_suscripcion: 'premium',
      activa: true,
    },
  },
  {
    application_id: 'app-autoestima',
    application: {
      id: 'app-autoestima',
      category_id: 'cat-4',
      nombre: 'Taller de Autoestima',
      descripcion:
        'Programa interactivo para fortalecer la autoestima y la confianza personal a través de ejercicios prácticos.',
      thumbnail_url: null,
      tipo: 'programa',
      nivel_suscripcion: 'premium',
      activa: true,
    },
  },
  {
    application_id: 'app-ansiedad',
    application: {
      id: 'app-ansiedad',
      category_id: 'cat-1',
      nombre: 'Control de la Ansiedad',
      descripcion:
        'Técnicas cognitivo-conductuales para el manejo de la ansiedad. Incluye diario emocional y seguimiento.',
      thumbnail_url: null,
      tipo: 'herramienta',
      nivel_suscripcion: 'estandar',
      activa: true,
    },
  },
  {
    application_id: 'app-encuesta-bienestar',
    application: {
      id: 'app-encuesta-bienestar',
      category_id: 'cat-4',
      nombre: 'Encuesta de Bienestar',
      descripcion:
        'Evaluación integral de tu estado de bienestar físico y emocional. Recibe recomendaciones personalizadas.',
      thumbnail_url: null,
      tipo: 'encuesta',
      nivel_suscripcion: 'basico',
      activa: true,
    },
  },
]
