#!/usr/bin/env node
/**
 * Migración de Storage — pase GENERALIZADO.
 *
 * 1. Escanea TODAS las tablas/columnas del volcado buscando URLs de
 *    storage del proyecto viejo → extrae (bucket, ruta).
 * 2. Descarga cada objeto público del viejo y lo sube al nuevo
 *    (creando el bucket público si falta).
 * 3. Reescribe en la BD nueva toda celda que contenga el ref viejo.
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
const OLD_BASE = `https://${OLD_REF}.supabase.co/storage/v1/object/public/`

const dump = JSON.parse(readFileSync('migration-dump.json', 'utf8')).dump
const admin = createClient(env('NEW_SUPABASE_URL'), env('NEW_SUPABASE_SERVICE_ROLE_KEY'), {
  auth: { autoRefreshToken: false, persistSession: false },
})

// ── 1. Escaneo del volcado ──────────────────────────────────────────────
const objects = new Map() // bucket → Set(ruta)
const cellRefs = [] // { table, keyColumns, column, value }

// Clave de fila por tabla (para el UPDATE de reescritura).
function rowKey(table, row) {
  if (row.id) return { id: row.id }
  if (table === 'municipality_applications') {
    return { municipality_id: row.municipality_id, application_id: row.application_id }
  }
  return null
}

const URL_RE = new RegExp(
  `https://${OLD_REF}\\.supabase\\.co/storage/v1/object/public/([a-zA-Z0-9_-]+)/([^"'\\\\)\\s?]+)`,
  'g',
)

for (const [table, rows] of Object.entries(dump)) {
  if (!Array.isArray(rows)) continue
  for (const row of rows) {
    if (!row || typeof row !== 'object') continue
    const key = rowKey(table, row)
    if (!key) continue
    for (const [column, value] of Object.entries(row)) {
      if (typeof value !== 'string' || !value.includes(OLD_REF)) continue
      let matched = false
      for (const match of value.matchAll(URL_RE)) {
        const [, bucket, path] = match
        if (!objects.has(bucket)) objects.set(bucket, new Set())
        objects.get(bucket).add(decodeURIComponent(path))
        matched = true
      }
      if (matched) cellRefs.push({ table, keyColumns: key, column, value })
    }
  }
}

console.log('objetos detectados:')
for (const [bucket, paths] of objects) console.log(`  ${bucket}: ${paths.size} ficheros`)

// ── 2. Migración de objetos ────────────────────────────────────────────
const { data: buckets } = await admin.storage.listBuckets()
const existing = new Set((buckets || []).map((b) => b.name))

let uploaded = 0
const failures = []

for (const [bucket, paths] of objects) {
  if (!existing.has(bucket)) {
    const { error } = await admin.storage.createBucket(bucket, { public: true })
    if (error && !error.message.toLowerCase().includes('exist')) {
      throw new Error(`createBucket ${bucket}: ${error.message}`)
    }
    console.log('bucket creado:', bucket)
  }

  for (const path of [...paths].sort()) {
    const url = `${OLD_BASE}${bucket}/${path}`
    let res = await fetch(url)
    if (res.status === 400 || res.status === 404) {
      // Restauración desde source_url si existe registro en municipality_assets
      const asset = dump.municipality_assets?.find((a) => a.local_path === path)
      if (asset?.source_url) {
        let source
        for (let attempt = 0; attempt < 4; attempt += 1) {
          if (attempt > 0) await new Promise((r) => setTimeout(r, attempt * 15000))
          source = await fetch(asset.source_url, {
            headers: { 'user-agent': 'TECuidaMigration/1.0 (https://tecuida.group)' },
          })
          if (source.status !== 429) break
        }
        if (!source.ok) {
          failures.push({ bucket, path, step: 'source-download', status: source.status })
          continue
        }
        res = source
      } else {
        failures.push({ bucket, path, step: 'download', status: res.status })
        continue
      }
    }
    if (!res.ok) {
      failures.push({ bucket, path, step: 'download', status: res.status })
      continue
    }
    const body = await res.arrayBuffer()
    const contentType =
      res.headers.get('content-type') ||
      (path.endsWith('.svg') ? 'image/svg+xml' : 'image/jpeg')
    const { error } = await admin.storage.from(bucket).upload(path, body, {
      contentType,
      upsert: true,
    })
    if (error && !error.message.toLowerCase().includes('exists')) {
      failures.push({ bucket, path, step: 'upload', error: error.message })
      continue
    }
    uploaded += 1
    console.log(`migrado: ${bucket}/${path}`)
  }
}

// ── 3. Reescritura de URLs en la BD nueva ──────────────────────────────
let rewritten = 0
for (const { table, keyColumns, column, value } of cellRefs) {
  const next = value.split(OLD_REF).join(NEW_REF)
  if (next === value) continue
  let query = admin.from(table).update({ [column]: next })
  for (const [col, val] of Object.entries(keyColumns)) {
    query = query.eq(col, val)
  }
  const { error } = await query
  if (error) throw new Error(`rewrite ${table}.${column}: ${error.message}`)
  rewritten += 1
}

console.log(
  JSON.stringify(
    {
      celdas_reescritas: rewritten,
      ficheros: [...objects.values()].reduce((a, s) => a + s.size, 0),
      subidos: uploaded,
      fallos: failures,
    },
    null,
    2,
  ),
)
