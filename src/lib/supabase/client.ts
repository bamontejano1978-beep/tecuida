/**
 * Cliente Supabase para el lado del navegador (Browser Client).
 *
 * Usa `createBrowserClient` de `@supabase/ssr` para gestionar la sesión
 * automáticamente mediante cookies, compatible con Next.js App Router.
 *
 * SEGURIDAD: Solo usa las variables públicas (`NEXT_PUBLIC_*`).
 * La `service_role_key` NUNCA debe usarse aquí.
 *
 * Requisitos: 5.1, 5.2, 13.4
 */

import { createBrowserClient } from '@supabase/ssr'

/**
 * Crea un cliente Supabase para componentes del lado del cliente (Client Components).
 *
 * Las variables de entorno `NEXT_PUBLIC_*` son seguras para el navegador.
 * Se puede invocar múltiples veces; `createBrowserClient` es ligero y reutiliza
 * la sesión almacenada en cookies del navegador.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
