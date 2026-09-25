// ============================================================================
// Captura de pantallazos reales por aplicación — VCA TE CUIDA
// Uso:  node scripts/capture-app-screenshots.mjs
// Salida: ../dossiers/shots/<slug>-desktop.png y <slug>-mobile.png
// ============================================================================
import { chromium } from 'playwright-core'
import { spawn } from 'child_process'
import dns from 'dns/promises'
import fs from 'fs'
import http from 'http'
import net from 'net'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const OUT = path.join(ROOT, 'dossiers', 'shots')
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true })

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const APPS_ROOT = path.resolve(ROOT, '..')

const wait = (ms) => new Promise((r) => setTimeout(r, ms))

function getFreePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer()
    srv.unref()
    srv.on('error', reject)
    srv.listen(0, '127.0.0.1', () => {
      const port = srv.address().port
      srv.close(() => resolve(port))
    })
  })
}

function waitUntilReady(url, timeoutMs = 90000) {
  const started = Date.now()
  return new Promise((resolve, reject) => {
    const tryOnce = () => {
      const req = http.get(url, (res) => {
        res.resume()
        if (res.statusCode && res.statusCode < 500) return resolve(res.statusCode)
        retry()
      })
      req.on('error', retry)
    }
    const retry = () => {
      if (Date.now() - started > timeoutMs) return reject(new Error('timeout esperando ' + url))
      setTimeout(tryOnce, 700)
    }
    tryOnce()
  })
}

async function startViteApp(appDir) {
  const port = await getFreePort()
  const child = spawn('npm', ['run', 'dev', '--', '--port', String(port), '--host', '127.0.0.1', '--strictPort'], {
    cwd: appDir,
    shell: true,
    stdio: 'ignore',
    windowsHide: true,
  })
  try {
    await waitUntilReady(`http://127.0.0.1:${port}/`)
    return { child, url: `http://127.0.0.1:${port}/`, stop: () => stopTree(child) }
  } catch (e) {
    stopTree(child)
    throw e
  }
}

function stopTree(child) {
  try {
    if (process.platform === 'win32') {
      spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], { shell: true, windowsHide: true })
    } else {
      child.kill('SIGTERM')
    }
  } catch { /* noop */ }
}

// ---------------------------------------------------------------------------
// Destinos de captura
// ---------------------------------------------------------------------------
const targets = [
  { slug: 'reto30', nombre: 'Reto30', local: path.join(APPS_ROOT, 'apps', 'reto30-pwa') },
  { slug: 'm30-adolescentes', nombre: 'Mindful30 Adolescentes', local: path.join(APPS_ROOT, 'apps', 'mindful30-adolescentes') },
  { slug: 'm30-cuidadores', nombre: 'Mindful30 Cuidadores', local: path.join(APPS_ROOT, 'apps', 'mindful30-cuidadores') },
  { slug: 'm30-infancia', nombre: 'Mindful30 Infancia', remote: 'https://mindful30-infancia.web.app/app' },
  { slug: 'familia', nombre: 'Economía Familiar', remote: 'GATEWAY:/apps/family-gamification' },
  { slug: 'focus', nombre: 'Focus Family', remote: 'https://organizatron-nine.vercel.app' },
  { slug: 'salud', nombre: 'Salud Adolescente', remote: 'https://salud-adolescentes.vercel.app' },
  { slug: 'levelup', nombre: 'Level Up Juntos', local: path.join(APPS_ROOT, 'apps', 'retoigualdad') },
]

// Resuelve el gateway municipal de producción (Villafranca) mapeando el host
// a la IP de tecuida.group, para que el subdominio funcione sin DNS público.
let gatewayUrl = null
let resolverRules = []
try {
  const ip = (await dns.lookup('tecuida.group', { family: 4 })).address
  const host = 'villafranca-de-los-barros.tecuida.group'
  resolverRules = [`--host-resolver-rules=MAP ${host} ${ip}`]
  gatewayUrl = `https://${host}`
  console.log(`Gateway: ${gatewayUrl} → ${ip}`)
} catch {
  gatewayUrl = 'https://tecuida.group'
  console.log('Gateway: sin mapeo DNS, usando https://tecuida.group')
}

const DESKTOP = { width: 1440, height: 900 }
const MOBILE = { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }

async function shoot(browserArgs, url, viewport, outPath) {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: browserArgs })
  try {
    const ctx = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height }, ...viewport })
    const page = await ctx.newPage()
    // 'load' puede no llegar nunca en dev (Vite compila al vuelo): esperamos DOM
    // y luego polled de contenido real hasta que body tenga texto.
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 })
    const started = Date.now()
    let text = 0
    while (Date.now() - started < 60000) {
      text = await page.evaluate(() => document.body?.innerText?.trim().length || 0).catch(() => 0)
      if (text > 40) break
      await wait(800)
    }
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {})
    await wait(1800) // fuentes, animaciones y render final
    await page.screenshot({ path: outPath })
    return text
  } finally {
    await browser.close()
  }
}

const onlyArg = process.argv.find((a) => a.startsWith('--only='))
const only = onlyArg ? onlyArg.split('=')[1].split(',').map((s) => s.trim()) : null
const selected = only ? targets.filter((t) => only.includes(t.slug)) : targets
if (only) console.log('Filtro --only:', only.join(', '))

const results = []
for (const t of selected) {
  let server = null
  let url = t.remote
  try {
    if (t.local) {
      server = await startViteApp(t.local)
      url = server.url
      console.log(`▸ ${t.nombre}: servidor dev en ${url}`)
    } else if (typeof t.remote === 'string' && t.remote.startsWith('GATEWAY:')) {
      url = gatewayUrl + t.remote.slice('GATEWAY:'.length)
    }

    const dOut = path.join(OUT, `${t.slug}-desktop.png`)
    const mOut = path.join(OUT, `${t.slug}-mobile.png`)

    const dText = await shoot(resolverRules, url, DESKTOP, dOut)
    const mText = await shoot(resolverRules, url, MOBILE, mOut)

    const dKb = Math.round(fs.statSync(dOut).size / 1024)
    const mKb = Math.round(fs.statSync(mOut).size / 1024)
    const suspicious = dText < 30 || mText < 30
    console.log(`  ✓ ${t.slug}: desktop ${dKb}KB (texto:${dText}) · móvil ${mKb}KB (texto:${mText})${suspicious ? '  ⚠ POSIBLE PANTALLA VACÍA' : ''}`)
    results.push({ slug: t.slug, ok: true, suspicious, dText, mText })
  } catch (e) {
    console.log(`  ✗ ${t.nombre}: ${e.message}`)
    results.push({ slug: t.slug, ok: false, error: e.message })
  } finally {
    if (server) server.stop()
    await wait(500)
  }
}

const bad = results.filter((r) => !r.ok || r.suspicious)
console.log(`\nListo: ${results.filter((r) => r.ok).length}/${results.length} capturas en ${OUT}`)
if (bad.length) {
  console.log('Revisar:', bad.map((b) => b.slug + (b.error ? ` (${b.error})` : ' (posible pantalla vacía)')).join(', '))
  process.exitCode = 2
}
