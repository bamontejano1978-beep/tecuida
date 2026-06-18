/**
 * API Route Handler — POST /api/auth/register
 *
 * Endpoint de registro que reemplaza la Server Action signUp().
 *
 * Mismo patrón que POST /api/auth/login y GET /auth/callback:
 * cookies de sesión propagadas manualmente al response de redirect.
 */

import { createServerClient } from '@supabase/ssr'
import { type NextRequest, NextResponse } from 'next/server'
import { createAuthCookiesAdapter } from '@/lib/supabase/cookies'
import { z } from 'zod'

const signUpSchema = z.object({
  email: z.string().email('Correo electrónico inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  nombre: z.string().min(1, 'El nombre es obligatorio'),
  apellidos: z.string().min(1, 'Los apellidos son obligatorios'),
  telefono: z.string().optional(),
  fecha_nacimiento: z.string().optional(),
})

function getValidRedirect(raw: string | null): string {
  if (!raw || !raw.startsWith('/') || raw.includes('//') || raw.includes('\\\\') || raw.length > 500) {
    return '/dashboard'
  }
  return raw
}

export async function POST(request: NextRequest) {
  const origin = request.nextUrl.origin

  // Extraer slug del subdominio (el middleware no inyecta headers para /api/auth/*)
  const hostname = request.headers.get('host') || ''
  const slug = (() => {
    const parts = hostname.split('.')
    if (parts.length >= 3) return parts[0].toLowerCase()
    return null
  })() || request.headers.get('x-tenant-slug')

  if (!slug) {
    return NextResponse.redirect(
      `${origin}/register?error=${encodeURIComponent('No se pudo identificar el municipio. Contacta con soporte.')}`,
    )
  }

  try {
    const formData = await request.formData()

    const parsed = signUpSchema.safeParse({
      email: formData.get('email'),
      password: formData.get('password'),
      nombre: formData.get('nombre'),
      apellidos: formData.get('apellidos'),
      telefono: formData.get('telefono') || undefined,
      fecha_nacimiento: formData.get('fecha_nacimiento') || undefined,
    })

    if (!parsed.success) {
      const msg = parsed.error.errors[0]?.message || 'Datos inválidos'
      return NextResponse.redirect(`${origin}/register?error=${encodeURIComponent(msg)}`)
    }

    // 1. Respuesta intermedia para capturar cookies de sesión
    const response = NextResponse.redirect(`${origin}/register?error=unknown`)

    // 2. Cliente Supabase con adapter + writeThrough
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: createAuthCookiesAdapter(request.cookies, {
          writeThrough: [response.cookies],
        }),
      },
    )

    // 3. Registrar
    const { error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: `${origin}/auth/callback`,
        data: {
          municipality_slug: slug,
          nombre: parsed.data.nombre,
          apellidos: parsed.data.apellidos,
          telefono: parsed.data.telefono || null,
          fecha_nacimiento: parsed.data.fecha_nacimiento || null,
        },
      },
    })

    if (error) {
      if (error.message.includes('already registered')) {
        return NextResponse.redirect(`${origin}/register?error=${encodeURIComponent('Ya existe una cuenta con este correo electrónico')}`)
      }
      return NextResponse.redirect(`${origin}/register?error=${encodeURIComponent(error.message)}`)
    }

    // 4. Verificar si el usuario ya tiene sesión (email confirmation desactivado)
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (user?.aud === 'authenticated') {
      // Insertar en public.users (idempotente)
      try {
        const adminClient = createServerClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!,
          {
            cookies: {
              get: () => undefined,
              getAll: () => [],
              setAll: () => {},
            },
            auth: { autoRefreshToken: false, persistSession: false },
          },
        )

        const { data: municipality } = await adminClient
          .from('municipalities')
          .select('id')
          .eq('slug', slug)
          .single()

        if (municipality) {
          const { data: existing } = await adminClient
            .from('users')
            .select('id')
            .eq('id', user.id)
            .maybeSingle()

          if (!existing) {
            await adminClient.from('users').insert({
              id: user.id,
              municipality_id: municipality.id,
              email: user.email,
              nombre: parsed.data.nombre,
              apellidos: parsed.data.apellidos,
              telefono: parsed.data.telefono || null,
              fecha_nacimiento: parsed.data.fecha_nacimiento || null,
              rol: 'ciudadano',
            })
          }
        }
      } catch (err) {
        console.error('[POST /api/auth/register] Error ensurePublicUser:', err)
      }

      // Redirigir al dashboard con cookies de sesión
      const redirectTo = getValidRedirect(formData.get('redirect') as string | null)
      const finalResponse = NextResponse.redirect(`${origin}${redirectTo}`)
      response.cookies.getAll().forEach((cookie) => {
        finalResponse.cookies.set(cookie.name, cookie.value, cookie)
      })
      return finalResponse
    }

    // Email confirmation requerido → página de verificación
    return NextResponse.redirect(`${origin}/register/confirmation`)
  } catch (err) {
    console.error('[POST /api/auth/register] Unexpected:', err)
    const msg = err instanceof Error ? err.message : 'Error inesperado'
    return NextResponse.redirect(`${origin}/register?error=${encodeURIComponent(msg)}`)
  }
}
