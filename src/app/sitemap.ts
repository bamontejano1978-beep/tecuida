/**
 * Sitemap dinámico — TE CUIDA
 *
 * Genera un sitemap.xml con todas las URLs indexables:
 *   - Landing page (tecuida.group)
 *   - Páginas estáticas (login, register)
 *   - Páginas de municipio (un subdominio por tenant)
 *
 * Next.js detecta automáticamente este archivo y lo sirve como /sitemap.xml.
 */

import { type MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_DOMAIN
    ? `https://${process.env.NEXT_PUBLIC_BASE_DOMAIN}`
    : 'https://tecuida.group'

  const staticRoutes = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: 'weekly' as const, priority: 1 },
    { url: `${baseUrl}/login`, lastModified: new Date(), changeFrequency: 'monthly' as const, priority: 0.5 },
    { url: `${baseUrl}/register`, lastModified: new Date(), changeFrequency: 'monthly' as const, priority: 0.5 },
  ]

  // NOTA: Los subdominios de municipios (calamonte.tecuida.group, etc.)
  // deben tener sus propios sitemaps servidos desde cada subdominio.
  // Next.js por defecto solo genera el sitemap del dominio raíz.
  // Para subdominios, añadir una API route que sirva sitemaps por tenant,
  // o usar el sitemap index de Next.js con generateSitemaps().

  return staticRoutes
}
