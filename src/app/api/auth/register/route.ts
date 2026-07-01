/**
 * Route Handler de registro — POST /api/auth/register
 *
 * Mismo patrón que login: signUp + buildAuthCookies + redirect 303.
 */

import { createServerClient } from '@supabase/ssr'
import { type NextRequest, NextResponse } from 'next/server'
import { createAuthCookiesAdapter } from '@/lib/supabase/cookies'
import { buildAuthCookies } from '@/lib/supabase/auth-cookies'
import { z } from 'zod'

// ---------------------------------------------------------------------------
// Schemas & Helpers
// ---------------------------------------------------------------------------

const registerSchema = z.object({
  email: z.string().email('Correo electrónico inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  // RGPD (migración 032): solo email + password obligatorios.
  // alias es un pseudónimo opcional no identificable.
  alias: z.string().max(60, 'El alias no puede superar los 60 caracteres').optional(),
  // Datos estadísticos anónimos (migración 033) — totalmente opcionales
  genero: z
    .enum(['hombre', 'mujer', 'no_binario'])
    .optional()
    .or(z.literal('').transform(() => undefined)),
  anio_nacimiento: z
    .string()
    .optional()
    .transform((val) => {
      if (!val || val === '') return undefined
      const n = parseInt(val, 10)
      if (Number.isNaN(n)) return undefined
      const currentYear = new Date().getFullYear()
      // Validar rango razonable: entre 1900 y (año actual - 10)
      if (n < 1900 || n > currentYear - 10) return undefined
      return n
    }),
})

function getTenantSlug(request: NextRequest): string | null {
  const hostname = request.headers.get('host') || ''
  if (hostname.startsWith('localhost') || hostname.startsWith('127.0.0.1')) {
    return request.nextUrl.searchParams.get('tenant') || null
  }
  const parts = hostname.split('.')
  if (parts.length >= 3) {
    const slug = parts[0].toLowerCase()
    if (slug === 'www' && parts.length >= 4) return parts[1].toLowerCase()
    return slug
  }
  return null
}

function getValidRedirect(raw: string | null): string {
  if (!raw || !raw.startsWith('/') || raw.includes('//') || raw.includes('\\\\') || raw.length > 500) {
    return '/dashboard'
  }
  return raw
}

async function getCallbackUrl(request: NextRequest): Promise<string> {
  const host = request.headers.get('host') || 'localhost:3000'
  const protocol = host.startsWith('localhost') ? 'http' : 'https'
  return `${protocol}://${host}/auth/callback`
}

// ---------------------------------------------------------------------------
// POST /api/auth/register
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  const { origin } = new URL(request.url)

  try {
    // 1. Slug del tenant
    const slug = getTenantSlug(request)
    if (!slug) {
      return NextResponse.redirect(
        `${origin}/register?error=${encodeURIComponent('No se pudo identificar el municipio.')}`,
        303,
      )
    }

    // 2. Parsear form data (RGPD: solo email + password + alias opcional + demografía opcional)
    const formData = await request.formData()
    const parsed = registerSchema.safeParse({
      email: formData.get('email'),
      password: formData.get('password'),
      alias: formData.get('alias') || undefined,
      genero: formData.get('genero') || undefined,
      anio_nacimiento: formData.get('anio_nacimiento') || undefined,
    })

    if (!parsed.success) {
      const msg = parsed.error.errors[0]?.message || 'Datos inválidos'
      return NextResponse.redirect(
        `${origin}/register?error=${encodeURIComponent(msg)}`,
        303,
      )
    }

    // 3. Cliente Supabase
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: createAuthCookiesAdapter(request.cookies),
      },
    )

    // 4. Registrar
    const callbackUrl = await getCallbackUrl(request)
    const {
      data: signUpData,
      error: signUpError,
    } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: callbackUrl,
        data: {
          municipality_slug: slug,
          alias: parsed.data.alias || null,
          genero: parsed.data.genero || null,
          anio_nacimiento: parsed.data.anio_nacimiento || null,
        },
      },
    })

    if (signUpError) {
      if (signUpError.message.includes('already registered')) {
        return NextResponse.redirect(
          `${origin}/register?error=${encodeURIComponent('Ya existe una cuenta con este correo')}`,
          303,
        )
      }
      return NextResponse.redirect(
        `${origin}/register?error=${encodeURIComponent(signUpError.message)}`,
        303,
      )
    }

    // 5. Email confirmation requerida → redirigir a confirmación
    if (!signUpData.session) {
      return NextResponse.redirect(`${origin}/register/confirmation`, 303)
    }

    // 6. Email confirmation NO requerida → sesión activa.
    //    Insertar en public.users (admin client bypasea RLS).
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

      const { data: mun } = await adminClient
        .from('municipalities')
        .select('id')
        .eq('slug', slug)
        .single()

      if (mun && signUpData.user) {
        const { data: existing } = await adminClient
          .from('users')
          .select('id')
          .eq('id', signUpData.user.id)
          .maybeSingle()

        if (!existing) {
          await adminClient.from('users').insert({
            id: signUpData.user.id,
            municipality_id: mun.id,
            email: parsed.data.email,
            alias: parsed.data.alias || null,
            genero: parsed.data.genero || null,
            anio_nacimiento: parsed.data.anio_nacimiento || null,
            nombre: null,
            apellidos: null,
            rol: 'ciudadano',
          })
        }
      }
    } catch (err) {
      console.error('[api/auth/register] Error creando perfil:', err)
    }

    // 7. Construir cookies y redirigir (303 See Other)
    const authCookies = buildAuthCookies(signUpData.session)

    const redirectTo = getValidRedirect(
      typeof formData.get('redirect') === 'string'
        ? (formData.get('redirect') as string)
        : null,
    )
    const response = NextResponse.redirect(`${origin}${redirectTo}`, 303)

    authCookies.forEach(({ name, value, options }) => {
      response.cookies.set(name, value, options)
    })

    return response
  } catch (err) {
    console.error('[api/auth/register] Error inesperado:', err)
    return NextResponse.redirect(
      `${origin}/register?error=${encodeURIComponent('Error interno. Intenta de nuevo.')}`,
      303,
    )
  }
}
