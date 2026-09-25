#!/usr/bin/env node
/**
 * Reescritura profunda de URLs del proyecto viejo → nuevo, EN VIVO sobre
 * la BD nueva. Recorre TODAS las tablas de datos y TODOS los valores de
 * cada fila (strings simples y estructuras JSONB anidadas), y actualiza
 * las filas que aún contengan el ref antiguo.
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'

const envText = readFileSync('.env.production.local', 'utf8')
function env(name) {
  const m = envText.match(new RegExp(`^${name}=(.*)$`, 'm'))
  if (!m || !m[1]) throw new Error(`Falta ${name} en .env.production.local`)
  return m[1].replace(/^"|"$/g, '')
}

const OLD_REF = 'dxxxhocqfuygngtxpuae'
const NEW_REF = 'gdcvrwlffwzwrojorysw'

const admin = createClient(env('NEW_SUPABASE_URL'), env('NEW_SUPABASE_SERVICE_ROLE_KEY'), {
  auth: { autoRefreshToken: false, persistSession: false },
})

const TABLES = [
  'municipalities',
  'municipality_assets',
  'categories',
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

/** Reemplazo recursivo en strings (soporta objetos y arrays JSONB). */
function deepReplace(value) {
  if (typeof value === 'string') {
    return value.includes(OLD_REF) ? value.split(OLD_REF).join(NEW_REF) : value
  }
  if (Array.isArray(value)) {
    let changed = false
    const next = value.map((v) => {
      const r = deepReplace(v)
      if (r !== v) changed = true
      return r
    })
    return changed ? next : value
  }
  if (value && typeof value === 'object') {
    let changed = false
    const next = {}
    for (const [k, v] of Object.entries(value)) {
      const r = deepReplace(v)
      if (r !== v) changed = true
      next[k] = r
    }
    return changed ? next : value
  }
  return value
}

function rowKey(table, row) {
  if (row.id) return { id: row.id }
  if (table === 'municipality_applications') {
    return { municipality_id: row.municipality_id, application_id: row.application_id }
  }
  return null
}

let totalUpdated = 0
const perTable = {}

for (const table of TABLES) {
  const { data: rows, error } = await admin.from(table).select('*')
  if (error) throw new Error(`select ${table}: ${error.message}`)

  let updated = 0
  for (const row of rows || []) {
    const key = rowKey(table, row)
    if (!key) continue
    const patch = {}
    for (const [column, value] of Object.entries(row)) {
      if (value === null || value === undefined) continue
      const next = deepReplace(value)
      if (next !== value) patch[column] = next
    }
    if (!Object.keys(patch).length) continue

    let query = admin.from(table).update(patch)
    for (const [col, val] of Object.entries(key)) query = query.eq(col, val)
    const { error: upErr } = await query
    if (upErr) throw new Error(`update ${table}: ${upErr.message}`)
    updated += 1
  }
  if (updated) perTable[table] = updated
  totalUpdated += updated
}

console.log(JSON.stringify({ filas_actualizadas: totalUpdated, detalle: perTable }, null, 2))
