/**
 * Clientes Supabase para el lado del servidor (Server Clients).
 *
 * Exporta dos funciones:
 *  - `createClient()` — cliente autenticado que lee la sesión del ciudadano
 *    desde las cookies de la petición. Para uso en Server Components,
 *    Server Actions y Route Handlers que operan en nombre del ciudadano.
 *
 *  - `createAdminClient()` — cliente con `service_role_key` que bypasea RLS.
 *    SOLO para uso en rutas del panel de superadministrador (`/api/admin/*`).
 *    NUNCA importar este cliente en componentes del lado del cliente.
 *
 * SEGURIDAD (Requisito 13.4 / 10.5):
 *  - `SUPABASE_SERVICE_ROLE_KEY` no tiene prefijo `NEXT_PUBLIC_` y por tanto
 *    NUNCA es expuesta al bundle del navegador ni al cliente.
 *  - El compilador de Next.js excluye automáticamente las variables de entorno
 *    sin ese prefijo de los bundles de cliente.
 *
 * Requisitos: 5.1, 5.2, 10.5, 13.4
 */

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createAuthCookiesAdapter } from '@/lib/supabase/cookies'

/**
 * Crea un cliente Supabase para Server Components, Server Actions y Route Handlers.
 *
 * Lee la sesión activa del ciudadano desde las cookies de la petición entrante.
 * Escribe cookies de refresco automático cuando el token es renovado.
 *
 * @example
 * // En un Server Component:
 * const supabase = createClient()
 * const { data: { user } } = await supabase.auth.getUser()
 */
export function createClient() {
  const cookieStore = cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      // Adapter compartido: get(name) para combineChunks en flujos auth
      // (getUser/getSession/etc.), getAll() snapshot, setAll() con
      // try/catch interno que cubre Server Components de solo lectura.
      cookies: createAuthCookiesAdapter(cookieStore),
    }
  )
}

/**
 * Crea un cliente Supabase con la `service_role_key` que bypasea RLS.
 *
 * ⚠️  ADVERTENCIA DE SEGURIDAD:
 *  - Este cliente tiene acceso TOTAL a la base de datos sin restricciones RLS.
 *  - Solo debe usarse en rutas del servidor del panel admin (`/api/admin/*`).
 *  - NUNCA importar en Client Components, páginas del ciudadano ni middlewares públicos.
 *  - La variable `SUPABASE_SERVICE_ROLE_KEY` no tiene prefijo `NEXT_PUBLIC_` y
 *    NUNCA será incluida en el bundle del navegador por Next.js.
 *
 * @example
 * // En /api/admin/municipalities/route.ts (solo servidor):
 * const supabase = createAdminClient()
 * const { data } = await supabase.from('municipalities').select('*')
 */
export function createAdminClient() {
  const cookieStore = cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      // Adapter compartido. Para el admin client, getUser() no se invoca
      // en auth flows (autoRefreshToken:false + persistSession:false) y
      // por tanto combineChunks nunca se llama; mantenemos get/getAll
      // por consistencia con el contrato CookieMethods y por si Supabase
      // cambia su comportamiento interno.
      cookies: createAuthCookiesAdapter(cookieStore),
      // Desactivar la persistencia de sesión para el cliente admin:
      // opera con la service_role_key estática, no con JWT de usuario.
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}
