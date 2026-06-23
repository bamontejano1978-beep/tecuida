/**
 * Configuración de la aplicación para el catálogo TE CUIDA
 *
 * Edita este archivo para personalizar tu app:
 *   - nombre, descripcion: aparecen en el catálogo
 *   - app_slug: subdominio en tecuida.group (ej. "reto30" → reto30.tecuida.group)
 *   - tipo: programa | herramienta | encuesta | recurso
 *   - brand_color: color de marca en hex (#rrggbb)
 *   - category_id: UUID de la categoría en el catálogo
 *
 * También define el manifest.json de la PWA (nombre corto, iconos, colores).
 */

import type { ManifestOptions } from 'vite-plugin-pwa'

// ═══════════════════════════════════════════════════════════════
// Metadatos de la app (catálogo Te Cuida)
// ═══════════════════════════════════════════════════════════════

export const appMeta = {
  /** Nombre visible en el catálogo */
  nombre: 'Mi Aplicación',
  /** Descripción (1-3 frases). Aparece en la ficha del catálogo */
  descripcion:
    'Descripción breve de tu aplicación. Explica qué hace, para quién es y por qué es útil.',
  /** Slug para el subdominio. Solo minúsculas, números y guiones */
  app_slug: 'mi-app',
  /** Tipo de aplicación */
  tipo: 'herramienta' as 'programa' | 'herramienta' | 'encuesta' | 'recurso',
  /** Color de marca en hex */
  brand_color: '#4f46e5',
  /** UUID de la categoría en la base de datos de Te Cuida */
  category_id: '11111111-0000-0000-0000-000000000001',
  /** URL donde está desplegada la app (se actualiza automáticamente al desplegar) */
  url_acceso: (typeof import.meta !== 'undefined' && (import.meta as { env?: { VITE_APP_URL?: string } }).env?.VITE_APP_URL) || 'http://localhost:5173',
  /** Instrucciones de instalación/uso (opcional) */
  instrucciones:
    '1. Abre la aplicación en tu navegador.\n2. Instálala como PWA desde el menú del navegador.\n3. Accede sin conexión cuando quieras.',
  /** URL de la miniatura (imagen de portada en el catálogo) */
  thumbnail_url:
    'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800&q=80',
}

// ═══════════════════════════════════════════════════════════════
// PWA Manifest (vite-plugin-pwa)
// ═══════════════════════════════════════════════════════════════

export const tecuidaManifest: Partial<ManifestOptions> = {
  name: appMeta.nombre,
  short_name: appMeta.nombre.slice(0, 12),
  description: appMeta.descripcion,
  theme_color: appMeta.brand_color,
  background_color: '#ffffff',
  display: 'standalone',
  orientation: 'portrait',
  scope: '/',
  start_url: '/',
  icons: [
    {
      src: '/icon-192.png',
      sizes: '192x192',
      type: 'image/png',
    },
    {
      src: '/icon-512.png',
      sizes: '512x512',
      type: 'image/png',
    },
  ],
}
