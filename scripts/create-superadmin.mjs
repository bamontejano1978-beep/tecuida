#!/usr/bin/env node
/**
 * Script idempotente para crear/asegurar un superadmin de prueba.
 *
 * USO:
 *   SUPABASE_SERVICE_ROLE_KEY=xxx node scripts/create-superadmin.mjs \
 *     --email admin@tecuida.es --password 'TestAdmin2026!Secure' --name 'Admin'
 *
 * O usando .env.local del proyecto Vercel:
 *   vercel env pull .env.local && node scripts/create-superadmin.mjs
 *
 * El script:
 *   1. Verifica que el tenant 'platform' existe (la migración 012 lo crea)
 *   2. Crea el auth user con email_confirm=true (no requiere verificación)
 *   3. Inserta/actualiza el row en public.users con rol='superadmin'
 *   4. Es idempotente: si el user ya existe, lo reutiliza
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

// ---------------------------------------------------------------------------
// Parseo de args + carga de .env.local si existe
// ---------------------------------------------------------------------------

function loadEnvLocal() {
  try {
    const path = resolve(process.cwd(), '.env.local')
    const content = readFileSync(path, 'utf8')
    for (const line of content.split('\n')) {
      const m = line.match(/^([A-Z_][A-Z0-9_]*)\s*=\s*(.+)$/)
      if (m && !process.env[m[1]]) {
        process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
      }
    }
  } catch {
    // .env.local no existe o no se puede leer → ok
  }
}
loadEnvLocal()

const args = process.argv.slice(2)
function getArg(name, fallback) {
  const i = args.indexOf(`--${name}`)
  return i >= 0 ? args[i + 1] : fallback
}
function hasFlag(name) {
  return args.includes(`--${name}`)
}

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  getArg('url')
const SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || getArg('service-key')

const EMAIL = getArg('email', 'admin@tecuida.es')
const PASSWORD = getArg('password', 'TestAdmin2026!Secure')
const NOMBRE = getArg('name', 'Admin')
const APELLIDOS = getArg('surname', 'Plataforma')
// Por seguridad, el password NO se imprime a stdout salvo flag explícito
const PRINT_PASSWORD = hasFlag('print-password')

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error(
    'Faltan credenciales. Provee SUPABASE_SERVICE_ROLE_KEY y SUPABASE_URL en env, .env.local, o como flags --url / --service-key',
  )
  process.exit(1)
}

// ---------------------------------------------------------------------------
// Cliente admin (bypasea RLS)
// ---------------------------------------------------------------------------

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// ---------------------------------------------------------------------------
// 1. Verificar que el tenant 'platform' existe
// ---------------------------------------------------------------------------

const { data: platformTenant, error: tenantErr } = await admin
  .from('municipalities')
  .select('id, slug')
  .eq('slug', 'platform')
  .single()

if (tenantErr || !platformTenant) {
  console.error(
    "ERROR: el tenant 'platform' no existe. Aplica primero la migración 012 con:",
  )
  console.error('  npx supabase db push')
  process.exit(1)
}

console.log(`✓ Tenant 'platform' encontrado: ${platformTenant.id}`)

// ---------------------------------------------------------------------------
// 2. Crear o recuperar el auth user
// ---------------------------------------------------------------------------

let authUserId
// Iterar páginas de listUsers() (límite por defecto: 50). En proyectos
// con más de 50 usuarios hay que iterar para no crear duplicados.
let existing = null
let page = 1
const PER_PAGE = 1000
while (true) {
  const { data: pageData, error: pageErr } =
    await admin.auth.admin.listUsers({ page, perPage: PER_PAGE })
  if (pageErr) {
    console.warn(
      `[create-superadmin] listUsers() falló en página ${page}:`,
      pageErr.message,
    )
    break
  }
  const found = pageData?.users?.find((u) => u.email === EMAIL)
  if (found) {
    existing = found
    break
  }
  if (!pageData?.users || pageData.users.length < PER_PAGE) break
  page++
}

if (existing) {
  authUserId = existing.id
  console.log(`✓ Auth user ya existe: ${EMAIL} (id=${authUserId})`)
  // Actualizar password por si cambió
  const { error: updErr } = await admin.auth.admin.updateUserById(
    authUserId,
    { password: PASSWORD, email_confirm: true },
  )
  if (updErr) {
    console.error('  Aviso: no se pudo actualizar password:', updErr.message)
  } else {
    console.log('  Password actualizada y email_confirm=true')
  }
} else {
  const { data: created, error: createErr } =
    await admin.auth.admin.createUser({
      email: EMAIL,
      password: PASSWORD,
      email_confirm: true, // bypass email verification
      user_metadata: {
        nombre: NOMBRE,
        apellidos: APELLIDOS,
        municipality_slug: 'platform',
        is_superadmin: true,
      },
    })
  if (createErr || !created?.user) {
    console.error('ERROR creando auth user:', createErr?.message)
    process.exit(1)
  }
  authUserId = created.user.id
  console.log(`✓ Auth user creado: ${EMAIL} (id=${authUserId})`)
}

// ---------------------------------------------------------------------------
// 3. Insertar/actualizar en public.users con rol='superadmin'
// ---------------------------------------------------------------------------

const { data: existingPub } = await admin
  .from('users')
  .select('id, rol, municipality_id')
  .eq('id', authUserId)
  .maybeSingle()

if (existingPub) {
  const { error: updPubErr } = await admin
    .from('users')
    .update({
      rol: 'superadmin',
      municipality_id: platformTenant.id,
      email: EMAIL,
      nombre: NOMBRE,
      apellidos: APELLIDOS,
    })
    .eq('id', authUserId)
  if (updPubErr) {
    console.error('ERROR actualizando public.users:', updPubErr.message)
    process.exit(1)
  }
  console.log('✓ public.users actualizado a rol=superadmin')
} else {
  const { error: insPubErr } = await admin.from('users').insert({
    id: authUserId,
    municipality_id: platformTenant.id,
    email: EMAIL,
    nombre: NOMBRE,
    apellidos: APELLIDOS,
    rol: 'superadmin',
  })
  if (insPubErr) {
    console.error('ERROR insertando en public.users:', insPubErr.message)
    process.exit(1)
  }
  console.log('✓ public.users insertado con rol=superadmin')
}

// ---------------------------------------------------------------------------
// 4. Verificación final
// ---------------------------------------------------------------------------

const { data: finalUser, error: finalErr } = await admin
  .from('users')
  .select(
    'id, email, rol, nombre, apellidos, municipality_id, municipalities!inner(slug)',
  )
  .eq('id', authUserId)
  .single()

if (finalErr || !finalUser) {
  console.error('ERROR en verificación final:', finalErr?.message)
  process.exit(1)
}

console.log('\n═══════════════════════════════════════════════════════')
console.log('  SUPERADMIN CREADO / VERIFICADO')
console.log('═══════════════════════════════════════════════════════')
console.log(`  Email:      ${finalUser.email}`)
if (PRINT_PASSWORD) {
  console.log(`  Password:   ${PASSWORD}`)
} else {
  console.log(`  Password:   [oculto — pasa --print-password para verlo]`)
}
console.log(`  Nombre:     ${finalUser.nombre} ${finalUser.apellidos}`)
console.log(`  Rol:        ${finalUser.rol}`)
console.log(`  Tenant:     ${finalUser.municipalities.slug}`)
console.log(`  User ID:    ${finalUser.id}`)
console.log('═══════════════════════════════════════════════════════')
console.log('\n  Pasos para entrar:')
console.log('  1. Ve a https://tecuida.group/login')
console.log(`  2. Email:    ${EMAIL}`)
console.log('  3. Password: (la que pasaste con --password o el default)')
console.log('  4. Después, navega a https://tecuida.group/admin/planes')
console.log('═══════════════════════════════════════════════════════\n')
