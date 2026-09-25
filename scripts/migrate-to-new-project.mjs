#!/usr/bin/env node
/**
 * Migración de datos: volcado del proyecto original → te-cuida-prod.
 *
 * Entrada:  migration-dump.json (generado por /api/migration-export).
 * Destino:  proyecto nuevo de Supabase, cuyas credenciales se leen de
 *           .env.production.local como NEW_SUPABASE_URL y
 *           NEW_SUPABASE_SERVICE_ROLE_KEY (sin tocar las variables reales).
 *
 * Orden de importación respetando claves ajenas:
 *   categories → municipalities → municipality_assets → applications →
 *   municipality_applications → programs → program_modules → lessons →
 *   achievements → professionals → users → activities →
 *   activity_inscriptions → surveys → survey_questions → survey_answers →
 *   user_progress → municipal_invite_batches → municipal_invite_codes →
 *   user_app_grants → municipal_manager_invitations →
 *   ods_weekly_participations → analytics_events
 *
 * Los usuarios de auth se recrean con su UUID original vía la RPC
 * import_legacy_user (migración 071): si el usuario ya existiera, se
 * omite. Las contraseñas no se migran (la API no expone hashes); cada
 * persona usará "recuperar contraseña" en el nuevo proyecto.
 *
 * Idempotencia: los INSERT usan ignoreDuplicates (ON CONFLICT DO
 * NOTHING), por lo que re-ejecutar el script no duplica filas.
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'

const envText = readFileSync('.env.production.local', 'utf8')
function env(name) {
  const m = envText.match(new RegExp(`^${name}=(.*)$`, 'm'))
  if (!m || !m[1]) throw new Error(`Falta ${name} en .env.production.local`)
  return m[1].replace(/^"|"$/g, '')
}

const NEW_URL = env('NEW_SUPABASE_URL')
const NEW_KEY = env('NEW_SUPABASE_SERVICE_ROLE_KEY')

const dump = JSON.parse(readFileSync('migration-dump.json', 'utf8')).dump

const admin = createClient(NEW_URL, NEW_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const TABLES = [
  'categories',
  'municipalities',
  'municipality_assets',
  'applications',
  'municipality_applications',
  'programs',
  'program_modules',
  'lessons',
  'achievements',
  'professionals',
  'users',
  'activities',
  'activity_inscriptions',
  'surveys',
  'survey_questions',
  'survey_answers',
  'user_progress',
  'municipal_invite_batches',
  'municipal_invite_codes',
  'user_app_grants',
  'municipal_manager_invitations',
  'ods_weekly_participations',
  'analytics_events',
]

// Clave de conflicto por tabla: todas usan `id` salvo la tabla de unión.
const CONFLICT_KEYS = {
  municipality_applications: 'municipality_id,application_id',
}

async function insertAll(table, rows) {
  let ok = 0
  for (let i = 0; i < rows.length; i += 200) {
    const chunk = rows.slice(i, i + 200)
    // Upsert idempotente y tolerante a filas ya existentes del sembrado.
    const { error } = await admin.from(table).upsert(chunk, {
      onConflict: CONFLICT_KEYS[table] || 'id',
      ignoreDuplicates: true,
    })
    if (error) throw new Error(`${table}: ${error.message}`)
    ok += chunk.length
  }
  return ok
}

async function importUsers(authUsers) {
  // Recrea cada usuario con su UUID original (GoTrue admin admite `id`;
  // verificado contra auth 2.19x). Las contraseñas no se migran: cada
  // persona usará el flujo de recuperación en el proyecto nuevo.
  let created = 0
  let existing = 0
  const failures = []
  for (const u of authUsers) {
    const { error } = await admin.auth.admin.createUser({
      id: u.id,
      email: u.email,
      email_confirm: Boolean(u.email_confirmed_at),
      user_metadata: u.user_metadata || {},
    })
    if (error) {
      const msg = error.message.toLowerCase()
      if (msg.includes('already') || msg.includes('duplicate') || msg.includes('exists')) {
        existing += 1
      } else {
        failures.push({ email: u.email, error: error.message })
      }
    } else {
      created += 1
    }
  }
  return { created, existing, failures }
}

/**
 * Limpieza previa: los seeds de las migraciones (008, 021, 037/038, 057…)
 * crearon filas con UUIDs que no coinciden con los de producción. El
 * volcado es el estado completo y vigente de producción, así que se
 * vacían las tablas de datos (orden inverso de dependencias) antes de
 * importar. auth.users no se toca: si ya se crearon, importUsers los
 * detecta como existentes.
 */
const WIPE_ORDER = [
  'analytics_events',
  'ods_weekly_participations',
  'user_app_grants',
  'municipal_invite_codes',
  'municipal_invite_batches',
  'municipal_manager_invitations',
  'user_progress',
  'survey_answers',
  'survey_questions',
  'surveys',
  'activity_inscriptions',
  'activities',
  'professionals',
  'users',
  'achievements',
  'lessons',
  'program_modules',
  'programs',
  'municipality_applications',
  'applications',
  'categories',
  'municipality_assets',
  'municipalities',
]

async function wipeAll() {
  const counts = {}
  for (const table of WIPE_ORDER) {
    // Filtro genérico "siempre verdadero" sobre la primera columna de la
    // clave (soporta tablas de unión sin columna id).
    const col = (CONFLICT_KEYS[table] || 'id').split(',')[0]
    const { count, error } = await admin
      .from(table)
      .delete({ count: 'exact' })
      .neq(col, '00000000-0000-0000-0000-000000000000')
    if (error) throw new Error(`wipe ${table}: ${error.message}`)
    counts[table] = count ?? 0
  }
  return counts
}

const counts = {}

counts.wiped = await wipeAll()

// 1. Usuarios de auth PRIMERO (public.users puede tener FK a auth.users).
counts.auth_users = await importUsers(dump.auth_users || [])

// 2. Tablas en orden de dependencias.
for (const table of TABLES) {
  const rows = Array.isArray(dump[table]) ? dump[table] : []
  counts[table] = await insertAll(table, rows)
}

// 3. Parches post-importación: el volcado procede del proyecto original,
//    que no tenía las migraciones 069/070. Se replican sus efectos a nivel
//    de datos (los guards en las funciones ya están en el esquema).

// 3a. Backfill proposito='ods' para municipios en modo grant (efecto 070).
{
  const { error } = await admin
    .from('municipal_invite_batches')
    .update({ proposito: 'ods' })
    .in(
      'municipality_id',
      (await admin
        .from('municipalities')
        .select('id')
        .eq('grant_mode', 'grant')).data?.map((r) => r.id) || [],
    )
  if (error) throw new Error(`backfill proposito: ${error.message}`)
}

// 3b. Registro sin código en Villafranca (efecto 069).
{
  const { error } = await admin
    .from('municipalities')
    .update({ invite_codes_required: false })
    .in('slug', ['villafranca-de-los-barros', 'villafrancadelosbarros'])
  if (error) throw new Error(`invite_codes_required: ${error.message}`)
}

counts.auth_users.failures = counts.auth_users.failures.length
console.log(JSON.stringify(counts, null, 2))
