/**
 * Server Actions de autenticación — TE CUIDA
 *
 * Todas las operaciones de auth se ejecutan en el servidor:
 *   - signIn: login con email/password
 *   - signUp: registro con validación Zod + metadata del tenant
 *   - signOut: cierre de sesión
 *
 * Requisitos: 5.1, 5.2, 11.5, 12.1, 12.2
 */

'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { z } from 'zod'

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const signInSchema = z.object({
  email: z.string().email('Correo electrónico inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
})

const signUpSchema = z.object({
  email: z.string().email('Correo electrónico inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  nombre: z.string().min(1, 'El nombre es obligatorio'),
  apellidos: z.string().min(1, 'Los apellidos son obligatorios'),
  telefono: z.string().optional(),
  fecha_nacimiento: z.string().optional(),
})

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getTenantSlug(): string | null {
  return headers().get('x-tenant-slug') || null
}

function getCallbackUrl(): string {
  const h = headers()
  const host = h.get('host') || 'localhost:3000'
  return `${host.startsWith('localhost') ? 'http' : 'https'}://${host}/auth/callback`
}

function getValidRedirect(raw: FormDataEntryValue | null): string {
  if (typeof raw !== 'string' || !raw) return '/dashboard'
  if (!raw.startsWith('/') || raw.includes('//') || raw.includes('\\\\') || raw.length > 500) return '/dashboard'
  return raw
}

async function ensurePublicUser(
  userId: string, slug: string, email: string,
  data: { nombre: string; apellidos: string; telefono?: string; fecha_nacimiento?: string },
): Promise<void> {
  const admin = createAdminClient()
  const { data: mun } = await admin.from('municipalities').select('id').eq('slug', slug).single()
  if (!mun) return

  const { data: existing } = await admin.from('users').select('id').eq('id', userId).maybeSingle()
  if (existing) return

  await admin.from('users').insert({
    id: userId, municipality_id: mun.id, email,
    nombre: data.nombre, apellidos: data.apellidos,
    telefono: data.telefono || null, fecha_nacimiento: data.fecha_nacimiento || null,
    rol: 'ciudadano',
  })
}

// ---------------------------------------------------------------------------
// signIn — Iniciar sesión
// ---------------------------------------------------------------------------

export async function signIn(formData: FormData): Promise<void> {
  const parsed = signInSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })

  if (!parsed.success) {
    redirect(`/login?error=${encodeURIComponent(parsed.error.errors[0]?.message || 'Datos inválidos')}`)
  }

  const supabase = createClient()

  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  })

  if (error) {
    if (error.message.includes('Invalid login credentials'))
      redirect('/login?error=' + encodeURIComponent('Correo o contraseña incorrectos'))
    if (error.message.includes('Email not confirmed'))
      redirect('/login?error=' + encodeURIComponent('Debes confirmar tu correo electrónico') + '&emailNotConfirmed=1')
    redirect('/login?error=' + encodeURIComponent(error.message))
  }

  // CRÍTICO: getUser() fuerza a @supabase/ssr a persistir la sesión en cookies
  await supabase.auth.getUser()

  redirect(getValidRedirect(formData.get('redirect')))
}

// ---------------------------------------------------------------------------
// signUp — Registrar nuevo ciudadano
// ---------------------------------------------------------------------------

export async function signUp(formData: FormData): Promise<void> {
  const slug = getTenantSlug()
  if (!slug) {
    redirect('/register?error=' + encodeURIComponent('No se pudo identificar el municipio.'))
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
    redirect(`/register?error=${encodeURIComponent(parsed.error.errors[0]?.message || 'Datos inválidos')}`)
  }

  const supabase = createClient()

  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: getCallbackUrl(),
      data: {
        municipality_slug: slug,
        nombre: parsed.data.nombre, apellidos: parsed.data.apellidos,
        telefono: parsed.data.telefono || null,
        fecha_nacimiento: parsed.data.fecha_nacimiento || null,
      },
    },
  })

  if (error) {
    if (error.message.includes('already registered'))
      redirect('/register?error=' + encodeURIComponent('Ya existe una cuenta con este correo'))
    redirect('/register?error=' + encodeURIComponent(error.message))
  }

  // getUser() también dispara setAll() para persistir cookies
  const { data: { user } } = await supabase.auth.getUser()

  if (user?.aud === 'authenticated') {
    await ensurePublicUser(user.id, slug, parsed.data.email, parsed.data)
    redirect(getValidRedirect(formData.get('redirect')))
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
