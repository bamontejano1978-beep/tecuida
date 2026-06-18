/**
 * Server Actions de autenticación — TE CUIDA
 *
 * Todas las operaciones de auth se ejecutan en el servidor:
 *   - signIn: login con email/password
 *   - signUp: registro con validación Zod + metadata del tenant
 *   - signOut: cierre de sesión
 *
 * La resolución del tenant se hace leyendo los headers x-tenant-*
 * inyectados por el middleware raíz (src/middleware.ts).
 *
 * Requisitos: 5.1, 5.2, 11.5, 12.1, 12.2
 */

'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { z } from 'zod'

// ---------------------------------------------------------------------------
// Schemas de validación
// ---------------------------------------------------------------------------

const signInSchema = z.object({
  email: z.string().email('Correo electrónico inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
})

const signUpSchema = z.object({
  email: z.string().email('Correo electrónico inválido'),
  password: z
    .string()
    .min(6, 'La contraseña debe tener al menos 6 caracteres'),
  nombre: z.string().min(1, 'El nombre es obligatorio'),
  apellidos: z.string().min(1, 'Los apellidos son obligatorios'),
  telefono: z.string().optional(),
  fecha_nacimiento: z.string().optional(),
})

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Obtiene el slug del tenant actual desde los headers inyectados
 * por el middleware raíz.
 */
function getTenantSlug(): string | null {
  const headersList = headers()
  return headersList.get('x-tenant-slug') || null
}

/**
 * Construye la URL de callback de Supabase Auth.
 * En desarrollo usa localhost; en producción usa el dominio del tenant.
 */
function getCallbackUrl(): string {
  const headersList = headers()
  const host = headersList.get('host') || 'localhost:3000'
  const protocol = host.startsWith('localhost') ? 'http' : 'https'
  return `${protocol}://${host}/auth/callback`
}

/**
 * Asegura que el usuario recién registrado tenga fila en public.users.
 *
 * Cuando Supabase tiene la confirmación de email desactivada, el usuario
 * obtiene sesión inmediata tras signUp(). El callback /auth/callback NUNCA
 * se invoca, y por tanto public.users nunca recibe la fila. Esta función
 * cubre ese caso insertando la fila directamente con el admin client.
 *
 * Es idempotente: si la fila ya existe (p.ej. porque el callback ya la creó),
 * no hace nada.
 */
async function ensurePublicUser(
  userId: string,
  slug: string,
  email: string,
  data: { nombre: string; apellidos: string; telefono?: string; fecha_nacimiento?: string },
): Promise<void> {
  const adminClient = createAdminClient()

  // 1. Resolver municipality_id desde el slug
  const { data: municipality } = await adminClient
    .from('municipalities')
    .select('id')
    .eq('slug', slug)
    .single()

  if (!municipality) {
    console.error('[ensurePublicUser] Municipio no encontrado para slug:', slug)
    return
  }

  // 2. Verificar si ya existe la fila
  const { data: existing } = await adminClient
    .from('users')
    .select('id')
    .eq('id', userId)
    .maybeSingle()

  if (existing) return // ya existe, nada que hacer

  // 3. Insertar
  const { error: insertError } = await adminClient.from('users').insert({
    id: userId,
    municipality_id: municipality.id,
    email,
    nombre: data.nombre,
    apellidos: data.apellidos,
    telefono: data.telefono || null,
    fecha_nacimiento: data.fecha_nacimiento || null,
    rol: 'ciudadano',
  })

  if (insertError) {
    console.error('[ensurePublicUser] Error insertando:', insertError.message)
  }
}

/**
 * Valida y sanitiza la URL de redirección para prevenir open redirect.
 *
 * Solo permite paths locales que:
 *   - Empiezan con /
 *   - No contienen // (previene protocol-relative URLs)
 *   - No contienen \\ (previene backslash tricks)
 *
 * @param raw - El valor del formData (string | File | null)
 * @returns Una URL segura o '/dashboard' como fallback
 */
function getValidRedirect(raw: FormDataEntryValue | null): string {
  if (typeof raw !== 'string' || !raw) return '/dashboard'

  // Solo paths locales
  if (!raw.startsWith('/')) return '/dashboard'

  // Bloquear protocol-relative URLs (//evil.com)
  if (raw.includes('//')) return '/dashboard'

  // Bloquear backslash tricks
  if (raw.includes('\\')) return '/dashboard'

  // Limitar longitud máxima razonable
  if (raw.length > 500) return '/dashboard'

  return raw
}

// ---------------------------------------------------------------------------
// signIn — Iniciar sesión (plain Server Action, sin useFormState)
// ---------------------------------------------------------------------------
//
// Usamos una Server Action plana con <form action={signIn}> en vez de
// useFormState. Esto es más fiable en Next.js 14: redirect() navega
// directamente al navegador sin la capa intermedia de useFormState.
// Los errores se pasan como query params (?error=...) en la URL.

export async function signIn(formData: FormData): Promise<void> {
  const parsed = signInSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })

  if (!parsed.success) {
    const msg = parsed.error.errors[0]?.message || 'Datos inválidos'
    redirect(`/login?error=${encodeURIComponent(msg)}`)
  }

  const supabase = createClient()

  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  })

  if (error) {
    if (error.message.includes('Invalid login credentials')) {
      redirect('/login?error=' + encodeURIComponent('Correo o contraseña incorrectos'))
    }
    if (error.message.includes('Email not confirmed')) {
      redirect('/login?error=' + encodeURIComponent('Debes confirmar tu correo electrónico antes de iniciar sesión') + '&emailNotConfirmed=1')
    }
    redirect('/login?error=' + encodeURIComponent(error.message))
  }

  // Determinar la URL de redirección:
  //   1. Si hay ?redirect= válido en el form, usarlo
  //   2. Si no, ir a /dashboard por defecto
  const redirectTo = getValidRedirect(formData.get('redirect'))
  redirect(redirectTo)
}

// ---------------------------------------------------------------------------
// signUp — Registrar nuevo ciudadano (plain Server Action, sin useFormState)
// ---------------------------------------------------------------------------

export async function signUp(formData: FormData): Promise<void> {
  const slug = getTenantSlug()
  if (!slug) {
    redirect('/register?error=' + encodeURIComponent('No se pudo identificar el municipio. Contacta con soporte.'))
  }

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
    redirect(`/register?error=${encodeURIComponent(msg)}`)
  }

  const supabase = createClient()

  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: getCallbackUrl(),
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
      redirect('/register?error=' + encodeURIComponent('Ya existe una cuenta con este correo electrónico'))
    }
    redirect('/register?error=' + encodeURIComponent(error.message))
  }

  // Si Supabase no requiere confirmación de email, el usuario ya
  // tiene sesión. Insertar en public.users y redirigir al dashboard.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user?.aud === 'authenticated') {
    try {
      await ensurePublicUser(user.id, slug, parsed.data.email, parsed.data)
    } catch (err) {
      console.error('[signUp] Error creando public.users:', err)
    }

    const redirectTo = getValidRedirect(formData.get('redirect'))
    redirect(redirectTo)
  }

  redirect('/register/confirmation')
}

// ---------------------------------------------------------------------------
// signOut — Cerrar sesión
// ---------------------------------------------------------------------------

export async function signOut(): Promise<void> {
  const supabase = createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
