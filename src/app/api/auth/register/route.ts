/**
 * Route Handler de registro — POST /api/auth/register
 *
 * Mismo patrón que login: signUp + buildAuthCookies + redirect 303.
 */

import { createServerClient } from '@supabase/ssr'
import type { User } from '@supabase/supabase-js'
import { type NextRequest, NextResponse } from 'next/server'
import { createAuthCookiesAdapter } from '@/lib/supabase/cookies'
import { buildAuthCookies } from '@/lib/supabase/auth-cookies'
import { checkRateLimitAsync } from '@/lib/admin/rate-limit'
import { getTrustedOrigin } from '@/lib/request-origin'
import { createAdminClient } from '@/lib/supabase/server'
import {
  finalizeMunicipalInviteRegistration,
  hashInviteCode,
  hashInviteValue,
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

type RegistrationMunicipality = {
  id: string
  slug: string
  invite_codes_required: boolean
}

type InviteReservation = {
  token: string
  emailHash: string
  recovered?: boolean
}

async function getMunicipalityFromSlug(
  adminClient: ReturnType<typeof createAdminClient>,
  slug: string,
): Promise<RegistrationMunicipality | null> {
  const { data, error } = await adminClient
    .from('municipalities')
    .select('id, slug, invite_codes_required')
    .eq('slug', slug)
    .single()

  if (error || !data) return null
  return data as RegistrationMunicipality
}

async function getMunicipalityFromAccessCode(
  adminClient: ReturnType<typeof createAdminClient>,
  accessCode: string,
): Promise<RegistrationMunicipality | null> {
  const { data, error } = await adminClient
    .from('municipal_invite_codes')
    .select(
      `
      municipality:municipalities (
        id,
        slug,
        invite_codes_required
      )
    `,
    )
    .eq('code_hash', hashInviteCode(accessCode))
    .in('estado', ['disponible', 'reservado'])
    .limit(1)
    .maybeSingle()

  if (error || !data) return null

  const municipality = (data as {
    municipality:
      | RegistrationMunicipality
      | RegistrationMunicipality[]
      | null
  }).municipality

  if (!municipality) return null
  return Array.isArray(municipality) ? municipality[0] || null : municipality
}

async function getExistingInviteReservation(
  adminClient: ReturnType<typeof createAdminClient>,
  municipalityId: string,
  accessCode: string,
  email: string,
): Promise<InviteReservation | null> {
  const emailHash = hashInviteValue(email)
  const { data, error } = await adminClient
    .from('municipal_invite_codes')
    .select('reservation_token')
    .eq('municipality_id', municipalityId)
    .eq('code_hash', hashInviteCode(accessCode))
    .eq('reserved_email_hash', emailHash)
    .eq('estado', 'reservado')
    .gt('reserved_until', new Date().toISOString())
    .maybeSingle()

  if (error || !data?.reservation_token) return null

  return {
    token: String(data.reservation_token),
    emailHash,
    recovered: true,
  }
}

async function findAuthUserByEmail(
  adminClient: ReturnType<typeof createAdminClient>,
  email: string,
): Promise<User | null> {
  const target = email.trim().toLowerCase()

  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await adminClient.auth.admin.listUsers({
      page,
      perPage: 1000,
    })

    if (error) throw new Error(error.message)

    const user = data.users.find((candidate) => (
      candidate.email?.toLowerCase() === target
    ))

    if (user) return user
    if (data.users.length < 1000) return null
  }

  return null
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
    // 1. Parsear form data (RGPD: solo email + password + alias opcional + demografía opcional)
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

    // 2. Resolver el municipio y, cuando proceda, reservar el código antes
    // de crear la identidad. La reserva caduca si no se confirma el correo.
    const slug = getTenantSlug(request)
    const adminClient = createAdminClient()
    const municipality = slug
      ? await getMunicipalityFromSlug(adminClient, slug)
      : parsed.data.access_code
        ? await getMunicipalityFromAccessCode(adminClient, parsed.data.access_code)
        : null

    if (!municipality) {
      return NextResponse.redirect(
        `${origin}/register?error=${encodeURIComponent(
          slug
            ? 'Municipio no encontrado.'
            : 'Introduce el código municipal para conectar tu cuenta con tu municipio.',
        )}`,
        303,
      )
    }

    let inviteReservation: InviteReservation | null = null
    if (municipality.invite_codes_required || parsed.data.access_code) {
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
        inviteReservation = await getExistingInviteReservation(
          adminClient,
          municipality.id,
          parsed.data.access_code,
          parsed.data.email,
        )

        if (!inviteReservation) {
          return NextResponse.redirect(
            `${origin}/register?error=${encodeURIComponent('El código municipal no es válido, ha caducado o ya fue utilizado.')}`,
            303,
          )
        }
      }
    }

    // 4. Cliente Supabase para autenticar y crear cookies de sesión.
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: createAuthCookiesAdapter(request.cookies),
      },
    )

    const userMetadata = {
      municipality_slug: municipality.slug,
      alias: parsed.data.alias || null,
      genero: parsed.data.genero || null,
      anio_nacimiento: parsed.data.anio_nacimiento || null,
      invite_reservation_token: inviteReservation?.token || null,
    }

    if (!inviteReservation) {
      const callbackUrl = `${origin}/auth/callback`
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: parsed.data.email,
        password: parsed.data.password,
        options: {
          emailRedirectTo: callbackUrl,
          data: userMetadata,
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

      if (signUpData.user && signUpData.user.identities?.length === 0) {
        return NextResponse.redirect(
          `${origin}/register?error=${encodeURIComponent('No se pudo crear la cuenta con esos datos.')}`,
          303,
        )
      }

      if (!signUpData.user) {
        return NextResponse.redirect(
          `${origin}/register?error=${encodeURIComponent('No se pudo crear la cuenta con esos datos.')}`,
          303,
        )
      }

      if (!signUpData.session) {
        return NextResponse.redirect(`${origin}/register/confirmation`, 303)
      }

      try {
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
      } catch (err) {
        console.error('[api/auth/register] Error creando perfil:', err)
        await adminClient.auth.admin.deleteUser(signUpData.user.id)
        return NextResponse.redirect(
          `${origin}/register?error=${encodeURIComponent('No se pudo crear el perfil ciudadano.')}`,
          303,
        )
      }

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
    }

    // 5. Crear o confirmar la cuenta desde servidor. Solo se usa para
    // registros con código municipal válido, que hace de validación de acceso.
    let authUser: User | null = null
    let createdAuthUser = false

    const { data: createUserData, error: createUserError } =
      await adminClient.auth.admin.createUser({
        email: parsed.data.email,
        password: parsed.data.password,
        email_confirm: true,
        user_metadata: userMetadata,
      })

    if (createUserError) {
      const createUserMessage = createUserError.message.toLowerCase()
      const alreadyExists =
        createUserMessage.includes('already registered') ||
        createUserMessage.includes('already been registered') ||
        createUserMessage.includes('already exists')

      if (!alreadyExists) {
        if (inviteReservation && !inviteReservation.recovered) {
          await releaseMunicipalInviteCode(
            adminClient,
            inviteReservation.token,
            parsed.data.email,
          )
        }
        return NextResponse.redirect(
          `${origin}/register?error=${encodeURIComponent(createUserError.message)}`,
          303,
        )
      }

      try {
        authUser = await findAuthUserByEmail(adminClient, parsed.data.email)
      } catch (lookupError) {
        console.error('[api/auth/register] Error buscando usuario existente:', lookupError)
        if (inviteReservation && !inviteReservation.recovered) {
          await releaseMunicipalInviteCode(
            adminClient,
            inviteReservation.token,
            parsed.data.email,
          )
        }
        return NextResponse.redirect(
          `${origin}/register?error=${encodeURIComponent('Ya existe una cuenta con este correo')}`,
          303,
        )
      }

      if (!authUser) {
        if (inviteReservation && !inviteReservation.recovered) {
          await releaseMunicipalInviteCode(
            adminClient,
            inviteReservation.token,
            parsed.data.email,
          )
        }
        return NextResponse.redirect(
          `${origin}/register?error=${encodeURIComponent('Ya existe una cuenta con este correo')}`,
          303,
        )
      }

      const { error: confirmError } = await adminClient.auth.admin.updateUserById(
        authUser.id,
        {
          email_confirm: true,
          user_metadata: {
            ...(authUser.user_metadata || {}),
            ...userMetadata,
          },
        },
      )

      if (confirmError) {
        if (inviteReservation && !inviteReservation.recovered) {
          await releaseMunicipalInviteCode(
            adminClient,
            inviteReservation.token,
            parsed.data.email,
          )
        }
        return NextResponse.redirect(
          `${origin}/register?error=${encodeURIComponent('No se pudo activar la cuenta existente.')}`,
          303,
        )
      }
    } else {
      authUser = createUserData.user
      createdAuthUser = true
    }

    if (!authUser) {
      if (inviteReservation && !inviteReservation.recovered) {
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

    // 6. Iniciar sesión para construir cookies. Si el correo ya existía, la
    // contraseña debe coincidir; no consumimos el código si no autentica.
    const {
      data: signInData,
      error: signInError,
    } = await supabase.auth.signInWithPassword({
      email: parsed.data.email,
      password: parsed.data.password,
    })

    if (signInError || !signInData.session) {
      if (inviteReservation && !inviteReservation.recovered) {
        await releaseMunicipalInviteCode(
          adminClient,
          inviteReservation.token,
          parsed.data.email,
        )
      }
      if (createdAuthUser) {
        await adminClient.auth.admin.deleteUser(authUser.id)
      }
      return NextResponse.redirect(
        `${origin}/register?error=${encodeURIComponent(signInError?.message || 'No se pudo crear la sesión')}`,
        303,
      )
    }

    // 7. Insertar el perfil ciudadano y consumir el código si procede.
    try {
      if (inviteReservation) {
        await finalizeMunicipalInviteRegistration(adminClient, {
          token: inviteReservation.token,
          userId: authUser.id,
          email: parsed.data.email,
          alias: parsed.data.alias,
          genero: parsed.data.genero,
          anioNacimiento: parsed.data.anio_nacimiento,
        })
      } else {
        const { data: existing, error: existingError } = await adminClient
          .from('users')
          .select('id')
          .eq('id', authUser.id)
          .maybeSingle()

        if (existingError) throw new Error(existingError.message)

        if (!existing) {
          const { error: insertError } = await adminClient.from('users').insert({
            id: authUser.id,
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
      const cleanupTasks: Promise<unknown>[] = []
      if (inviteReservation && !inviteReservation.recovered) {
        cleanupTasks.push(releaseMunicipalInviteCode(
          adminClient,
          inviteReservation.token,
          parsed.data.email,
        ))
      }
      if (createdAuthUser) {
        cleanupTasks.push(adminClient.auth.admin.deleteUser(authUser.id))
      }
      await Promise.allSettled(cleanupTasks)
      return NextResponse.redirect(
        `${origin}/register?error=${encodeURIComponent('No se pudo completar la validación municipal. Inténtalo de nuevo.')}`,
        303,
      )
    }

    // 8. Construir cookies y redirigir (303 See Other)
    const authCookies = buildAuthCookies(signInData.session)

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
