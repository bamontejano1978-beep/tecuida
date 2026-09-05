import assert from 'node:assert/strict'
import http from 'node:http'
import { spawn } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import { chromium } from '@playwright/test'

// Local API fixtures exercise real Next pages without production data or accounts.
const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const municipality = {
  id: id(1), slug: 'municipio-prueba', nombre_municipio: 'Tu municipio', nombre_ayuntamiento: 'Ayuntamiento de Tu municipio',
  dominio: 'municipio-prueba.tecuida.group', escudo_url: '/reto30-icon-192.png', logo_url: '', hero_image_url: '',
  estado_suscripcion: 'activa', oculto_admin: false, invite_codes_required: false, layout_variant: 'editorial',
  colores_corporativos: { primary: '#047857', secondary: '#be185d', accent: '#047857', background: '#ffffff', text: '#111827' },
  textos_institucionales: {}, modulos_activos: [], imagenes_municipio: [],
}
const apps = [
  { id: id(2), nombre: 'Reto30', app_slug: 'reto30', tipo: 'programa', thumbnail_url: '/reto30-icon-192.png', descripcion: 'Un programa de bienestar emocional para avanzar a tu ritmo.', launch_mode: 'native', url_acceso: null },
  { id: id(3), nombre: 'Economía Familiar', app_slug: 'family-gamification', tipo: 'herramienta', thumbnail_url: '/family-gamification-icon-192.png', descripcion: 'Organiza tareas, recompensas y hábitos en familia.', launch_mode: 'native', url_acceso: null },
  { id: id(4), nombre: 'Focus Family / Organizatron', app_slug: 'organizatron', tipo: 'herramienta', thumbnail_url: '/organizatron-icon-192.png', descripcion: 'Planifica el estudio y los tiempos de concentración.', launch_mode: 'redirect', url_acceso: 'https://organizatron-nine.vercel.app' },
].map((app) => ({ ...app, activa: true, category_id: id(8), app_provider: 'tecuida', brand_color: '#047857', categoria: { nombre: 'Bienestar' } }))
const state = new Map([[id(2), { user_id: id(9), application_id: id(2), favorite: true, last_opened_at: new Date().toISOString() }]])
const checks = []
const fixtureUser = { id: id(9), aud: 'authenticated', role: 'authenticated', email: 'prueba@example.test', app_metadata: {}, user_metadata: {} }
const errors = []
let next
let browser
let serverLog = ''
const api = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost')
  const parts = []
  for await (const part of req) parts.push(part)
  const body = parts.length ? JSON.parse(Buffer.concat(parts).toString()) : null
  res.setHeader('Content-Type', 'application/json')
  let rows = []
  if (url.pathname === '/auth/v1/user') { res.end(JSON.stringify(fixtureUser)); return }
  if (url.pathname.endsWith('/rpc/get_municipality_stats')) {
    res.end(JSON.stringify({ municipioId: municipality.id, municipioNombre: municipality.nombre_municipio, totalCiudadanos: 12, ciudadanosActivos: 8, appsActivas: apps.length, leccionesCompletadas: 20, appsUsage: [], monthlyActivity: [] })); return
  }
  if (url.pathname.endsWith('/rpc/set_application_favorite') || url.pathname.endsWith('/rpc/record_application_open')) {
    const item = state.get(body.p_application) || { user_id: id(9), application_id: body.p_application, favorite: false, last_opened_at: null }
    if ('p_favorite' in body) item.favorite = body.p_favorite
    else item.last_opened_at = new Date().toISOString()
    state.set(body.p_application, item)
    res.end('null'); return
  }
  if (url.pathname.endsWith('/rpc/municipality_application_journey')) rows = apps.map((app) => ({ application_id: app.id, nombre: app.nombre, views: 20, launches: 15, active_users: 8, visits_without_launch: 3 }))
  else if (url.pathname.endsWith('/municipalities')) rows = [municipality]
  else if (url.pathname.endsWith('/users')) rows = [{ ...fixtureUser, rol: 'superadmin', municipality_id: municipality.id, municipality, municipalities: municipality, alias: 'Persona de prueba', nombre: null, created_at: new Date().toISOString() }]
  else if (url.pathname.endsWith('/applications')) rows = apps.filter((app) => (!url.searchParams.has('app_slug') || url.searchParams.get('app_slug') === `eq.${app.app_slug}`) && (!url.searchParams.has('id') || url.searchParams.get('id') === `eq.${app.id}`))
  else if (url.pathname.endsWith('/municipality_applications')) rows = apps.filter((app) => !url.searchParams.has('application_id') || url.searchParams.get('application_id') === `eq.${app.id}`).map((app) => ({ application_id: app.id, municipality_id: municipality.id, application: app, municipality, activa: true, publication_status: 'publicada', thumbnail_url_override: null }))
  else if (url.pathname.endsWith('/user_application_state')) rows = [...state.values()]
  else if (url.pathname.endsWith('/categories')) rows = [{ id: id(8), nombre: 'Bienestar', orden: 1, activa: true }]
  else if (url.pathname.endsWith('/application_quality_checks')) {
    if (req.method === 'POST') { checks.splice(0, checks.length, ...checks.filter((item) => item.application_id !== body.application_id), body) }
    rows = checks
  }
  res.setHeader('Content-Range', `0-${Math.max(rows.length - 1, 0)}/${rows.length}`)
  res.end(req.method === 'HEAD' ? undefined : JSON.stringify(req.headers.accept?.includes('vnd.pgrst.object') ? rows[0] || null : rows))
})

try {
  await mkdir('tmp/citizen-verification/screens', { recursive: true })
  await new Promise((resolve) => api.listen(0, '127.0.0.1', resolve))
  const apiUrl = `http://127.0.0.1:${api.address().port}`
  const portFinder = http.createServer()
  await new Promise((resolve) => portFinder.listen(0, '127.0.0.1', resolve))
  const port = portFinder.address().port
  await new Promise((resolve) => portFinder.close(resolve))
  const baseUrl = `http://127.0.0.1:${port}`
  next = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev', '--hostname', '127.0.0.1', '--port', String(port)], {
    windowsHide: true, env: { ...process.env, DEMO_MODE: 'false', NEXT_PUBLIC_SUPABASE_URL: apiUrl, NEXT_PUBLIC_SUPABASE_ANON_KEY: 'local-fixture-anon', SUPABASE_SERVICE_ROLE_KEY: 'local-fixture-service' },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  next.stdout.on('data', (chunk) => { serverLog += chunk })
  next.stderr.on('data', (chunk) => { serverLog += chunk })
  for (let attempt = 0; attempt < 120; attempt++) {
    try { if ((await fetch(`${baseUrl}/login`)).ok) break } catch {}
    if (next.exitCode !== null) throw new Error('Next stopped before readiness')
    await new Promise((resolve) => setTimeout(resolve, 500))
  }
  console.log(`Local fixture server ready: ${baseUrl}`)
  browser = await chromium.launch({ headless: true })
  const expiry = Math.floor(Date.now() / 1000) + 3600
  const jwt = `${Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')}.${Buffer.from(JSON.stringify({ sub: id(9), exp: expiry, role: 'authenticated' })).toString('base64url')}.fixture-signature`
  const session = { access_token: jwt, refresh_token: 'fixture-refresh', token_type: 'bearer', expires_at: expiry, expires_in: 3600, user: fixtureUser }
  for (const [label, viewport] of [['desktop', { width: 1440, height: 1000 }], ['mobile', { width: 390, height: 844 }]]) {
    const context = await browser.newContext({ viewport })
    const page = await context.newPage()
    page.on('pageerror', (error) => errors.push(error.message))
    await page.goto(baseUrl)
    await page.getByRole('button', { name: 'Rechazar', exact: true }).click()
    await page.getByRole('heading', { name: 'Tu municipio', exact: true }).waitFor()
    await page.screenshot({ path: `tmp/citizen-verification/screens/${label}-directory.png`, fullPage: true })
    await page.goto(`${baseUrl}/?tenant=municipio-prueba`)
    await page.goto(`${baseUrl}/register`)
    await page.getByText('Tu municipio', { exact: true }).waitFor()
    assert.equal(await page.locator('#access_code').isVisible(), false)
    assert.ok((await context.cookies()).some((cookie) => cookie.name === 'tecuida_municipality'))
    await page.screenshot({ path: `tmp/citizen-verification/screens/${label}-register.png`, fullPage: true })
    await context.addCookies([{ name: 'sb-127-auth-token', value: JSON.stringify(session), url: baseUrl }])
    await page.goto(`${baseUrl}/dashboard/aplicaciones`)
    await page.getByRole('heading', { name: 'Reto30', exact: true }).waitFor()
    const favoriteButton = page.getByRole('button', { name: /favoritos: Economía Familiar/ })
    const before = await favoriteButton.getAttribute('aria-pressed')
    await favoriteButton.click()
    await page.waitForFunction((old) => document.querySelector('button[aria-label$="favoritos: Economía Familiar"]')?.getAttribute('aria-pressed') !== old, before)
    await page.reload()
    await page.getByRole('button', { name: /^Favoritas/ }).click()
    await page.getByRole('heading', { name: 'Reto30', exact: true }).waitFor()
    await page.getByRole('button', { name: /^Todas \d/ }).click()
    await page.screenshot({ path: `tmp/citizen-verification/screens/${label}-launcher.png`, fullPage: true })
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), false, `${label}: launcher overflow`)
    for (const route of ['/dashboard', '/admin/aplicaciones/calidad', `/municipio/estadisticas?municipio=${municipality.id}`]) {
      await page.goto(`${baseUrl}${route}`)
      await page.locator('h1').first().waitFor()
      if (route.includes('/calidad')) {
        await page.getByRole('button', { name: 'Revisar', exact: true }).first().click()
        await page.getByText('Sin incidencias detectadas', { exact: true }).first().waitFor()
      }
      await page.screenshot({ path: `tmp/citizen-verification/screens/${label}-${route.split('/').pop().split('?')[0]}.png`, fullPage: true })
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), false, `${label}: overflow on ${route}`)
    }
    await page.goto(`${baseUrl}/apps/organizatron/run`)
    await page.locator('iframe').waitFor()
    await page.frameLocator('iframe').getByText('Modo estudiante', { exact: true }).waitFor()
    await page.screenshot({ path: `tmp/citizen-verification/screens/${label}-external.png`, fullPage: true })
    await page.getByRole('link', { name: /Mis aplicaciones/ }).first().click()
    await page.getByRole('heading', { name: 'Mis aplicaciones', exact: true }).waitFor()
    await context.close()
    console.log(`${label}: directory, municipal registration, favorites, launcher, dashboard, quality, metrics and return navigation OK`)
  }
  assert.deepEqual(errors, [], 'Browser runtime errors')
} finally {
  await browser?.close()
  if (next) {
    // The Next dev worker handles SIGTERM; close the test process tree on Windows.
    if (process.platform === 'win32' && next.exitCode === null) {
      await new Promise((resolve) => { const stop = spawn('taskkill', ['/pid', String(next.pid), '/t', '/f'], { windowsHide: true, stdio: 'ignore' }); stop.on('close', resolve) })
    } else next.kill('SIGTERM')
  }
  await new Promise((resolve) => api.close(resolve))
  await writeFile('tmp/citizen-verification/server.log', serverLog)
}
