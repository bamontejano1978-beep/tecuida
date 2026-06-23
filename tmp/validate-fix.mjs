/**
 * validate-fix.mjs — Validación read-only del fix del 404
 *
 * Simula la lógica de:
 *   - src/app/app/[id]/page.tsx
 *   - src/app/apps/[appSlug]/page.tsx
 *
 * Para cada aplicación del catálogo, ejecuta el mismo lookup que
 * hace la página en producción (Supabase service_role_key,
 * ANY / applications → LEFT JOIN programmes vía application_id).
 *
 * Clasifica cada app en:
 *   ✅ RENDERS      → renderiza algo (program player o Generic Landing fallback)
 *   ◯  RENDERS_FALLBACK  → antes daba 404, ahora renderiza GenericLanding (FIX)
 *   ❌ STILL_404    → tipo='programa' SIN programa Y SIN url_acceso (no se puede renderizar nada útil)
 *
 * Sólo hace SELECTs. No escribe nada.
 *
 * Uso: node --env-file=.env.local tmp/validate-fix.mjs
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌ Faltan SUPABASE env vars. Usa: node --env-file=.env.local tmp/validate-fix.mjs')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// Resumen visual con caracteres
const C = {
  reset: '\x1b[0m', dim: '\x1b[2m', bold: '\x1b[1m',
  red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m', cyan: '\x1b[36m',
}

const pad = (s, n) => (s + ' '.repeat(n)).slice(0, n)

console.log(`${C.bold}=== VALIDACIÓN READ-ONLY DEL FIX 404 ===${C.reset}`)
console.log(`${C.dim}Conectado a:${C.reset} ${SUPABASE_URL}\n`)

// 1) Listar apps activas + asignadas a algún municipio (lo que ve el dashboard)
const { data: dbApps, error: appsErr } = await supabase
  .from('applications')
  .select('id, nombre, tipo, url_acceso, app_slug, activa')
  .eq('activa', true)
  .order('nombre')

if (appsErr) {
  console.error('❌ Error consultando applications:', appsErr.message)
  process.exit(1)
}
console.log(`📚 Aplicaciones activas en catálogo: ${dbApps.length}\n`)

const { data: dbMunicipalityApps, error: maErr } = await supabase
  .from('municipality_applications')
  .select('application_id, municipality_id, activa')
  .eq('activa', true)

if (maErr) {
  console.error('❌ Error consultando municipality_applications:', maErr.message)
  process.exit(1)
}

// 2) Cache programa_id por application_id (1 sola query)
const { data: dbPrograms, error: progErr } = await supabase
  .from('programs')
  .select('id, application_id')

if (progErr) {
  console.error('❌ Error consultando programs:', progErr.message)
  process.exit(1)
}
const programByApp = new Map(dbPrograms.map((p) => [p.application_id, p]))

// 3) Simular la lógica de las páginas
console.log(`${C.bold}── Simulación de /app/[id] (sin app_slug) ──${C.reset}`)
let total = 0
let rendersProgram = 0
let rendersFallback = 0 // antes 404, ahora GenericLanding
let still404 = 0 // sin programa Y sin url_acceso (no hay mucho que mostrar)
let viaSlug = 0

const appsByMuni = new Map(dbMunicipalityApps.map((m) => [m.application_id, m]))

const sample = []
for (const app of dbApps) {
  total++

  // ¿Está asignada a algún municipio?
  const assigned = appsByMuni.has(app.id)

  // El dashboard usa el slug si existe; si no, va a /app/[id]
  if (app.app_slug) {
    viaSlug++
    // apps/[appSlug]/page.tsx: misma lógica
    if (app.tipo !== 'programa') {
      sample.push({ app, assigned, verdict: 'render_generic', path: `https://${app.app_slug}.tecuida.group` })
    } else if (programByApp.has(app.id)) {
      rendersProgram++
      sample.push({ app, assigned, verdict: 'render_program', path: `https://${app.app_slug}.tecuida.group` })
    } else {
      // ✨ FIX aplicado aquí: antes era 404, ahora GenericLanding
      if (app.url_acceso) rendersFallback++
      else still404++
      sample.push({ app, assigned, verdict: app.url_acceso ? 'fallback_now_renders' : 'still_404', path: `https://${app.app_slug}.tecuida.group` })
    }
  } else {
    // /app/[id]/page.tsx
    if (app.tipo !== 'programa') {
      sample.push({ app, assigned, verdict: 'render_generic', path: `/app/${app.id}` })
    } else if (programByApp.has(app.id)) {
      rendersProgram++
      sample.push({ app, assigned, verdict: 'render_program', path: `/app/${app.id}` })
    } else {
      if (app.url_acceso) rendersFallback++
      else still404++
      sample.push({ app, assigned, verdict: app.url_acceso ? 'fallback_now_renders' : 'still_404', path: `/app/${app.id}` })
    }
  }
}

// Imprimir tabla
console.log(
  pad('TIPO', 6),
  pad('URL_EXT?', 8),
  pad('PROG?', 6),
  pad('ACTIVA_EN_MUNI?', 16),
  pad('VEREDICTO', 28),
  'NOMBRE',
)
console.log('-'.repeat(110))
for (const row of sample) {
  const tipo = pad(row.app.tipo, 6)
  const hasUrl = pad(row.app.url_acceso ? 'sí' : 'no', 8)
  const hasProg = pad(programByApp.has(row.app.id) ? 'sí' : 'no', 6)
  const assigned = pad(row.assigned ? 'sí' : 'no', 16)
  let verdictStr, col
  if (row.verdict === 'render_program') {
    verdictStr = '✅ render programa'
    col = C.green
  } else if (row.verdict === 'render_generic') {
    verdictStr = '✅ render GenericLanding'
    col = C.cyan
  } else if (row.verdict === 'fallback_now_renders') {
    verdictStr = '✨ FIX: antes 404 → GenericLanding'
    col = C.yellow
  } else {
    verdictStr = '❌ aún 404 (sin recurso)'
    col = C.red
  }
  console.log(tipo, hasUrl, hasProg, assigned, col + pad(verdictStr, 28) + C.reset, row.app.nombre)
}

console.log('\n' + C.bold + '── RESUMEN ──' + C.reset)
console.log(`Total apps activas en catálogo:           ${total}`)
console.log(`  · Con app_slug → ruta subdominio:      ${viaSlug}`)
console.log(`  · Renderizan programa (contenido):     ${C.green}${rendersProgram}${C.reset}`)
console.log(`  · Renderizan GenericLanding (no prog): ${C.cyan}${total - rendersProgram - still404}${C.reset}`)
console.log(`  · ${C.yellow}Aplican FIX${C.reset} (antes 404 → ahora GenericLanding): ${rendersFallback}`)
console.log(`  · Sin programa + sin url_acceso:        ${C.red}${still404}${C.reset}  (estos eran 404 antes; siguen 404 pero ahora conscientemente)`)

if (rendersFallback > 0) {
  console.log(`\n${C.green}${C.bold}🎉 ${rendersFallback} aplicación(es) que antes daban 404 ahora renderizan correctamente.${C.reset}`)
} else {
  console.log(`\n${C.cyan}ℹ️  Ningún app en tu BD activa actualmente encaja en el escenario buggy.${C.reset}`)
  console.log(`   Para reproducir el fix, crea una nueva app con tipo='programa' por defecto`)
  console.log(`   y url_acceso set (sin subir ZIP ni dejar app_slug) — antes daba 404.`)
}

console.log(`\n${C.dim}Esta validación fue READ-ONLY (solo SELECTs). No se modificó nada en la BD.${C.reset}\n`)
