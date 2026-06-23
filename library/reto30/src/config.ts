/**
 * Configuración de Reto30 para el catálogo TE CUIDA
 *
 * Reto30 es un programa de mindfulness de 30 días con 3 pilares diarios:
 * 🧠 Reflexión, ☀️ Actividad, ❤️ Relaciones.
 *
 * App original: React + Vite + Firebase + Capacitor + i18n
 * Migrada a la biblioteca de Te Cuida como proyecto independiente.
 */

import type { ManifestOptions } from 'vite-plugin-pwa'

// ═══════════════════════════════════════════════════════════════
// Metadatos de la app (catálogo Te Cuida)
// ═══════════════════════════════════════════════════════════════

export const appMeta = {
  nombre: 'Reto30',
  descripcion:
    'Transforma tu mente en 30 días. Un viaje de mindfulness con 3 pilares diarios: reflexión para entrenar tu pensamiento, actividad para conectar con tu cuerpo, y relaciones para nutrir tus vínculos. Diseño envolvente con tema oscuro, frases inspiradoras y celebración al completar cada día.',
  app_slug: 'reto30',
  tipo: 'programa' as 'programa' | 'herramienta' | 'encuesta' | 'recurso',
  brand_color: '#14b8a6',
  category_id: '11111111-0000-0000-0000-000000000001',
  url_acceso: (typeof import.meta !== 'undefined' && (import.meta as { env?: { VITE_APP_URL?: string } }).env?.VITE_APP_URL) || 'http://localhost:5173',
  instrucciones:
    '1. Regístrate en el portal de tu municipio.\n2. Accede a Reto30 desde el catálogo.\n3. Completa las 3 micro-tareas diarias durante 30 días.\n4. Instala la app como PWA para usarla sin conexión.',
  thumbnail_url:
    'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800&q=80',
}

// ═══════════════════════════════════════════════════════════════
// PWA Manifest (vite-plugin-pwa)
// ═══════════════════════════════════════════════════════════════

const brandColor = appMeta.brand_color.replace('#', '')
const inicial = appMeta.nombre.charAt(0).toUpperCase()
const svgIcon = `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="20" fill="%23${brandColor}"/><text x="50" y="68" font-size="55" font-weight="bold" text-anchor="middle" fill="white" font-family="system-ui">${inicial}</text></svg>`

export const tecuidaManifest: Partial<ManifestOptions> = {
  name: appMeta.nombre,
  short_name: appMeta.nombre,
  description: appMeta.descripcion,
  theme_color: appMeta.brand_color,
  background_color: '#0f172a',
  display: 'standalone',
  orientation: 'portrait',
  scope: '/',
  start_url: '/',
  icons: [
    {
      src: svgIcon,
      sizes: '512x512',
      type: 'image/svg+xml',
    },
  ],
}
