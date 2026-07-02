#!/usr/bin/env node
/**
 * Script para gestionar administradores municipales (rol 'admin_municipio').
 *
 * Modos:
 *   1. Listar municipios:          node scripts/gestionar-admin-municipal.mjs --listar-municipios
 *   2. Listar usuarios (municipio): node scripts/gestionar-admin-municipal.mjs --municipio-id <uuid> --listar-usuarios
 *   3. Asignar rol:                 node scripts/gestionar-admin-municipal.mjs --municipio-id <uuid> --user-id <uuid> --hacer-gestor
 *   4. Quitar rol:                  node scripts/gestionar-admin-municipal.mjs --municipio-id <uuid> --user-id <uuid> --quitar-gestor
 *
 * Requisitos:
 *   - SUPABASE_SERVICE_ROLE_KEY en env, .env.local, o flag --service-key
 *   - NEXT_PUBLIC_SUPABASE_URL en env, .env.local, o flag --url
 *
 * Ejemplo rápido:
 *   # 1. Listar municipios para elegir uno
 *   node scripts/gestionar-admin-municipal.mjs --listar-municipios
 *
 *   # 2. Listar usuarios de ese municipio
 *   node scripts/gestionar-admin-municipal.mjs --municipio-id d290f1ee-... --listar-usuarios
 *
 *   # 3. Hacer gestor a un usuario
 *   node scripts/gestionar-admin-municipal.mjs --municipio-id d290f1ee-... --user-id abc123... --hacer-gestor
 *
 *   # 4. Verificar: ese usuario ya puede acceder a /municipio/estadisticas
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

// ---------------------------------------------------------------------------
// Helpers
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
function getArg(name) {
  const i = args.indexOf(`--${name}`)
  return i >= 0 ? args[i + 1] : undefined
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

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error(
    '\n❌ Faltan credenciales. Provee SUPABASE_SERVICE_ROLE_KEY y NEXT_PUBLIC_SUPABASE_URL.\n' +
    '   Opciones:\n' +
    '     - Tener un .env.local en la raíz del proyecto\n' +
    '     - Pasar --url <url> --service-key <key>\n' +
    '     - Setear las variables de entorno antes de ejecutar\n'
  )
  process.exit(1)
}

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// ---------------------------------------------------------------------------
// Acciones
// ---------------------------------------------------------------------------

async function listarMunicipios() {
  console.log('\n📋 Municipios disponibles:\n')

  const { data, error } = await admin
    .from('municipalities')
    .select('id, nombre_municipio, slug, estado_suscripcion')
    .eq('oculto_admin', false)
    .neq('slug', 'platform')
    .order('nombre_municipio', { ascending: true })

  if (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }

  if (!data || data.length === 0) {
    console.log('  (no hay municipios registrados)')
    return
  }

  for (const m of data) {
    console.log(`  ${m.nombre_municipio.padEnd(30)} │ slug: ${(m.slug || '').padEnd(20)} │ ${m.estado_suscripcion}`)
    console.log(`  ${''.padEnd(30)} │ id: ${m.id}`)
    console.log()
  }

  console.log(`Total: ${data.length} municipio(s)\n`)
  console.log('Para ver los usuarios de un municipio:')
  console.log('  node scripts/gestionar-admin-municipal.mjs --municipio-id <id> --listar-usuarios\n')
}

async function listarUsuarios(municipioId) {
  // Verificar que el municipio existe
  const { data: mun, error: munErr } = await admin
    .from('municipalities')
    .select('nombre_municipio, slug')
    .eq('id', municipioId)
    .single()

  if (munErr || !mun) {
    console.error('❌ Municipio no encontrado:', municipioId)
    process.exit(1)
  }

  console.log(`\n👥 Usuarios de ${mun.nombre_municipio} (${mun.slug}):\n`)

  const { data: users, error } = await admin
    .from('users')
    .select('id, email, alias, nombre, rol, created_at')
    .eq('municipality_id', municipioId)
    .order('created_at', { ascending: false })
    .limit(200)

  if (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }

  if (!users || users.length === 0) {
    console.log('  (no hay usuarios registrados en este municipio)\n')
    return
  }

  const gestores = users.filter((u) => u.rol === 'admin_municipio')
  const ciudadanos = users.filter((u) => u.rol === 'ciudadano')

  if (gestores.length > 0) {
    console.log('  ✅ GESTORES ACTUALES:')
    for (const u of gestores) {
      const name = u.alias || u.nombre || u.email.split('@')[0]
      console.log(`     ${name.padEnd(25)} │ ${u.email.padEnd(35)} │ id: ${u.id}`)
    }
    console.log()
  }

  console.log(`  👤 CIUDADANOS (${ciudadanos.length}):`)
  for (const u of ciudadanos.slice(0, 30)) {
    const name = u.alias || u.nombre || u.email.split('@')[0]
    console.log(`     ${name.padEnd(25)} │ ${u.email.padEnd(35)} │ id: ${u.id}`)
  }
  if (ciudadanos.length > 30) {
    console.log(`     ... y ${ciudadanos.length - 30} más`)
  }

  console.log(`\n  Total: ${users.length} usuario(s) — ${gestores.length} gestor(es), ${ciudadanos.length} ciudadano(s)\n`)

  if (ciudadanos.length > 0) {
    console.log('Para hacer gestor a un ciudadano:')
    console.log('  node scripts/gestionar-admin-municipal.mjs --municipio-id ' + municipioId + ' --user-id <user-id> --hacer-gestor\n')
  }
  if (gestores.length > 0) {
    console.log('Para quitar el rol de gestor:')
    console.log('  node scripts/gestionar-admin-municipal.mjs --municipio-id ' + municipioId + ' --user-id <user-id> --quitar-gestor\n')
  }
}

async function cambiarRol(municipioId, userId, nuevoRol) {
  const accion = nuevoRol === 'admin_municipio' ? 'HACER GESTOR' : 'QUITAR GESTOR'
  console.log(`\n🔧 ${accion}...`)

  // Verificar que el usuario existe y pertenece al municipio
  const { data: user, error: userErr } = await admin
    .from('users')
    .select('id, email, alias, nombre, rol, municipality_id')
    .eq('id', userId)
    .single()

  if (userErr || !user) {
    console.error('❌ Usuario no encontrado:', userId)
    process.exit(1)
  }

  if (user.municipality_id !== municipioId) {
    console.error('❌ El usuario no pertenece a este municipio.')
    console.error(`   Municipio del usuario: ${user.municipality_id}`)
    console.error(`   Municipio solicitado:  ${municipioId}`)
    process.exit(1)
  }

  if (user.rol === 'superadmin') {
    console.error('❌ No se puede cambiar el rol de un superadmin.')
    process.exit(1)
  }

  if (user.rol === nuevoRol) {
    console.log(`⚠️  El usuario ya tiene rol "${nuevoRol}". No se ha hecho ningún cambio.`)
    return
  }

  // Actualizar
  const { error: updateErr } = await admin
    .from('users')
    .update({ rol: nuevoRol })
    .eq('id', userId)

  if (updateErr) {
    console.error('❌ Error al actualizar:', updateErr.message)
    process.exit(1)
  }

  const name = user.alias || user.nombre || user.email.split('@')[0]
  const label = nuevoRol === 'admin_municipio' ? 'GESTOR MUNICIPAL' : 'CIUDADANO'

  console.log(`✅ ¡Listo! ${name} (${user.email}) ahora tiene rol "${label}".`)
  console.log(`   Ya puede acceder a /municipio/estadisticas para ver las métricas de su municipio.\n`)

  // Verificar el municipio
  const { data: mun } = await admin
    .from('municipalities')
    .select('nombre_municipio, slug')
    .eq('id', municipioId)
    .single()

  if (mun) {
    console.log(`   Municipio: ${mun.nombre_municipio} (${mun.slug})`)
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const municipioId = getArg('municipio-id')
const userId = getArg('user-id')
const hacerGestor = hasFlag('hacer-gestor')
const quitarGestor = hasFlag('quitar-gestor')

if (hasFlag('listar-municipios')) {
  await listarMunicipios()
} else if (municipioId && hasFlag('listar-usuarios')) {
  await listarUsuarios(municipioId)
} else if (municipioId && userId && hacerGestor) {
  await cambiarRol(municipioId, userId, 'admin_municipio')
} else if (municipioId && userId && quitarGestor) {
  await cambiarRol(municipioId, userId, 'ciudadano')
} else {
  console.log(`
📋 Gestión de Administradores Municipales — TE CUIDA
═══════════════════════════════════════════════════════

  USO:
    node scripts/gestionar-admin-municipal.mjs <flags>

  FLAGS:
    --listar-municipios                  Lista todos los municipios
    --municipio-id <uuid>                ID del municipio
    --listar-usuarios                    Lista usuarios del municipio
    --user-id <uuid>                     ID del usuario
    --hacer-gestor                       Asigna rol 'admin_municipio'
    --quitar-gestor                      Quita rol (vuelve a 'ciudadano')
    --url <url>                          URL de Supabase (si no está en .env.local)
    --service-key <key>                  Service role key (si no está en .env.local)

  FLUJO TÍPICO:
    1) node scripts/gestionar-admin-municipal.mjs --listar-municipios
    2) node scripts/gestionar-admin-municipal.mjs --municipio-id <id> --listar-usuarios
    3) node scripts/gestionar-admin-municipal.mjs --municipio-id <id> --user-id <id> --hacer-gestor

  El gestor ya podrá acceder a /municipio/estadisticas tras iniciar sesión.
`)
}
