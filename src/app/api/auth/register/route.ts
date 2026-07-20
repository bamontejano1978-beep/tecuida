/**
 * Route Handler de registro — POST /api/auth/register
 *
 * Mismo patrón que login: signUp + buildAuthCookies + redirect 303.
 */

import { createServerClient } from '@supabase/ssr'
import { type NextRequest, NextResponse } from 'next/server'
import { createAuthCookiesAdapter } from '@/lib/supabase/cookies'
import { buildAuthCookies } from '@/lib/supabase/auth-cookies'
import { checkRateLimitAsync } from '@/lib/admin/rate-limit'
import { getTrustedOrigin } from '@/lib/request-origin'
import { createAdminClient } from '@/lib/supabase/server'
import {
  finalizeMunicipalInviteRegistration,
  releaseMunicipalInviteCode,
  reserveMunicipalInviteCode,
} from '@/lib/auth/municipal-invite-codes'
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
  access_code: z.string().trim().max(40, 'Código municipal inválido').optional(),
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

// ---------------------------------------------------------------------------
// POST /api/auth/register
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  const rateLimit = await checkRateLimitAsync(request, {
    limit: 5,
    windowMs: 15 * 60_000,
    namespace: 'auth:register',
  })
  if (rateLimit) return rateLimit

  const origin = getTrustedOrigin(request)

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
      access_code: formData.get('access_code') || undefined,
    })

    if (!parsed.success) {
      const msg = parsed.error.errors[0]?.message || 'Datos inválidos'
      return NextResponse.redirect(
        `${origin}/register?error=${encodeURIComponent(msg)}`,
        303,
      )
    }

    // 3. Resolver el municipio y, cuando proceda, reservar el código antes
    // de crear la identidad. La reserva caduca si no se confirma el correo.
    const adminClient = createAdminClient()
    const { data: municipality, error: municipalityError } = await adminClient
      .from('municipalities')
      .select('id, invite_codes_required')
      .eq('slug', slug)
      .single()

    if (municipalityError || !municipality) {
      return NextResponse.redirect(
        `${origin}/register?error=${encodeURIComponent('Municipio no encontrado.')}`,
        303,
      )
    }

    let inviteReservation: { token: string; emailHash: string } | null = null
    if (municipality.invite_codes_required) {
      if (!parsed.data.access_code) {
        return NextResponse.redirect(
          `${origin}/register?error=${encodeURIComponent('Necesitas un código municipal válido para registrarte.')}`,
          303,
        )
      }
      try {
        inviteReservation = await reserveMunicipalInviteCode(
          adminClient,
          municipality.id,
          parsed.data.access_code,
          parsed.data.email,
        )
      } catch (error) {
        console.error('[api/auth/register] Error reservando código:', error)
        return NextResponse.redirect(
          `${origin}/register?error=${encodeURIComponent('No se pudo validar el código municipal.')}`,
          303,
        )
      }
      if (!inviteReservation) {
        return NextResponse.redirect(
          `${origin}/register?error=${encodeURIComponent('El código municipal no es válido, ha caducado o ya fue utilizado.')}`,
          303,
        )
      }
    }

    // 4. Cliente Supabase
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: createAuthCookiesAdapter(request.cookies),
      },
    )

    // 5. Registrar
    const callbackUrl = `${origin}/auth/callback`
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
          invite_reservation_token: inviteReservation?.token || null,
        },
      },
    })

    if (signUpError) {
      if (inviteReservation) {
        await releaseMunicipalInviteCode(
          adminClient,
          inviteReservation.token,
          parsed.data.email,
        )
      }
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

    // Supabase puede ocultar que el correo ya existe devolviendo un usuario
    // sin identidades. Liberamos la reserva para que el código no se pierda.
    if (signUpData.user && signUpData.user.identities?.length === 0) {
      if (inviteReservation) {
        await releaseMunicipalInviteCode(
          adminClient,
          inviteReservation.token,
          parsed.data.email,
        )
      }
      return NextResponse.redirect(
        `${origin}/register?error=${encodeURIComponent('No se pudo crear la cuenta con esos datos.')}`,
        303,
      )
    }

    if (!signUpData.user) {
      if (inviteReservation) {
        await releaseMunicipalInviteCode(
          adminClient,
          inviteReservation.token,
          parsed.data.email,
        )
      }
      return NextResponse.redirect(
        `${origin}/register?error=${encodeURIComponent('No se pudo crear la cuenta con esos datos.')}`,
        303,
      )
    }

    // 6. Email confirmation requerida → redirigir a confirmación
    if (!signUpData.session) {
      return NextResponse.redirect(`${origin}/register/confirmation`, 303)
    }

    // 7. Email confirmation NO requerida → sesión activa.
    //    Insertar en public.users (admin client bypasea RLS).
    try {
      if (inviteReservation) {
        await finalizeMunicipalInviteRegistration(adminClient, {
          token: inviteReservation.token,
          userId: signUpData.user.id,
          email: parsed.data.email,
          alias: parsed.data.alias,
          genero: parsed.data.genero,
          anioNacimiento: parsed.data.anio_nacimiento,
        })
      } else {
        const { data: existing, error: existingError } = await adminClient
          .from('users')
          .select('id')
          .eq('id', signUpData.user.id)
          .maybeSingle()

        if (existingError) throw new Error(existingError.message)

        if (!existing) {
          const { error: insertError } = await adminClient.from('users').insert({
            id: signUpData.user.id,
            municipality_id: municipality.id,
            email: parsed.data.email,
            alias: parsed.data.alias || null,
            genero: parsed.data.genero || null,
            anio_nacimiento: parsed.data.anio_nacimiento || null,
            nombre: null,
            apellidos: null,
            rol: 'ciudadano',
            residency_status: 'open_registration',
            residency_method: 'open_registration',
          })
          if (insertError) throw new Error(insertError.message)
        }
      }
    } catch (err) {
      console.error('[api/auth/register] Error creando perfil:', err)
      if (inviteReservation && signUpData.user) {
        await Promise.allSettled([
          releaseMunicipalInviteCode(
            adminClient,
            inviteReservation.token,
            parsed.data.email,
          ),
          adminClient.auth.admin.deleteUser(signUpData.user.id),
        ])
        return NextResponse.redirect(
          `${origin}/register?error=${encodeURIComponent('No se pudo completar la validación municipal. Inténtalo de nuevo.')}`,
          303,
        )
      }
    }

    // 8. Construir cookies y redirigir (303 See Other)
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
