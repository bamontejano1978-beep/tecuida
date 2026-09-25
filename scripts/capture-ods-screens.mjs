// ============================================================================
// Captura de pantallazos reales del programa ODS — VCA TE CUIDA
// Uso:  node scripts/capture-ods-screens.mjs
// Salida: ../dossiers/shots/ods-*.png
// ============================================================================
import { chromium } from 'playwright-core'
import dns from 'dns/promises'
import fs from 'fs'
import net from 'net'
import http from 'http'
import path from 'path'
import { spawn } from 'child_process'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const OUT = path.join(ROOT, 'dossiers', 'shots')
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true })

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const HOSTNAME = 'villafranca-de-los-barros.tecuida.group'

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

function waitUntilReady(url, timeoutMs = 120000) {
  const started = Date.now()
  return new Promise((resolve, reject) => {
    const tryOnce = () => {
      const req = http.get(url, (res) => {
        res.resume() // drena el stream para liberar el socket
        res.on('error', retry)
        if (res.statusCode && res.statusCode < 500) return resolve(res.statusCode)
        retry()
      })
      req.on('error', retry)
    }
    const retry = () => {
      if (Date.now() - started > timeoutMs) return reject(new Error('timeout esperando ' + url))
      setTimeout(tryOnce, 1000)
    }
    tryOnce()
  })
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

// Por defecto, producción (contenido real de la BD: escudo, apps, textos).
// --local serviría el código actual, pero requiere credenciales reales en
// .env.local para que el tenant resuelva; si faltan, la landing renderiza
// un overlay de error y no sirve para el dossier.
let args = []
let BASE = 'https://villafranca-de-los-barros.tecuida.group'
let devServer = null
if (process.argv.includes('--local')) {
  const port = await getFreePort()
  devServer = spawn('npm', ['run', 'dev', '--', '--port', String(port), '--hostname', '127.0.0.1'], {
    cwd: ROOT, shell: true, stdio: 'ignore', windowsHide: true,
  })
  await waitUntilReady(`http://127.0.0.1:${port}/`)
  args = [`--host-resolver-rules=MAP ${HOSTNAME} 127.0.0.1:${port}`]
  BASE = `http://${HOSTNAME}:${port}`
  console.log(`Servidor local: ${BASE} (código actual; requiere credenciales reales)`)
} else {
  try {
    const ip = (await dns.lookup('tecuida.group', { family: 4 })).address
    args = [`--host-resolver-rules=MAP ${HOSTNAME} ${ip}`]
    console.log(`Host: ${HOSTNAME} → ${ip} (producción)`)
  } catch {
    console.log('Sin mapeo DNS; se usará la resolución normal')
  }
}
process.on('exit', () => { if (devServer) stopTree(devServer) })

const DESKTOP = { width: 1440, height: 900 }
const MOBILE = { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }

async function shoot(viewport, url, outPath) {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true, args })
  try {
    const ctx = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height }, ...viewport })
    const page = await ctx.newPage()
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 })
    const started = Date.now()
    let text = 0
    while (Date.now() - started < 45000) {
      text = await page.evaluate(() => document.body?.innerText?.trim().length || 0).catch(() => 0)
      if (text > 40) break
      await wait(800)
    }
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {})
    // Retira el aviso de cookies (banner fijo inferior) para una captura limpia
    await page.evaluate(() => {
      const nodes = document.querySelectorAll('div.fixed.bottom-0.inset-x-0, [class*="cookie" i], [class*="consent" i]')
      nodes.forEach((n) => n.remove())
    }).catch(() => {})
    await wait(2000)
    await page.screenshot({ path: outPath })
    return text
  } finally {
    await browser.close()
  }
}

const shots = [
  { file: 'ods-landing-desktop.png', url: BASE + '/', vp: DESKTOP, name: 'landing escritorio' },
  { file: 'ods-landing-mobile.png', url: BASE + '/', vp: MOBILE, name: 'landing móvil' },
  { file: 'ods-login-desktop.png', url: BASE + '/login', vp: DESKTOP, name: 'acceso ciudadano' },
]

const results = []
for (const s of shots) {
  let text = 0
  let lastErr = null
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      text = await shoot(s.vp, s.url, path.join(OUT, s.file))
      if (text >= 30) break
      console.log(`  ↻ intento ${attempt}: contenido insuficiente (texto:${text})`)
    } catch (e) {
      lastErr = e
      console.log(`  ↻ intento ${attempt}: ${e.message.split('\n')[0]}`)
    }
  }
  try {
    const kb = Math.round(fs.statSync(path.join(OUT, s.file)).size / 1024)
    const suspicious = text < 30
    console.log(`${suspicious ? '⚠' : '✓'} ${s.name}: ${kb}KB (texto:${text})${suspicious ? '  ⚠ POSIBLE PANTALLA VACÍA' : ''}`)
    results.push({ ok: !suspicious })
  } catch {
    console.log(`✗ ${s.name}: ${lastErr?.message || 'sin captura'}`)
    results.push({ ok: false })
  }
}

const okCount = results.filter((r) => r.ok).length
console.log(`\nListo: ${okCount}/${shots.length} pantallas en ${OUT}`)
if (devServer) stopTree(devServer)
if (okCount < shots.length) process.exitCode = 2
