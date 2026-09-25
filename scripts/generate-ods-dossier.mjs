// ============================================================================
// Dossier del Programa ODS de Villafranca — VCA TE CUIDA
// Uso:  node scripts/generate-ods-dossier.mjs
// Salida: ../dossiers/Dossier_Programa_ODS_Villafranca.{html,pdf}
// ============================================================================
import { chromium } from 'playwright-core'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const OUT = path.join(ROOT, 'dossiers')
const SHOTS = path.join(OUT, 'shots')

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const PORTAL = 'villafranca-de-los-barros.tecuida.group'
const FECHA = 'Septiembre 2026'
const BRAND = '#14b8a6'
const DARK = '#0f172a'

const dataUri = (p) => {
  try {
    return 'data:image/png;base64,' + fs.readFileSync(p).toString('base64')
  } catch {
    return null
  }
}

const IMG = {
  landingD: dataUri(path.join(SHOTS, 'ods-landing-desktop.png')),
  landingM: dataUri(path.join(SHOTS, 'ods-landing-mobile.png')),
  login: dataUri(path.join(SHOTS, 'ods-login-desktop.png')),
}

const APPS = [
  ['Reto30', 'Programa de 30 días: reflexión, actividad y relaciones'],
  ['Mindful30 Adolescentes', 'Calma y foco para chavales de 12 a 17 años'],
  ['Mindful30 Cuidadores', 'Autocuidado real para quienes cuidan'],
  ['Mindful30 Infancia', 'Calma, vínculo y juego consciente en familia'],
  ['Economía Familiar', 'Misiones, monedas y recompensas para el hogar'],
  ['Focus Family', 'Organización y estudio para adolescentes y familias'],
  ['Salud Adolescente', 'Retos de hábitos saludables y bienestar digital'],
  ['Level Up Juntos', 'Reto de 30 días para la igualdad'],
]

const page = (cls, inner) => `<section class="page ${cls}">${inner}</section>`
const head = (title) => `<div class="sec-head"><div class="sec-bar" style="background:${BRAND}"></div><h2>${title}</h2></div>`
const chead = (cat) => `
  <header class="chead">
    <div class="chead-left"><div class="chead-mono" style="background:${BRAND}">ODS</div>
      <div><div class="chead-name">Programa ODS</div><div class="chead-cat">${cat}</div></div></div>
    <div class="chead-brand">VCA TE CUIDA</div>
  </header>`
const foot = (left) => `<footer class="foot"><span>${left}</span><span>VCA TE CUIDA · Ayuntamiento de Villafranca de los Barros</span></footer>`

// ---------------------------------------------------------------------------
const cover = page('cover', `
  <div class="cover-band" style="background:linear-gradient(135deg, ${DARK} 0%, ${DARK} 58%, ${BRAND} 150%)">
    <div class="cover-top">
      <div class="cover-brand">VCA&nbsp;TE&nbsp;CUIDA</div>
      <div class="cover-sub">Dossier del programa</div>
    </div>
    <div class="cover-center">
      <div class="cover-kicker" style="color:#5eead4">Agenda 2030 · Participación ciudadana · Retorno útil</div>
      <h1 class="cover-title">Programa ODS<br>Villafranca te cuida 2030</h1>
      <p class="cover-tagline">“Una idea para mejorar Villafranca.<br>Un recurso para cuidarte a ti.”</p>
    </div>
    <div class="cover-bottom">
      <div class="cover-meta"><span>Ayuntamiento de Villafranca de los Barros</span><span>${FECHA}</span></div>
      <div class="cover-url">${PORTAL}</div>
    </div>
  </div>`)

const p1 = page('', `
  ${chead('Qué es y cómo funciona')}
  ${head('1 · Qué es el programa ODS')}
  <p class="lead">El programa ODS conecta la <b>participación ciudadana</b> con el <b>cuidado personal</b>. VCA TE CUIDA se vincula a la Agenda 2030 y al retorno útil a la ciudadanía: no se paga por acceder, se <b>participa</b>. Cualquier persona puede aportar una idea para mejorar Villafranca dentro de uno de los 17 Objetivos de Desarrollo Sostenible y, como retorno, recibir acceso a un recurso digital de bienestar para sí misma o su familia.</p>
  <div class="grid3">
    <div class="kpi"><div class="kpi-n" style="color:${BRAND}">17</div><div class="kpi-l">objetivos ODS para inspirar tus ideas</div></div>
    <div class="kpi"><div class="kpi-n" style="color:${BRAND}">1</div><div class="kpi-l">tarjeta por persona y semana</div></div>
    <div class="kpi"><div class="kpi-n" style="color:${BRAND}">8</div><div class="kpi-l">aplicaciones para acumular acceso</div></div>
  </div>
  ${head('2 · Así funciona: el ciclo de la semana')}
  <ol class="steps">
    <li><span class="step-n" style="background:${BRAND}"></span><span><b>Elige tu ODS.</b> Escoge una de las 17 tarjetas de los Objetivos de Desarrollo Sostenible.</span></li>
    <li><span class="step-n" style="background:${BRAND}"></span><span><b>Escribe tu idea.</b> Responde a una pregunta sencilla: <i>“¿Qué harías para mejorar Villafranca en este objetivo?”</i> Y escribe tu correo electrónico en la tarjeta (no pedimos teléfono).</span></li>
    <li><span class="step-n" style="background:${BRAND}"></span><span><b>Deposita la tarjeta</b> en la urna ODS. Cada persona puede presentar una tarjeta por semana.</span></li>
    <li><span class="step-n" style="background:${BRAND}"></span><span><b>Revisión municipal.</b> Entre el lunes y el miércoles de la semana siguiente, el equipo revisa las participaciones y envía a cada correo un <b>código individual de acceso</b>.</span></li>
    <li><span class="step-n" style="background:${BRAND}"></span><span><b>Regístrate y activa.</b> Crea tu cuenta en ${PORTAL} con <b>el mismo correo</b> de la tarjeta e introduce tu código.</span></li>
    <li><span class="step-n" style="background:${BRAND}"></span><span><b>Elige tu aplicación.</b> Tu acceso queda activado al momento. La semana siguiente puedes volver a participar y sumar otra aplicación distinta.</span></li>
  </ol>
  ${foot('Programa ODS · Dossier informativo')}`)

const p2 = page('', `
  ${chead('Participación y catálogo')}
  ${head('3 · Participar suma: tu acceso se acumula')}
  <p class="lead-sm">El acceso se construye semana a semana. Una activación nueva por semana, siempre para una aplicación distinta, y todo queda en tu misma cuenta:</p>
  <div class="weeks">
    <div class="week"><div class="week-n" style="background:${BRAND}">Semana 1</div><div class="week-t">Participas con tu primera idea y eliges <b>Reto30</b>. Ya puedes empezar tu programa de 30 días.</div></div>
    <div class="week"><div class="week-n" style="background:${BRAND}">Semana 2</div><div class="week-t">Nueva idea, nueva tarjeta. Eliges <b>Mindful30 Infancia</b> para la familia: se suma a tu cuenta.</div></div>
    <div class="week"><div class="week-n" style="background:${BRAND}">Semana 3</div><div class="week-t">Otra propuesta. Eliges <b>Economía Familiar</b>: ya tienes tres recursos, y el catálogo sigue abierto.</div></div>
  </div>
  ${head('4 · El catálogo de recursos')}
  <p class="muted" style="padding:0 16mm">Ocho aplicaciones de bienestar, igualdad y convivencia. Cada una cuenta con su dossier individual.</p>
  <div class="applist">
    ${APPS.map(([n, d], i) => `<div class="app"><div class="app-n" style="background:${BRAND}">${String(i + 1).padStart(2, '0')}</div><div><div class="app-t">${n}</div><div class="app-d">${d}</div></div></div>`).join('')}
  </div>
  ${foot('Programa ODS · Dossier informativo')}`)

const shotsPage = page('', `
  ${chead('La plataforma en imágenes')}
  ${head('5 · La plataforma en imágenes')}
  <p class="muted" style="padding:0 16mm">Vistas reales del portal municipal: la landing de “Villafranca te cuida 2030” y el acceso de la ciudadanía.</p>
  <div class="shot-block"><img class="shot-d" src="${IMG.landingD}" alt="Landing de Villafranca te cuida 2030"></div>
  <div class="shot-cap" style="padding:1.5mm 16mm 0">Landing municipal — catálogo de aplicaciones y actualidad del programa</div>
  <div class="duo">
    <div class="duo-wide"><img class="shot-d" src="${IMG.login}" alt="Acceso ciudadano"><div class="shot-cap">Acceso y registro con el correo de la tarjeta</div></div>
    <div class="duo-narrow"><img class="shot-m" src="${IMG.landingM}" alt="Landing en móvil"><div class="shot-cap">En el móvil, instalable como app</div></div>
  </div>
  ${foot('Programa ODS · Dossier informativo')}`)

const p3 = page('', `
  ${chead('Confianza y garantías')}
  ${head('6 · Tus garantías')}
  <div class="grid2">
    <div class="feat"><div class="feat-icon" style="background:${BRAND}1a;border:1px solid ${BRAND}44">🎟️</div><div><div class="feat-t">Un solo uso, siempre individual</div><div class="feat-d">Cada código vale una activación y queda vinculado a la cuenta que lo usa: no se puede compartir ni reutilizar.</div></div></div>
    <div class="feat"><div class="feat-icon" style="background:${BRAND}1a;border:1px solid ${BRAND}44">📧</div><div><div class="feat-t">Vinculado a tu correo</div><div class="feat-d">El código solo se activa con el mismo correo al que fue enviado. Si hay una errata en la tarjeta, el equipo municipal puede corregirla antes del envío.</div></div></div>
    <div class="feat"><div class="feat-icon" style="background:${BRAND}1a;border:1px solid ${BRAND}44">🔒</div><div><div class="feat-t">No circulan libremente</div><div class="feat-d">Los códigos no se publican: solo el Ayuntamiento los envía, después de revisar cada participación. Así se asegura que el acceso llega a la ciudadanía local.</div></div></div>
    <div class="feat"><div class="feat-icon" style="background:${BRAND}1a;border:1px solid ${BRAND}44">⏳</div><div><div class="feat-t">Caducidad bajo control</div><div class="feat-d">Cada lote de códigos tiene fecha de caducidad, y el equipo municipal ve el estado de cada código: disponible, enviado, activado, caducado o revocado.</div></div></div>
    <div class="feat"><div class="feat-icon" style="background:${BRAND}1a;border:1px solid ${BRAND}44">🛑</div><div><div class="feat-t">Revocación inmediata</div><div class="feat-d">Si fuera necesario, cualquier código puede revocarse individualmente y su acceso queda retirado al momento.</div></div></div>
    <div class="feat"><div class="feat-icon" style="background:${BRAND}1a;border:1px solid ${BRAND}44">🛡️</div><div><div class="feat-t">Privacidad por diseño</div><div class="feat-d">Registro con el mínimo de datos, correos de destino cifrados en base de datos, protección de acceso por filas y apps que guardan el progreso en tu dispositivo.</div></div></div>
  </div>
  ${head('7 · Preguntas frecuentes')}
  <div class="faq">
    <div class="q">¿El programa cuesta dinero?</div><div class="a">No. No se paga por acceder: se participa. Tu idea para mejorar Villafranca es el “precio” del recurso.</div>
    <div class="q">¿Necesito dar mi teléfono?</div><div class="a">No. Solo se pide un correo electrónico, el mismo para recibir el código y crear la cuenta.</div>
    <div class="q">¿Puedo repetir la misma aplicación otra semana?</div><div class="a">No hace falta: cada semana puedes sumar una aplicación distinta hasta completar el catálogo. Tu cuenta acumula todo.</div>
    <div class="q">¿Qué pasa si escribo mal mi correo en la tarjeta?</div><div class="a">El equipo municipal puede corregir el destino antes del envío y reenviar el código si es necesario.</div>
    <div class="q">¿Puedo eliminar mi cuenta?</div><div class="a">Sí. Desde tu perfil puedes solicitar la eliminación de tu cuenta y sus datos en cualquier momento.</div>
  </div>
  ${foot('Programa ODS · Dossier informativo')}`)

const closePage = page('cover', `
  <div class="cover-band" style="background:linear-gradient(135deg, ${BRAND} -40%, ${DARK} 55%, ${DARK} 100%)">
    <div class="cover-top">
      <div class="cover-brand">VCA&nbsp;TE&nbsp;CUIDA</div>
      <div class="cover-sub">Programa ODS</div>
    </div>
    <div class="cover-center">
      <div class="cover-kicker" style="color:#5eead4">Empieza esta semana</div>
      <h1 class="cover-title" style="font-size:44pt">Una idea.<br>Un recurso.<br>Tu ciudad.</h1>
      <p class="cover-tagline">Recoge tu tarjeta ODS, escribe tu propuesta y déjala en la urna.<br>Tu código llegará a tu correo entre el lunes y el miércoles.</p>
    </div>
    <div class="cover-bottom">
      <div class="cover-meta"><span>Ayuntamiento de Villafranca de los Barros</span><span>Agenda 2030 · ${FECHA}</span></div>
      <div class="cover-url">${PORTAL}</div>
    </div>
  </div>`)

// ---------------------------------------------------------------------------
const CSS = `
@page { size: A4; margin: 0; }
* { margin:0; padding:0; box-sizing:border-box; }
html,body { -webkit-print-color-adjust:exact; print-color-adjust:exact; }
body { font-family:'Segoe UI','Helvetica Neue',Arial,sans-serif; color:#1e293b; font-size:10.5pt; line-height:1.5; }
.page { width:210mm; height:297mm; page-break-after:always; position:relative; overflow:hidden; background:#fff; display:flex; flex-direction:column; }
.page:last-child { page-break-after:auto; }

.cover-band { flex:1; color:#fff; display:flex; flex-direction:column; padding:16mm 16mm 12mm; }
.cover-top { display:flex; justify-content:space-between; align-items:baseline; }
.cover-brand { font-weight:800; letter-spacing:3px; font-size:14pt; }
.cover-sub { font-size:9.5pt; opacity:.75; letter-spacing:2px; text-transform:uppercase; }
.cover-center { flex:1; display:flex; flex-direction:column; justify-content:center; align-items:center; text-align:center; gap:6mm; }
.cover-kicker { font-size:10pt; letter-spacing:2px; text-transform:uppercase; }
.cover-title { font-size:38pt; line-height:1.08; font-weight:800; letter-spacing:-1px; }
.cover-tagline { font-size:13pt; opacity:.88; max-width:150mm; line-height:1.5; }
.cover-bottom { border-top:1px solid rgba(255,255,255,.22); padding-top:5mm; display:flex; justify-content:space-between; align-items:center; }
.cover-meta { display:flex; flex-direction:column; gap:1.5mm; font-size:9.5pt; opacity:.8; }
.cover-url { font-size:10.5pt; font-weight:600; letter-spacing:.5px; }

.chead { display:flex; justify-content:space-between; align-items:center; padding:12mm 16mm 0; }
.chead-left { display:flex; gap:4mm; align-items:center; }
.chead-mono { width:11mm; height:11mm; border-radius:3mm; color:#fff; font-weight:800; display:flex; align-items:center; justify-content:center; font-size:9.5pt; }
.chead-name { font-weight:700; font-size:12pt; }
.chead-cat { font-size:8.5pt; color:#64748b; text-transform:uppercase; letter-spacing:1px; }
.chead-brand { font-size:9pt; font-weight:800; letter-spacing:2.5px; color:#94a3b8; }

.sec-head { display:flex; align-items:center; gap:3.5mm; padding:8mm 16mm 3mm; }
.chead + .sec-head { padding-top:9mm; }
.sec-bar { width:4.5mm; height:7mm; border-radius:1.5mm; }
.sec-head h2 { font-size:15pt; color:#0f172a; letter-spacing:-.3px; }
.lead, .lead-sm { padding:0 16mm; margin-top:2.5mm; }
.lead { font-size:11pt; line-height:1.65; }
.lead-sm { font-size:10.5pt; line-height:1.6; }
.muted { color:#64748b; font-size:10pt; }

.grid3 { display:grid; grid-template-columns:1fr 1fr 1fr; gap:5mm; padding:3mm 16mm 0; }
.kpi { background:#f8fafc; border:1px solid #e2e8f0; border-radius:3mm; padding:5mm; text-align:center; }
.kpi-n { font-size:26pt; font-weight:800; }
.kpi-l { font-size:9pt; color:#64748b; margin-top:1mm; line-height:1.4; }

.steps { list-style:none; padding:3mm 16mm 0; display:flex; flex-direction:column; gap:3mm; counter-reset:step; }
.steps li { display:flex; gap:4mm; align-items:flex-start; font-size:10pt; line-height:1.5; }
.step-n { width:6.5mm; height:6.5mm; min-width:6.5mm; border-radius:50%; color:#fff; font-size:9pt; font-weight:700; display:flex; align-items:center; justify-content:center; margin-top:.6mm; }
.step-n::before { counter-increment:step; content:counter(step); }

.weeks { display:flex; flex-direction:column; gap:3.5mm; padding:3mm 16mm 0; }
.week { display:flex; gap:4mm; align-items:flex-start; background:#f8fafc; border:1px solid #e2e8f0; border-left:4px solid ${BRAND}; border-radius:2.5mm; padding:3.5mm 4mm; }
.week-n { color:#fff; font-weight:800; font-size:9.5pt; padding:1.8mm 3.5mm; border-radius:6mm; white-space:nowrap; }
.week-t { font-size:10pt; line-height:1.5; color:#334155; }

.applist { columns:2; column-gap:8mm; padding:3mm 16mm 0; }
.app { break-inside:avoid; display:flex; gap:3.5mm; align-items:flex-start; padding:2.6mm 0; border-bottom:1px dashed #e2e8f0; }
.app-n { color:#fff; font-weight:800; font-size:9pt; width:9mm; height:9mm; min-width:9mm; border-radius:2.5mm; display:flex; align-items:center; justify-content:center; }
.app-t { font-weight:700; font-size:10pt; color:#0f172a; }
.app-d { font-size:8.8pt; color:#64748b; line-height:1.4; margin-top:.5mm; }

.shot-block { padding:3mm 16mm 0; }
.shot-d { width:178mm; display:block; border-radius:2.5mm; border:1px solid #e2e8f0; box-shadow:0 2px 10px rgba(15,23,42,.08); }
.shot-cap { font-size:8.8pt; color:#64748b; }
.duo { display:flex; gap:6mm; padding:4mm 16mm 0; align-items:flex-start; }
.duo-wide { flex:1; }
.duo-wide .shot-d { width:100%; }
.duo-narrow { width:52mm; text-align:center; }
.shot-m { width:100%; display:block; border-radius:4mm; border:1px solid #e2e8f0; box-shadow:0 2px 10px rgba(15,23,42,.08); }
.duo .shot-cap { padding:1.5mm 0 0; }

.grid2 { display:grid; grid-template-columns:1fr 1fr; gap:4mm 6mm; padding:2mm 16mm 0; }
.feat { display:flex; gap:3.5mm; align-items:flex-start; background:#f8fafc; border:1px solid #e2e8f0; border-radius:3mm; padding:3.5mm 4mm; }
.feat-icon { width:9mm; height:9mm; min-width:9mm; border-radius:2.5mm; display:flex; align-items:center; justify-content:center; font-size:13pt; }
.feat-t { font-weight:700; font-size:10pt; color:#0f172a; }
.feat-d { font-size:8.8pt; color:#475569; line-height:1.45; margin-top:.8mm; }

.faq { padding:2mm 16mm 0; display:flex; flex-direction:column; gap:2.2mm; }
.q { font-weight:700; font-size:9.8pt; color:#0f172a; margin-top:1mm; }
.a { font-size:9.5pt; color:#475569; line-height:1.5; padding-left:4mm; border-left:2px solid #e2e8f0; }

.foot { margin-top:auto; padding:4mm 16mm 8mm; display:flex; justify-content:space-between; font-size:8.5pt; color:#94a3b8; border-top:1px solid #e2e8f0; }
`

const html = `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><title>Dossier Programa ODS — Villafranca te cuida 2030</title>
<style>${CSS}</style></head>
<body>
${cover}
${p1}
${p2}
${shotsPage}
${p3}
${closePage}
</body></html>`

fs.writeFileSync(path.join(OUT, 'Dossier_Programa_ODS_Villafranca.html'), html, 'utf8')

const missing = Object.entries(IMG).filter(([, v]) => !v).map(([k]) => k)
if (missing.length) console.warn(`⚠ Capturas ausentes: ${missing.join(', ')} (página de imágenes incompleta)`)

const browser = await chromium.launch({ executablePath: CHROME, headless: true })
try {
  const pg = await browser.newPage()
  await pg.goto('file:///' + path.join(OUT, 'Dossier_Programa_ODS_Villafranca.html').replace(/\\/g, '/'), { waitUntil: 'load' })
  await pg.pdf({
    path: path.join(OUT, 'Dossier_Programa_ODS_Villafranca.pdf'),
    format: 'A4',
    printBackground: true,
    margin: { top: 0, bottom: 0, left: 0, right: 0 },
  })
} finally {
  await browser.close()
}

const kb = Math.round(fs.statSync(path.join(OUT, 'Dossier_Programa_ODS_Villafranca.pdf')).size / 1024)
console.log(`✓ Dossier_Programa_ODS_Villafranca.pdf (${kb} KB)`)
