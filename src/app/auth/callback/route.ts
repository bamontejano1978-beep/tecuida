/**
 * Callback de autenticación Supabase (PKCE)
 *
 * GET /auth/callback?code=...
 *
 * Flujo:
 *   1. Intercambia el código de autorización por una sesión (PKCE).
 *   2. Escribe las cookies de sesión en la respuesta.
 *   3. Si es un registro nuevo (user_metadata tiene municipality_slug),
 *      inserta la fila en public.users usando el admin client.
 *   4. Redirige al dashboard con el tenant slug como query param.
 *
 * Requisitos: 5.1, 5.2, 12.1, 15.1
 */

import { createServerClient } from '@supabase/ssr'
import { type NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  // Si no hay código, redirigir a login con mensaje
  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`)
  }

  // 1. Crear una respuesta base y el cliente Supabase.
  //    La respuesta debe ser mutable para que setAll pueda escribir
  //    las cookies de sesión generadas por exchangeCodeForSession.
  const response = NextResponse.redirect(`${origin}/login?error=unknown`)

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(
          cookiesToSet: { name: string; value: string; options: Record<string, unknown> }[],
        ) {
          // Escribir las cookies de sesión en la respuesta.
          // exchangeCodeForSession invoca este callback con los nuevos tokens.
          cookiesToSet.forEach((c) => {
            response.cookies.set(c.name, c.value, c.options as never)
          })
        },
      },
    },
  )

  // 2. Intercambiar código por sesión (PKCE)
  const { error: exchangeError } =
    await supabase.auth.exchangeCodeForSession(code)

  if (exchangeError) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(exchangeError.message)}`,
    )
  }

  // 3. Obtener datos del usuario ya autenticado
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(`${origin}/login?error=no_user`)
  }

  // 4. Si el usuario tiene metadatos de registro (signUp),
  //    crear la fila en public.users
  const metadata = user.user_metadata as Record<string, unknown> | undefined
  let tenantSlug = (metadata?.municipality_slug as string) || ''

  if (metadata?.municipality_slug) {
    try {
      // Usar admin client para insertar en public.users
      // (RLS bloquea inserts del propio usuario si aún no tiene fila)
      const adminClient = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
          cookies: {
            getAll() {
              return request.cookies.getAll()
            },
            // eslint-disable-next-line @typescript-eslint/no-empty-function
            setAll() {
              // El admin client no necesita persistir sesión
            },
          },
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
        },
      )

      // Resolver municipality_id desde el slug
      const { data: municipality } = await adminClient
        .from('municipalities')
        .select('id')
        .eq('slug', metadata.municipality_slug as string)
        .single()

      if (municipality) {
        // Insertar solo si no existe ya la fila
        const { data: existingUser } = await adminClient
          .from('users')
          .select('id')
          .eq('id', user.id)
          .maybeSingle()

        if (!existingUser) {
          const { error: insertError } = await adminClient.from('users').insert({
            id: user.id,
            municipality_id: municipality.id,
            email: user.email,
            nombre: (metadata.nombre as string) || '',
            apellidos: (metadata.apellidos as string) || '',
            telefono: (metadata.telefono as string) || null,
            fecha_nacimiento: (metadata.fecha_nacimiento as string) || null,
            rol: 'ciudadano',
          })

          if (insertError) {
            console.error(
              `[auth/callback] Error insertando en public.users para ${user.id}:`,
              insertError.message,
            )
            return NextResponse.redirect(
              `${origin}/register?error=profile_creation_failed`,
            )
          }
        }
      } else {
        console.error(
          `[auth/callback] Municipio no encontrado para slug: ${metadata.municipality_slug as string}`,
        )
        return NextResponse.redirect(
          `${origin}/login?error=tenant_not_found`,
        )
      }
    } catch (err) {
      console.error(
        '[auth/callback] Error inesperado al crear perfil:',
        err,
      )
      return NextResponse.redirect(
        `${origin}/register?error=profile_creation_failed`,
      )
    }
  } else {
    // Si no hay metadatos de signUp, obtener el tenant del usuario existente
    // (útil para re-login donde el usuario ya tiene fila en public.users)
    try {
      const { data: userRow } = await createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
          cookies: {
            getAll() { return request.cookies.getAll() },
            // eslint-disable-next-line @typescript-eslint/no-empty-function
            setAll() {},
          },
          auth: { autoRefreshToken: false, persistSession: false },
        },
      )
        .from('users')
        .select('municipality_id, municipalities(slug)')
        .eq('id', user.id)
        .maybeSingle()

      if (userRow) {
        // Extraer slug del join con municipalities
        const mun = userRow.municipalities as unknown as Record<string, unknown> | null
        if (mun?.slug) {
          tenantSlug = mun.slug as string
        }
      }
    } catch {
      // Si falla, continuamos sin tenant slug — el dashboard lo manejará
    }
  }

  // 5. Redirigir al dashboard con el tenant slug
  const finalRedirect = tenantSlug
    ? `${origin}/dashboard?tenant=${tenantSlug}`
    : `${origin}/dashboard`

  // Reconstruir la respuesta de redirección preservando las cookies de sesión
  const finalResponse = NextResponse.redirect(finalRedirect)
  response.cookies.getAll().forEach((cookie) => {
    finalResponse.cookies.set(cookie.name, cookie.value, cookie)
  })

  return finalResponse
}
