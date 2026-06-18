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

import { createClient } from '@/lib/supabase/server'
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
// Tipos de resultado
// ---------------------------------------------------------------------------

export interface AuthResult {
  success: boolean
  error?: string
  /** Cuando el email no está confirmado, success es false pero damos feedback */
  emailNotConfirmed?: boolean
  /** URL a la que redirigir tras éxito (el cliente hace router.push) */
  redirectTo?: string
}

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
// signIn — Iniciar sesión
// ---------------------------------------------------------------------------

export async function signIn(
  _prevState: AuthResult,
  formData: FormData,
): Promise<AuthResult> {
  const parsed = signInSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.errors[0]?.message || 'Datos inválidos',
    }
  }

  const supabase = createClient()

  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  })

  if (error) {
    // Traducir errores comunes de Supabase a mensajes amigables
    if (error.message.includes('Invalid login credentials')) {
      return { success: false, error: 'Correo o contraseña incorrectos' }
    }
    if (error.message.includes('Email not confirmed')) {
      return {
        success: false,
        emailNotConfirmed: true,
        error: 'Debes confirmar tu correo electrónico antes de iniciar sesión',
      }
    }
    return { success: false, error: error.message }
  }

  // Determinar la URL de redirección:
  //   1. Si hay ?redirect= válido en el form, usarlo
  //   2. Si no, ir a /dashboard por defecto
  // NOTA: no usamos redirect() aquí porque useFormState no lo propaga
  // al navegador. Devolvemos redirectTo para que el cliente haga router.push().
  const redirectTo = getValidRedirect(formData.get('redirect'))
  return { success: true, redirectTo }
}

// ---------------------------------------------------------------------------
// signUp — Registrar nuevo ciudadano
// ---------------------------------------------------------------------------

export async function signUp(
  _prevState: AuthResult,
  formData: FormData,
): Promise<AuthResult> {
  const slug = getTenantSlug()
  if (!slug) {
    return {
      success: false,
      error: 'No se pudo identificar el municipio. Contacta con soporte.',
    }
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
    return {
      success: false,
      error: parsed.error.errors[0]?.message || 'Datos inválidos',
    }
  }

  const supabase = createClient()

  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      // El callback de PKCE donde Supabase enviará el código
      emailRedirectTo: getCallbackUrl(),
      data: {
        // Metadatos que el callback usará para insertar en public.users
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
      return {
        success: false,
        error: 'Ya existe una cuenta con este correo electrónico',
      }
    }
    return { success: false, error: error.message }
  }

  // Si Supabase no requiere confirmación de email, el usuario ya
  // tiene sesión. Redirigir al dashboard.
  // Si requiere confirmación, redirigir a la página de verificación.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user?.aud === 'authenticated') {
    const redirectTo = getValidRedirect(formData.get('redirect'))
    return { success: true, redirectTo }
  }

  return { success: true, redirectTo: '/register/confirmation' }
}

// ---------------------------------------------------------------------------
// signOut — Cerrar sesión
// ---------------------------------------------------------------------------

export async function signOut(): Promise<void> {
  const supabase = createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
