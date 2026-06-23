/**
 * Middleware raíz de Next.js — TE CUIDA
 *
 * Responsabilidades (en orden de ejecución):
 *   1. Refrescar la sesión de Supabase (updateSession)
 *   2. Saltar paths públicos y de error
 *   3. Verificar autenticación en rutas protegidas → redirect /login
 *   4. Extraer el slug del tenant desde el subdominio (prod) o query param (dev)
 *   5. Resolver la configuración del municipio (caché → DB)
 *   6. Inyectar headers x-tenant-* para que Server Components y API Routes los lean
 *   7. Redirigir a /404 si el tenant no existe o está suspendido
 *
 * Requisitos: 2.1, 2.2, 2.3, 2.4, 5.1, 5.2, 5.3
 */

import { updateSession } from '@/lib/supabase/middleware'
import { tenantCache } from '@/lib/tenant/cache'
import { getDemoTenant } from '@/lib/demo-data'
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { createReadOnlyCookiesAdapter } from '@/lib/supabase/cookies'
import type { MunicipalityConfig, CorporateColors, InstitutionalTexts } from '@/types'

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------

/** Caminos que no requieren resolución de tenant */
const PUBLIC_ASSET_PREFIXES = [
  '/_next',
  '/favicon.ico',
  '/api/auth',
  '/api/admin',
  '/auth',
  '/login',
  // '/register' NO está aquí: el registro necesita que el middleware
  // resuelva el tenant e inyecte x-tenant-slug para que signUp()
  // sepa a qué municipio asociar al nuevo ciudadano.
]

/** Caminos de error — deben saltarse para evitar bucles de redirección */
const ERROR_PATHS = ['/404', '/suspendido']

/** Caché en memoria de apps resueltas por slug (evita query en cada request) */
const appSlugCache = new Map<string, { id: string; nombre: string; tipo: string; url_acceso?: string | null; brand_color?: string | null; thumbnail_url?: string | null; descripcion?: string | null; categoria_nombre?: string | null } | null>()

/** Rutas que requieren que el usuario esté autenticado */
const PROTECTED_PREFIXES = ['/app/', '/perfil', '/dashboard']

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Extrae el slug del tenant desde el hostname.
 *
 * Producción:  calamonte.tecuida.group → "calamonte"
 * Desarrollo:  localhost:3000?tenant=calamonte → "calamonte"
 *
 * Devuelve null si no se puede determinar el tenant.
 */
function extractTenantSlug(request: NextRequest): string | null {
  const hostname = request.headers.get('host') || ''

  // Desarrollo local: permitir ?tenant=slug como query param
  if (hostname.startsWith('localhost') || hostname.startsWith('127.0.0.1')) {
    return request.nextUrl.searchParams.get('tenant') || null
  }

  // Producción: extraer subdominio
  const parts = hostname.split('.')
  if (parts.length >= 3) {
    const slug = parts[0].toLowerCase()
    // Ignorar www explícito
    if (slug === 'www' && parts.length >= 4) {
      return parts[1].toLowerCase()
    }
    return slug
  }

  // Si solo hay 2 partes (ej. tecuida.es), es el dominio raíz sin tenant
  return null
}

/**
 * Determina si el pathname actual corresponde a un asset público
 * (estáticos, auth, etc.) que no necesita resolución de tenant.
 */
function isPublicPath(pathname: string): boolean {
  return PUBLIC_ASSET_PREFIXES.some((prefix) => pathname.startsWith(prefix))
}

/**
 * Determina si el pathname actual requiere autenticación.
 */
function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix))
}

/**
 * Mapea una fila de la DB al tipo MunicipalityConfig.
 */
function mapRowToConfig(row: Record<string, unknown>): MunicipalityConfig {
  return {
    id: row.id as string,
    slug: row.slug as string,
    nombre_municipio: row.nombre_municipio as string,
    nombre_ayuntamiento: row.nombre_ayuntamiento as string,
    dominio: row.dominio as string,
    escudo_url: (row.escudo_url as string) || '',
    logo_url: (row.logo_url as string) || '',
    hero_image_url: (row.hero_image_url as string) || '',
    colores_corporativos: (row.colores_corporativos as CorporateColors),
    imagenes_municipio: (row.imagenes_municipio as string[]) || [],
    textos_institucionales: (row.textos_institucionales as InstitutionalTexts),
    modulos_activos: (row.modulos_activos as string[]) || [],
    estado_suscripcion: row.estado_suscripcion as MunicipalityConfig['estado_suscripcion'],
  }
}

/**
 * Resuelve la configuración del municipio:
 *   1. Primero busca en Redis/memoria (tenantCache).
 *   2. Si no está, consulta PostgreSQL con la service_role_key.
 *   3. Guarda en caché para la próxima petición.
 *
 * Devuelve null si el municipio no existe.
 */
/**
 * Resuelve una aplicación por su app_slug.
 * Usa caché en memoria para evitar queries repetidos.
 */
async function resolveAppBySlug(
  slug: string,
): Promise<{ id: string; nombre: string; tipo: string; url_acceso?: string | null; brand_color?: string | null; thumbnail_url?: string | null; descripcion?: string | null; categoria_nombre?: string | null } | null> {
  if (appSlugCache.has(slug)) return appSlugCache.get(slug) ?? null

  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: createReadOnlyCookiesAdapter(),
        auth: { autoRefreshToken: false, persistSession: false },
      },
    )

    const { data } = await supabase
      .from('applications')
      .select('id, nombre, tipo, url_acceso, brand_color, thumbnail_url, descripcion, categoria:categories(nombre)')
      .eq('app_slug', slug)
      .eq('activa', true)
      .maybeSingle()

    const result = data
      ? {
          id: data.id as string,
          nombre: data.nombre as string,
          tipo: data.tipo as string,
          url_acceso: data.url_acceso as string | null,
          brand_color: data.brand_color as string | null,
          thumbnail_url: data.thumbnail_url as string | null,
          descripcion: data.descripcion as string | null,
          categoria_nombre: (data.categoria as unknown as { nombre: string } | null)?.nombre ?? null,
        }
      : null

    appSlugCache.set(slug, result)
    return result
  } catch {
    appSlugCache.set(slug, null)
    return null
  }
}

async function resolveTenant(
  slug: string,
): Promise<MunicipalityConfig | null> {
  // 1. Caché (Redis o memoria)
  const cached = await tenantCache.get(slug)
  if (cached) return cached

  // 2. Modo demo: devolver tenant simulado sin consultar Supabase
  if (process.env.DEMO_MODE === 'true') {
    const demoConfig = getDemoTenant(slug)
    await tenantCache.set(slug, demoConfig)
    return demoConfig
  }

  // 3. Base de datos — cliente admin (service_role bypasea RLS).
  //    IMPORTANTE: adapter no-op para que @supabase/ssr no reemplace
  //    el service_role_key por el JWT del usuario.
  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: createReadOnlyCookiesAdapter(),
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    )

    const { data, error } = await supabase
      .from('municipalities')
      .select('*')
      .eq('slug', slug)
      .single()

    if (error || !data) return null

    const config = mapRowToConfig(data)

    // 3. Guardar en caché para futuras peticiones
    await tenantCache.set(slug, config)

    return config
  } catch {
    // Si la DB no está disponible, devolver null para que el
    // usuario vea una página de error en lugar de un 500.
    return null
  }
}

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 0. Saltar updateSession en POST /login y POST /register.
  //    Son Server Actions de autenticación que establecen cookies
  //    de sesión NUEVAS. Si el middleware ejecuta getUser() antes,
  //    @supabase/ssr escribe cookies vacías (no hay sesión aún) en
  //    la respuesta, y Next.js 14 las mergea con las cookies que
  //    la Server Action intenta establecer → conflicto → el navegador
  //    recibe cookies inconsistentes y no persiste la sesión.
  const isAuthAction =
    request.method === 'POST' &&
    (pathname === '/login' || pathname === '/register' ||
     pathname === '/api/auth/login' || pathname === '/api/auth/register')

  // 1. Refrescar sesión de Supabase (cookies de auth).
  //    updateSession devuelve el usuario para evitar una llamada
  //    duplicada a getUser() en el paso 3.
  const { response: supabaseResponse, user } = isAuthAction
    ? { response: NextResponse.next({ request }), user: null }
    : await updateSession(request)

  // 2. Los assets públicos y las páginas de error no necesitan tenant.
  //    Las páginas de error deben excluirse para evitar un bucle infinito:
  //    si el tenant no existe, redirigimos a /404, y el middleware
  //    volvería a ejecutarse sobre /404 buscando el mismo tenant.
  if (isPublicPath(pathname) || ERROR_PATHS.some((p) => pathname.startsWith(p))) {
    return supabaseResponse
  }

  // 3. Verificar autenticación en rutas protegidas.
  //    El usuario ya viene de updateSession() (paso 1), sin llamada duplicada.
  if (isProtectedPath(pathname)) {
    if (!user) {
      // Construir URL de login preservando el tenant y la ruta original
      const tenantSlug = extractTenantSlug(request)
      const loginUrl = new URL('/login', request.url)
      if (tenantSlug) loginUrl.searchParams.set('tenant', tenantSlug)
      loginUrl.searchParams.set(
        'redirect',
        request.nextUrl.pathname + request.nextUrl.search,
      )
      // Diagnóstico: ayuda a detectar si las cookies de sesión
      // no se están leyendo correctamente (ej. formato incorrecto).
      if (process.env.NODE_ENV !== 'production') {
        const hasCookies =
          request.cookies.getAll().some((c) => c.name.includes('auth-token'))
        console.warn(
          `[middleware] Sin sesión en ruta protegida ${pathname}. ` +
            `Cookies auth presentes: ${hasCookies ? 'sí' : 'no'}. ` +
            `Tenant: ${tenantSlug || 'ninguno'}.`,
        )
      }
      return NextResponse.redirect(loginUrl)
    }
  }

  // 4. Extraer slug del hostname
  const slug = extractTenantSlug(request)
  if (!slug) {
    // Sin tenant: el dominio raíz o localhost sin ?tenant=
    // Se deja pasar; la página raíz puede mostrar un landing o pedir login.
    return supabaseResponse
  }

  // 5. Resolver tenant (caché → DB) — los municipios tienen prioridad
  const config = await resolveTenant(slug)

  // 6. Si no es un municipio, ¿es un subdominio de app?
  //    Solo aplica si la ruta no empieza con /apps/ (evitar loop)
  if (!config && !pathname.startsWith('/apps/')) {
    const app = await resolveAppBySlug(slug)
    if (app) {
      const appUrl = request.nextUrl.clone()
      appUrl.pathname = `/apps/${slug}`

      const appHeaders = new Headers(request.headers)
      appHeaders.set('x-app-id', app.id)
      appHeaders.set('x-app-name', app.nombre)
      appHeaders.set('x-app-type', app.tipo)
      if (app.url_acceso) appHeaders.set('x-app-url', app.url_acceso)
      if (app.brand_color) appHeaders.set('x-app-brand-color', app.brand_color)
      if (app.thumbnail_url) appHeaders.set('x-app-thumbnail', app.thumbnail_url)
      if (app.descripcion) appHeaders.set('x-app-description', app.descripcion)
      if (app.categoria_nombre) appHeaders.set('x-app-category', app.categoria_nombre)

      const appResponse = NextResponse.rewrite(appUrl, {
        request: { headers: appHeaders },
      })
      supabaseResponse.cookies.getAll().forEach((cookie) => {
        appResponse.cookies.set(cookie.name, cookie.value, cookie)
      })
      return appResponse
    }
    // Ni municipio ni app: 404
    return NextResponse.redirect(new URL(`/404?slug=${slug}`, request.url))
  }

  // 7. El tenant no existe y no es app: 404
  if (!config) {
    return NextResponse.redirect(new URL(`/404?slug=${slug}`, request.url))
  }

  // 8. Verificar estado de suscripción
  if (
    config.estado_suscripcion === 'suspendida' ||
    config.estado_suscripcion === 'cancelada'
  ) {
    return NextResponse.redirect(
      new URL(`/suspendido?tenant=${slug}`, request.url),
    )
  }

  // 9. Inyectar headers del tenant en la request
  const tenantHeaders = new Headers(request.headers)
  tenantHeaders.set('x-tenant-id', config.id)
  tenantHeaders.set('x-tenant-slug', config.slug)
  tenantHeaders.set('x-tenant-name', config.nombre_municipio)
  tenantHeaders.set('x-tenant-domain', config.dominio)
  tenantHeaders.set('x-tenant-subscription-status', config.estado_suscripcion)
  tenantHeaders.set('x-tenant-accent', config.colores_corporativos.accent)
  tenantHeaders.set('x-tenant-text', config.colores_corporativos.text)

  // 10. Propagar la petición con los headers de tenant
  //     y copiar las cookies de sesión del paso 1
  const response = NextResponse.next({
    request: { headers: tenantHeaders },
  })

  supabaseResponse.cookies.getAll().forEach((cookie) => {
    response.cookies.set(cookie.name, cookie.value, cookie)
  })

  return response
}

// ---------------------------------------------------------------------------
// Configuración del matcher
// ---------------------------------------------------------------------------

export const config = {
  matcher: [
    /*
     * El middleware se ejecuta en todas las rutas excepto:
     *  - _next/static (archivos estáticos compilados)
     *  - _next/image (optimización de imágenes)
     *  - favicon.ico
     *  - Archivos con extensiones estáticas (svg, png, jpg, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
