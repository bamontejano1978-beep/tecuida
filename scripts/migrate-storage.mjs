#!/usr/bin/env node
/**
 * Migración de Storage: bucket `municipalities` del proyecto original
 * (dxxxhocqfuygngtxpuae) → te-cuida-prod (gdcvrwlffwzwrojorysw).
 *
 * 1. Lee del volcado las rutas referenciadas (municipalities.*_url y
 *    municipality_assets.local_path).
 * 2. Descarga cada fichero del proyecto viejo (bucket público).
 * 3. Crea el bucket en el nuevo si falta y sube los ficheros.
 * 4. Reescribe en la BD nueva las URLs que apuntaban al proyecto viejo.
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
const OLD_BASE = `https://${OLD_REF}.supabase.co/storage/v1/object/public/municipalities/`
const BUCKET = 'municipalities'

const dump = JSON.parse(readFileSync('migration-dump.json', 'utf8')).dump
const admin = createClient(env('NEW_SUPABASE_URL'), env('NEW_SUPABASE_SERVICE_ROLE_KEY'), {
  auth: { autoRefreshToken: false, persistSession: false },
})

const files = new Set()
for (const r of dump.municipalities) {
  for (const k of ['escudo_url', 'hero_image_url']) {
    const v = r[k]
    if (typeof v === 'string' && v.includes('/storage/v1/object/public/municipalities/')) {
      files.add(v.split('/storage/v1/object/public/municipalities/')[1].split('?')[0])
    }
  }
}
// OJO: municipality_assets.local_path son rutas de procedencia del ingest
// (ficheros locales del repo en su día), NO rutas del bucket: incluirlas
// produce 400 porque nunca existieron como objetos.

// 1. Bucket en el nuevo (público, como el original).
const { data: buckets } = await admin.storage.listBuckets()
if (!buckets?.some((b) => b.name === BUCKET)) {
  const { error } = await admin.storage.createBucket(BUCKET, { public: true })
  if (error && !error.message.includes('exists')) throw new Error(`createBucket: ${error.message}`)
  console.log('bucket creado:', BUCKET)
} else {
  console.log('bucket ya existía:', BUCKET)
}

// 2. Descargar del viejo y subir al nuevo.
let ok = 0
const failures = []
for (const path of [...files].sort()) {
  const res = await fetch(OLD_BASE + path)
  if (!res.ok) {
    failures.push({ path, step: 'download', status: res.status })
    continue
  }
  const body = await res.arrayBuffer()
  const contentType = res.headers.get('content-type') || 'application/octet-stream'
  const { error } = await admin.storage.from(BUCKET).upload(path, body, {
    contentType,
    upsert: true,
  })
  if (error) {
    failures.push({ path, step: 'upload', error: error.message })
    continue
  }
  ok += 1
  console.log('migrado:', path)
}

// 2b. Restaurar desde source_url (Wikimedia) los objetos que el proyecto
// viejo ya no tiene (404): el original los perdió en su día. Se sube la
// fuente a la ruta EXACTA que referencia la BD del municipio.
const assetsByMunicipality = new Map()
for (const r of dump.municipality_assets) {
  if (r.source_url) assetsByMunicipality.set(`${r.municipality_id}:${r.kind}`, r.source_url)
}
let restored = 0
for (const m of dump.municipalities) {
  for (const [k, kind] of [['hero_image_url', 'hero'], ['escudo_url', 'escudo']]) {
    const v = m[k]
    if (typeof v !== 'string' || !v.includes('/object/public/municipalities/')) continue
    const path = v.split('/object/public/municipalities/')[1].split('?')[0]
    const probe = await fetch(OLD_BASE + path)
    if (probe.ok) {
      probe.body?.cancel?.()
      continue // existe en el viejo: el paso 2 ya lo subió
    }
    const source = assetsByMunicipality.get(`${m.id}:${kind}`)
    if (!source) {
      failures.push({ path, step: 'restore', error: 'sin source_url' })
      continue
    }
    // Wikimedia limita la tasa (429): reintento con espera creciente y UA
    // identificativo (su política lo exige para descargas automatizadas).
    let res
    for (let attempt = 0; attempt < 4; attempt += 1) {
      if (attempt > 0) await new Promise((r) => setTimeout(r, attempt * 15000))
      res = await fetch(source, {
        headers: { 'user-agent': 'TECuidaMigration/1.0 (https://tecuida.group)' },
      })
      if (res.status !== 429) break
    }
    if (!res.ok) {
      failures.push({ path, step: 'restore-download', status: res.status })
      continue
    }
    const body = await res.arrayBuffer()
    const contentType = res.headers.get('content-type') || (path.endsWith('.svg') ? 'image/svg+xml' : 'image/jpeg')
    const { error } = await admin.storage.from(BUCKET).upload(path, body, {
      contentType,
      upsert: true,
    })
    if (error) failures.push({ path, step: 'restore-upload', error: error.message })
    else {
      restored += 1
      console.log('restaurado desde fuente:', path)
    }
  }
}

// 3. Reescribir URLs en la BD nueva.
let rewritten = 0
for (const r of dump.municipalities) {
  const patch = {}
  for (const k of ['escudo_url', 'hero_image_url']) {
    const v = r[k]
    if (typeof v === 'string' && v.includes(OLD_REF)) {
      patch[k] = v.replace(OLD_REF, 'gdcvrwlffwzwrojorysw')
    }
  }
  if (Object.keys(patch).length) {
    const { error } = await admin.from('municipalities').update(patch).eq('id', r.id)
    if (error) throw new Error(`rewrite ${r.id}: ${error.message}`)
    rewritten += 1
  }
}

console.log(JSON.stringify({ ficheros: files.size, subidos: ok, restaurados: restored, fallos: failures, municipios_reescritos: rewritten }, null, 2))
