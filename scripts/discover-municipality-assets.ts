/**
 * =============================================================================
 * scripts/discover-municipality-assets.ts  (DRY-RUN)
 * =============================================================================
 *
 * Descubre, valida y descarga assets gráficos (hero + escudo) para los 7
 * municipios extremeños desde Wikimedia Commons / Wikipedia. Diseñado como
 * paso previo a una migración que ingeste los assets verificados al bucket
 * `municipalities` de Supabase Storage y a la tabla `municipality_assets`
 * (creada en 019 + 020).
 *
 * Modo por defecto: DRY-RUN
 *   - SÍ descarga cada imagen localmente a `./tmp/assets/<slug>/<kind>.<ext>`.
 *   - NO sube a Supabase Storage (solo imprime qué habría subido).
 *   - NO escribe en la tabla `municipality_assets`.
 *   - SÍ emite `./tmp/assets/manifest.json` con el resumen completo
 *     (URLs verificadas, autor, licencia, attribution_line formateada,
 *     resolved_from, fetched_at).
 *
 * Ejecución:
 *
 *   npx --yes tsx scripts/discover-municipality-assets.ts
 *   npx --yes tsx scripts/discover-municipality-assets.ts --dry-run   # explícito
 *
 * Para una ingesta real (cuando se decida), este script será el motor de
 * generación del manifest que la migración 021 ingestará.
 *
 * Fuentes de los datos:
 *   - Wikipedia REST summary:
 *       https://es.wikipedia.org/api/rest_v1/page/summary/{title}
 *     Devuelve lead-image (`pageimage`, `originalimage.source`).
 *   - Commons API query imageinfo:
 *       https://commons.wikimedia.org/w/api.php?action=query&prop=imageinfo
 *       &iiprop=url|size|mime|extmetadata&titles=File:{filename}
 *     Devuelve URL final + extmetadata con Artist + LicenseShortName.
 *   - Commons API query categorymembers:
 *       https://commons.wikimedia.org/w/api.php?action=query&list=categorymembers
 *       &cmtitle=Category:Coats_of_arms_of_municipalities_of_Badajoz&cmtype=file
 *     Para fallback del escudo cuando los nombres de archivo no siguen
 *     la convención canónica.
 *
 * Política Wikimedia User-Agent:
 *   La API de Wikimedia requiere UA identificable (no genéricos como
 *   "node-fetch" o "*"). Si no se cumple, devuelve 403/429.
 * =============================================================================
 */

import { createWriteStream } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { Readable } from 'node:stream'
import { finished } from 'node:stream/promises'
import type { ReadableStream as NodeReadableStream } from 'node:stream/web'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// -----------------------------------------------------------------------------
// 1. CONFIGURACIÓN
// -----------------------------------------------------------------------------

/**
 * User-Agent identificable (política Wikimedia).
 * https://meta.wikimedia.org/wiki/User-Agent_policy
 */
const UA =
  'TeCuidaBot/1.0 (https://tecuida.group; admin@tecuida.group) scripts/discover-municipality-assets'

const WIKI_REST = 'https://es.wikipedia.org/api/rest_v1/page/summary/'
const COMMONS_API = 'https://commons.wikimedia.org/w/api.php'
const COATS_CATEGORY = 'Category:Coats_of_arms_of_municipalities_of_Badajoz'

/** Delay (ms) entre hits a Wikimedia para respetar rate-limit (≤10 req/s/IP). */
const RATE_LIMIT_MS = 1500

/** Raíz local de descarga (gitignored, role of ./tmp/). */
const LOCAL_ROOT = resolve(process.cwd(), 'tmp', 'assets')

/**
 * Inputs por municipio. `articleTitle` se usa en REST summary; `slug` se usa
 * como clave local + bucket path y debe coincidir con
 * public.municipalities.slug (definido en 008/014).
 */
const MUNICIPALITIES = [
  { slug: 'calamonte', articleTitle: 'Calamonte' },
  { slug: 'fuente-del-maestre', articleTitle: 'Fuente del Maestre' },
  {
    slug: 'jerez-de-los-caballeros',
    articleTitle: 'Jerez de los Caballeros',
  },
  { slug: 'llerena', articleTitle: 'Llerena' },
  {
    slug: 'los-santos-de-maimona',
    articleTitle: 'Los Santos de Maimona',
  },
  {
    slug: 'villafranca-de-los-barros',
    articleTitle: 'Villafranca de los Barros',
  },
  { slug: 'zafra', articleTitle: 'Zafra' },
] as const

type MunicipalityInput = (typeof MUNICIPALITIES)[number]

// -----------------------------------------------------------------------------
// 2. TIPOS
// -----------------------------------------------------------------------------

type AssetKind = 'hero' | 'escudo'

type ResolutionSource =
  | 'wikipedia_summary' // hero: aceptado directamente de REST summary
  | 'commons_filename' // escudo: match por nombre de archivo canónico
  | 'commons_categorymembers' // escudo: match en la categoría de heráldica
  | 'commons_search' // hero: fallback tras detectar bandera

/** Fila alineada 1-a-1 con las columnas de public.municipality_assets. */
interface AssetRow {
  /** municipality_id se omite en dry-run (se añadirá al INSERT en 021). */
  slug: string
  kind: AssetKind
  /** Ruta relativa dentro del bucket Supabase Storage `municipalities`. */
  local_path: string
  /** URL original upstream — verificada con imageinfo antes de aceptar. */
  source_url: string
  /** Autor extraído de extmetadata.Artist (HTML limpio). Vacío si anónimo/PD. */
  author: string
  /** Identificador corto de licencia desde extmetadata.LicenseShortName. */
  license: string
  /** Línea de crédito ya formateada bajo cumplimiento de la licencia. */
  attribution_line: string
  /** ISO 8601. Útil para programar refrescos futuros. */
  fetched_at: string
  /** Cómo se descubrió la URL — auditable para reproducibilidad. */
  resolved_from: ResolutionSource
  /**
   * Estado de la descarga local en dry-run. Reusable en --write para
   * distinguir lo que ya está en Supabase Storage de lo que no (la
   * migración 021 lo leerá antes del INSERT real).
   *  - 'downloaded': archivo en ./tmp/assets/<slug>/<kind>.<ext> existe.
   *  - 'download_failed': source_url verificada pero el archivo local
   *    NO se descargó (timeout/red/etc.). El operador debe reintentar o
   *    aceptar re-fetch en la ingesta real.
   */
  status: 'downloaded' | 'download_failed'
}

interface WikimediaImageInfo {
  url: string
  mime: string | null
  width: number | null
  height: number | null
  author: string
  license: string
  licenseUrl: string | null
  attributionLine: string
}

interface DiscoveredAssets {
  municipality: MunicipalityInput
  hero: AssetRow | null
  escudo: AssetRow | null
  /** Errores no fatales (municipio parcial, p.ej. escudo no encontrado). */
  warnings: string[]
}

interface ManifestAssetEntry {
  slug: string
  article_title: string
  hero: AssetRow | null
  escudo: AssetRow | null
  warnings: string[]
}

interface Manifest {
  schema_version: 1
  generated_at: string
  dry_run: true
  bucket_target: 'municipalities'
  usp_policy: string
  notice: string
  stats: { heroes_found: number; escudos_found: number; total: number }
  assets: ManifestAssetEntry[]
}

// -----------------------------------------------------------------------------
// 3. UTILIDADES HTTP / STREAM
// -----------------------------------------------------------------------------

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms))

async function fetchJSON<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    headers: {
      'User-Agent': UA,
      Accept: 'application/json',
    },
  })
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${res.statusText} -- ${url}`)
  }
  return (await res.json()) as T
}

/**
 * Detecta nombres de archivo "flag-like" usados por REST summary pageimage.
 * Cubre convenciones Commons español (Bandera_de_*) e internacional (Flag_of_*).
 */
function isFlagFilename(name: string): boolean {
  return /^(Flag_of_|Bandera_de_|Wapen_van_)/i.test(name)
}

/**
 * Limpia el HTML de extmetadata.Artist → texto plano. Commons suele envolver
 * el nombre en <a href="...">Real Name</a>; puede incluir [[wikilinks]].
 */
function extractPlainAuthor(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/\[\[|\]\]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function formatAttributionLine(
  author: string,
  license: string,
): string {
  const parts: string[] = []
  parts.push(author ? `${author}` : 'Imagen')
  parts.push(license)
  parts.push('vía Wikimedia Commons')
  return parts.join(', ')
}

/**
 * Descarga con fetch + Node stream (no buffer completo en memoria — soporta
 * imágenes grandes sin OOM). Node 20+ expone res.body como WebReadableStream,
 * convertible a Readable con Readable.fromWeb.
 */
async function downloadTo(localPath: string, url: string): Promise<void> {
  await mkdir(dirname(localPath), { recursive: true })
  const res = await fetch(url, { headers: { 'User-Agent': UA } })
  if (!res.ok || !res.body) {
    throw new Error(`Download failed ${res.status} ${res.statusText} -- ${url}`)
  }
  const fileStream = createWriteStream(localPath)
  // Casting correcto: Node 20 expone WebReadableStream en res.body.
  await finished(
    Readable.fromWeb(
      res.body as NodeReadableStream<Uint8Array>,
    ).pipe(fileStream),
  )
}

// -----------------------------------------------------------------------------
// 4. WIKIMEDIA API — RESUMEN E IMAGEINFO
// -----------------------------------------------------------------------------

interface EsWikiSummary {
  title: string
  thumbnail?: { source: string; width: number; height: number }
  originalimage?: { source: string; width: number; height: number }
  pageimage?: string // nombre canónico del File:; clave para detectar banderas
}

async function fetchRestSummary(articleTitle: string): Promise<EsWikiSummary> {
  const url = `${WIKI_REST}${encodeURIComponent(articleTitle)}`
  return await fetchJSON<EsWikiSummary>(url)
}

interface CommonsImageInfoResponse {
  query?: {
    pages?: Record<
      string,
      {
        pageid?: number
        title?: string
        imageinfo?: Array<{
          url: string
          thumburl?: string
          width?: number
          height?: number
          mime?: string
          extmetadata?: Record<string, { value: string }>
        }>
      }
    >
  }
}

async function fetchImageInfo(
  fileTitle: string,
): Promise<WikimediaImageInfo | null> {
  const url =
    `${COMMONS_API}?action=query&format=json` +
    `&prop=imageinfo&iiprop=url|size|mime|extmetadata` +
    `&titles=${encodeURIComponent(fileTitle)}`
  const data = await fetchJSON<CommonsImageInfoResponse>(url)
  const pages = data?.query?.pages ?? {}
  const firstKey = Object.keys(pages)[0]
  const page = firstKey ? pages[firstKey] : undefined
  if (!page?.imageinfo || page.imageinfo.length === 0) {
    return null
  }
  return normalizeImageInfo(page.imageinfo[0])
}

function normalizeImageInfo(raw: {
  url: string
  thumburl?: string
  width?: number
  height?: number
  mime?: string
  extmetadata?: Record<string, { value: string }>
}): WikimediaImageInfo {
  const ext = raw.extmetadata ?? {}
  const author = extractPlainAuthor(
    String(ext.Artist?.value ?? ''),
  )
  const license = String(ext.LicenseShortName?.value ?? 'Unknown').trim()
  const licenseUrl =
    String(ext.LicenseUrl?.value ?? '').trim() || null
  return {
    url: raw.url,
    mime: raw.mime ?? null,
    width: raw.width ?? null,
    height: raw.height ?? null,
    author,
    license,
    licenseUrl,
    attributionLine: formatAttributionLine(author, license),
  }
}

interface CommonsSearchResponse {
  query?: {
    search?: Array<{ title: string }>
  }
}

async function commonsSearch(query: string, limit = 8): Promise<string[]> {
  const url =
    `${COMMONS_API}?action=query&format=json` +
    `&list=search&srnamespace=6&srlimit=${limit}` +
    `&srsearch=${encodeURIComponent(query)}`
  const data = await fetchJSON<CommonsSearchResponse>(url)
  return (data?.query?.search ?? []).map((r) => r.title)
}

interface CommonsCategoryMembersResponse {
  query?: {
    categorymembers?: Array<{ title: string }>
  }
}

async function commonsCategoryMembers(
  categoryTitle: string,
  limit = 100,
): Promise<string[]> {
  const url =
    `${COMMONS_API}?action=query&format=json` +
    `&list=categorymembers&cmtitle=${encodeURIComponent(categoryTitle)}` +
    `&cmtype=file&cmlimit=${limit}`
  const data = await fetchJSON<CommonsCategoryMembersResponse>(url)
  return (data?.query?.categorymembers ?? []).map((r) => r.title)
}

// -----------------------------------------------------------------------------
// 5. DISCOVERY: HERO
// -----------------------------------------------------------------------------

async function discoverHero(
  m: MunicipalityInput,
): Promise<{ row: AssetRow | null; warnings: string[] }> {
  console.log(`\n[HERO] ${m.slug} (article: "${m.articleTitle}")`)
  const warnings: string[] = []

  // ----- Estrategia 1: REST summary directo -----
  try {
    const summary = await fetchRestSummary(m.articleTitle)
    const pageImage = summary.pageimage
    const originalSrc = summary.originalimage?.source

    if (pageImage && isFlagFilename(pageImage)) {
      const msg = `REST summary devolvió bandera (${pageImage}). Fallback a Commons search.`
      console.warn(`  [warn] ${msg}`)
      warnings.push(msg)
    } else if (!pageImage || !originalSrc) {
      const msg = 'REST summary sin pageimage/originalimage. Fallback a Commons search.'
      console.warn(`  [warn] ${msg}`)
      warnings.push(msg)
    } else {
      // Aceptar foto de Wikipedia directamente.
      const fileTitle = `File:${pageImage}`
      const info = await fetchImageInfo(fileTitle)
      if (info) {
        const row = await materializeAsset(m, 'hero', info, 'wikipedia_summary')
        return { row, warnings }
      }
      const msg = `imageinfo no resolvió ${fileTitle}. Fallback a Commons search.`
      console.warn(`  [warn] ${msg}`)
      warnings.push(msg)
    }
  } catch (err) {
    const msg = `REST summary falló: ${String((err as Error).message ?? err)}`
    console.error(`  [error] ${msg}`)
    warnings.push(msg)
  }

  // ----- Estrategia 2: fallback vía Commons search -----
  await sleep(RATE_LIMIT_MS)
  const row = await fallbackHeroFromCommons(m)
  if (row) {
    warnings.push(
      'Hero descubierto vía Commons search (REST summary devolvió bandera o falló).',
    )
  }
  return { row, warnings }
}

async function fallbackHeroFromCommons(
  m: MunicipalityInput,
): Promise<AssetRow | null> {
  const queries = [
    m.articleTitle,
    `${m.articleTitle} plaza`,
    `${m.articleTitle} panorámica`,
    `${m.articleTitle} panoramica`,
    `${m.articleTitle} vista`,
    `${m.articleTitle} casco`,
    `${m.articleTitle} panorama`,
  ]

  for (const q of queries) {
    console.log(`  [search] q="${q}"`)
    let hits: string[] = []
    try {
      hits = await commonsSearch(q, 8)
    } catch (err) {
      console.error(
        `  [error] commonsSearch("${q}") falló: ${String((err as Error).message ?? err)}`,
      )
      await sleep(RATE_LIMIT_MS)
      continue
    }
    for (const fileTitle of hits) {
      const basename = fileTitle.replace(/^File:/, '')
      if (isFlagFilename(basename) || /^Escudo/i.test(basename)) {
        continue
      }
      console.log(`  [try] ${fileTitle}`)
      try {
        const info = await fetchImageInfo(fileTitle)
        if (!info) continue
        return await materializeAsset(m, 'hero', info, 'commons_search')
      } catch (err) {
        console.error(
          `  [error] imageinfo falló para ${fileTitle}: ${String((err as Error).message ?? err)}`,
        )
      }
    }
    await sleep(RATE_LIMIT_MS)
  }

  console.warn(`  [fail] No hero encontrado para ${m.slug}.`)
  return null
}

// -----------------------------------------------------------------------------
// 6. DISCOVERY: ESCUDO
// -----------------------------------------------------------------------------

/**
 * Genera variantes razonables del nombre de archivo para el escudo oficial.
 * Cubre las convenciones observadas en Wikimedia Commons español:
 *   - "Escudo de <Nombre>.svg" (la más frecuente)
 *   - "Escudo de <Nombre> (Badajoz).svg" (con sufijo provincial)
 *   - "Escudo de <Nombre>.png" (raster)
 *   - "Escudo-de-<nombre-kebab>.svg" (kebab-case, ej. Zafra)
 *   - "Escudo_de_<Nombre>.svg" (underscore)
 *   - Sin "de": "Escudo <Nombre>.svg"
 */
function escudoFilenameCandidates(articleTitle: string): string[] {
  const baseVariants = [articleTitle, articleTitle.replace(/ /g, '_')]
  const out: string[] = []
  for (const base of baseVariants) {
    out.push(
      `Escudo de ${base}.svg`,
      `Escudo de ${base} (Badajoz).svg`,
      `Escudo de ${base}.png`,
      `Escudo de ${base}.jpg`,
      `Escudo-${base.replace(/ /g, '-')}.svg`,
      `Escudo_de_${base.replace(/ /g, '_')}.svg`,
      `Escudo ${base}.svg`,
    )
  }
  return Array.from(new Set(out))
}

async function discoverEscudo(
  m: MunicipalityInput,
): Promise<{ row: AssetRow | null; warnings: string[] }> {
  console.log(`\n[ESCUDO] ${m.slug}`)
  const warnings: string[] = []

  // ----- Estrategia 1: candidatos por nombre de archivo -----
  const candidates = escudoFilenameCandidates(m.articleTitle)
  for (const candidate of candidates) {
    const fileTitle = `File:${candidate.replace(/\s+/g, '_')}`
    console.log(`  [try] ${fileTitle}`)
    try {
      const info = await fetchImageInfo(fileTitle)
      if (info) {
        const row = await materializeAsset(m, 'escudo', info, 'commons_filename')
        return { row, warnings }
      }
    } catch (err) {
      console.error(
        `  [error] imageinfo falló para ${fileTitle}: ${String((err as Error).message ?? err)}`,
      )
    }
    await sleep(500)
  }

  // ----- Estrategia 2: categorymembers fallback -----
  await sleep(RATE_LIMIT_MS)
  console.log(`  [search] category="${COATS_CATEGORY}"`)
  try {
    const files = await commonsCategoryMembers(COATS_CATEGORY, 100)
    const matched = files.filter((t) =>
      new RegExp(
        `(?:^|[^a-zA-Z])${escapeRegex(m.articleTitle)}(?:[^a-zA-Z]|$)`,
        'i',
      ).test(t.replace(/^File:/, '')),
    )
    console.log(
      `  [info] category hit: ${matched.length} archivo(s) contienen "${m.articleTitle}"`,
    )
    for (const fileTitle of matched) {
      console.log(`  [try] ${fileTitle}`)
      try {
        const info = await fetchImageInfo(fileTitle)
        if (info) {
          const row = await materializeAsset(
            m,
            'escudo',
            info,
            'commons_categorymembers',
          )
          return { row, warnings }
        }
      } catch (err) {
        console.error(
          `  [error] imageinfo falló para ${fileTitle}: ${String((err as Error).message ?? err)}`,
        )
      }
    }
    const msg = `Escudo no encontrado en categoría ni por nombre canónico.`
    console.warn(`  [warn] ${msg}`)
    warnings.push(msg)
  } catch (err) {
    const msg = `commonsCategoryMembers falló: ${String((err as Error).message ?? err)}`
    console.error(`  [error] ${msg}`)
    warnings.push(msg)
  }

  console.warn(`  [fail] No escudo encontrado para ${m.slug}.`)
  return { row: null, warnings }
}

function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// -----------------------------------------------------------------------------
// 7. MATERIALIZACIÓN: DESCARGA LOCAL + MARCA DRY-RUN PARA SUBIDA
// -----------------------------------------------------------------------------

function extensionFor(mime: string | null): 'svg' | 'png' | 'jpg' {
  if (mime?.includes('svg')) return 'svg'
  if (mime?.includes('png')) return 'png'
  return 'jpg'
}

async function materializeAsset(
  m: MunicipalityInput,
  kind: AssetKind,
  info: WikimediaImageInfo,
  source: ResolutionSource,
): Promise<AssetRow> {
  const ext = extensionFor(info.mime)
  const localFilename = `${kind}.${ext}`
  const localDiskPath = resolve(LOCAL_ROOT, m.slug, localFilename)
  // Path relativo DENTRO del bucket 'municipalities' (sin prefijar el nombre
  // del bucket; la URL pública se construye como
  // `<supabase-url>/storage/v1/object/public/municipalities/<path>`).
  const bucketPath = `${m.slug}/${kind}.${ext}`

  // Descarga REAL (a disco local, no a Supabase) — útil para auditoría visual.
  // Capturamos status='downloaded'|'download_failed' según el outcome del
  // try/catch para que la AssetRow emitida sea fiel al estado real del
  // archivo en disco (la migración 021 ingesterá esto sin ambigüedad).
  let status: AssetRow['status']
  try {
    await downloadTo(localDiskPath, info.url)
    status = 'downloaded'
    console.log(
      `  [ok] ${kind} → ${bucketPath} (${info.mime ?? '?'} ${info.width ?? '?'}x${info.height ?? '?'}, license="${info.license}")`,
    )
    console.log(`        downloaded → ${localDiskPath}`)
  } catch (err) {
    // Si la descarga falla (p.ej. timeout, net error), aún así emitimos la
    // fila con source_url verificada pero status='download_failed' para que
    // el operador o la migración 021 distinga y decida reintentar el fetch.
    status = 'download_failed'
    console.error(
      `  [error] Descarga falló a ${localDiskPath}: ${String((err as Error).message ?? err)}`,
    )
    console.log(
      `  [partial] ${kind} → ${bucketPath} (sin archivo local, source_url verificada)`,
    )
  }

  // DRY-RUN: NO subir. Solo log.
  console.log(`  [DRY-RUN] Would upload → bucket=municipalities, path=${bucketPath}`)

  return {
    slug: m.slug,
    kind,
    local_path: bucketPath,
    source_url: info.url,
    author: info.author,
    license: info.license,
    attribution_line: info.attributionLine,
    fetched_at: new Date().toISOString(),
    resolved_from: source,
    status,
  }
}

// -----------------------------------------------------------------------------
// 8. MANIFEST
// -----------------------------------------------------------------------------

async function emitManifest(
  discovered: DiscoveredAssets[],
): Promise<{ manifestPath: string; stats: Manifest['stats'] }> {
  const heroesFound = discovered.filter((d) => d.hero !== null).length
  const escudosFound = discovered.filter((d) => d.escudo !== null).length

  const manifest: Manifest = {
    schema_version: 1,
    generated_at: new Date().toISOString(),
    dry_run: true,
    bucket_target: 'municipalities',
    usp_policy: UA,
    notice:
      'Assets descargados a ./tmp/assets/<slug>/{hero,escudo}.{ext}. ' +
      'Supabase Storage NO se tocó. NO se escribió en BD. ' +
      'Este manifest es input para la migración 021.',
    stats: {
      heroes_found: heroesFound,
      escudos_found: escudosFound,
      total: MUNICIPALITIES.length,
    },
    assets: discovered.map((d) => ({
      slug: d.municipality.slug,
      article_title: d.municipality.articleTitle,
      hero: d.hero,
      escudo: d.escudo,
      warnings: d.warnings,
    })),
  }

  const manifestPath = resolve(LOCAL_ROOT, 'manifest.json')
  await mkdir(LOCAL_ROOT, { recursive: true })
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2), 'utf8')

  console.log(`\n[MANIFEST] Wrote ${manifestPath}`)
  console.log(
    `[STATS] Heroes: ${heroesFound}/${MUNICIPALITIES.length}  ·  Escudos: ${escudosFound}/${MUNICIPALITIES.length}`,
  )
  console.log(`[STATS] ${MUNICIPALITIES.length - heroesFound} hero(s) y ${MUNICIPALITIES.length - escudosFound} escudo(s) pendientes.`)

  return { manifestPath, stats: manifest.stats }
}

// -----------------------------------------------------------------------------
// 9. ARGS + MAIN
// -----------------------------------------------------------------------------

function parseArgs(argv: string[]): { mode: 'dry-run' | 'write' } {
  const args = new Set(argv.slice(2))
  // Por defecto DRY-RUN. --write activa subida real a Supabase Storage +
  // UPSERT en public.municipality_assets + emisión de written.json.
  // Requisitos para --write: NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY
  // presentes en el entorno (carga .env.local desde cwd si está disponible).
  return {
    mode: args.has('--write') ? 'write' : 'dry-run',
  }
}

/**
 * --write: ingesta real a Supabase Storage + UPSERT a municipality_assets.
 * Idempotente: re-ejecutar con la misma bucket_path reescribe el archivo
 * (`upsert: true` en storage) y reemplaza la fila en BD (`onConflict:
 * municipality_id,kind`).
 *
 * Orden de operaciones:
 *   1. Verifica env vars; aborta con exit 2 si faltan.
 *   2. Resuelve slug→municipality_id vía SELECT a public.municipalities.
 *   3. Crea bucket `municipalities` si no existe (storage.createBucket).
 *   4. Para cada AssetRow con status='downloaded': upload + UPSERT.
 *   5. Emite written.json con todas las decisiones (uploaded/failed/skipped).
 */
async function runWrite(discovered: DiscoveredAssets[]): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    console.error(
      '[FATAL] --write requiere NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY.\n' +
        '        Carga .env.local desde el directorio del proyecto o expórtalas\n' +
        '        en el shell antes de `npx tsx scripts/discover-municipality-assets.ts --write`.',
    )
    process.exit(2)
  }

  const supabase = createSupabaseClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  console.log('\n[WRITE] Resolviendo municipality_id por slug...')
  const { data: munRows, error: munErr } = await supabase
    .from('municipalities')
    .select('id, slug')
    .in('slug', MUNICIPALITIES.map((m) => m.slug))
  if (munErr || !munRows) {
    console.error(
      `[FATAL] No se pudo resolver municipality_id: ${munErr?.message ?? 'unknown'}`,
    )
    process.exit(1)
  }
  const idBySlug = new Map(
    (munRows as Array<{ slug: string; id: string }>).map((r) => [r.slug, r.id]),
  )
  console.log(
    `        ${idBySlug.size}/${MUNICIPALITIES.length} municipios resueltos.`,
  )

  // Crear bucket si no existe. Si ya existe, la migración 021 también lo
  // habrá creado en SQL (idempotente: ON CONFLICT DO NOTHING). Si db push
  // no se ha corrido aún pero el bucket existe vía dashboard, lo respetamos.
  console.log('[WRITE] Verificando bucket "municipalities"...')
  const { data: existingBuckets } = await supabase.storage.listBuckets()
  if (!existingBuckets?.some((b) => b.name === 'municipalities')) {
    console.log('        creando bucket público...')
    const { error: bucketErr } = await supabase.storage.createBucket(
      'municipalities',
      {
        public: true,
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/svg+xml', 'image/webp'],
        fileSizeLimit: 5 * 1024 * 1024, // 5 MB
      },
    )
    if (bucketErr) {
      console.error(`[FATAL] No se pudo crear bucket: ${bucketErr.message}`)
      process.exit(1)
    }
    console.log('        bucket creado ✓')
  } else {
    console.log('        bucket ya existe ✓')
  }

  // Subir + UPSERT cada asset descargado.
  const written: Array<{
    slug: string
    kind: AssetKind
    bucket_path: string
    public_url: string
    municipality_id: string
    status: 'uploaded' | 'upload_failed' | 'skipped'
  }> = []

  for (const d of discovered) {
    for (const kind of ['hero', 'escudo'] as const) {
      const row = d[kind]
      const municipalityId = idBySlug.get(d.municipality.slug) ?? ''
      if (!row || !municipalityId) {
        written.push({
          slug: d.municipality.slug,
          kind,
          bucket_path: '',
          public_url: '',
          municipality_id: municipalityId,
          status: 'skipped',
        })
        if (!row) {
          console.warn(
            `  [skip] ${d.municipality.slug}/${kind}: row ausente (no encontrado en Wikimedia).`,
          )
        } else {
          console.error(
            `  [skip] ${d.municipality.slug}/${kind}: slug no estaba en municipalities.`,
          )
        }
        continue
      }

      const localDiskPath = resolve(
        LOCAL_ROOT,
        d.municipality.slug,
        `${kind}.${row.local_path.split('/').pop() ?? 'jpg'}`,
      )
      try {
        const fileBuffer = await readFile(localDiskPath)
        const { error: uploadErr } = await supabase.storage
          .from('municipalities')
          .upload(row.local_path, fileBuffer, {
            contentType: row.local_path.endsWith('.svg')
              ? 'image/svg+xml'
              : row.local_path.endsWith('.png')
                ? 'image/png'
                : 'image/jpeg',
            upsert: true,
          })
        if (uploadErr) throw new Error(`upload: ${uploadErr.message}`)

        const { data: pub } = supabase.storage
          .from('municipalities')
          .getPublicUrl(row.local_path)

        const { error: upsertErr } = await supabase
          .from('municipality_assets')
          .upsert(
            {
              municipality_id: municipalityId,
              kind,
              local_path: row.local_path,
              source_url: row.source_url,
              author: row.author,
              license: row.license,
              attribution_line: row.attribution_line,
              fetched_at: row.fetched_at,
            },
            { onConflict: 'municipality_id,kind' },
          )
        if (upsertErr) throw new Error(`upsert: ${upsertErr.message}`)

        written.push({
          slug: d.municipality.slug,
          kind,
          bucket_path: row.local_path,
          public_url: pub.publicUrl,
          municipality_id: municipalityId,
          status: 'uploaded',
        })
        console.log(`  [ok] ${d.municipality.slug}/${kind} → ${row.local_path}`)
        console.log(`        public: ${pub.publicUrl}`)
        await sleep(500)
      } catch (err) {
        written.push({
          slug: d.municipality.slug,
          kind,
          bucket_path: row.local_path,
          public_url: '',
          municipality_id: municipalityId,
          status: 'upload_failed',
        })
        console.error(
          `  [error] ${d.municipality.slug}/${kind}: ${String((err as Error).message ?? err)}`,
        )
      }
    }
  }

  // Emitir written.json con todas las decisiones + bucket base URL.
  const writtenPath = resolve(LOCAL_ROOT, 'written.json')
  await writeFile(
    writtenPath,
    JSON.stringify(
      {
        written_at: new Date().toISOString(),
        project_ref: 'dxxxhocqfuygngtxpuae',
        bucket: 'municipalities',
        bucket_base_url: `${url}/storage/v1/object/public/municipalities`,
        summary: {
          total: written.length,
          uploaded: written.filter((w) => w.status === 'uploaded').length,
          upload_failed: written.filter((w) => w.status === 'upload_failed').length,
          skipped: written.filter((w) => w.status === 'skipped').length,
        },
        written,
      },
      null,
      2,
    ),
    'utf8',
  )

  console.log(
    `\n[WRITE] ${written.filter((w) => w.status === 'uploaded').length}/${written.length} assets subidos + UPSERT en municipality_assets.`,
  )
  console.log(`[WRITE] Manifest escrito: ${writtenPath}`)
}

async function main(): Promise<void> {
  const { mode } = parseArgs(process.argv)
  console.log(`[BOOT] discover-municipality-assets.ts  mode=${mode}`)
  console.log(`[BOOT] Root local: ${LOCAL_ROOT}`)
  console.log(
    `[BOOT] Bucket destino: "municipalities" ${mode === 'dry-run' ? '(NO tocado en dry-run)' : '(será tocado en write)'}`,
  )
  console.log(`[BOOT] MUNICIPALITIES: ${MUNICIPALITIES.length}`)

  const discovered: DiscoveredAssets[] = []

  for (const m of MUNICIPALITIES) {
    const heroResult = await discoverHero(m)
    await sleep(RATE_LIMIT_MS)
    const escudoResult = await discoverEscudo(m)
    await sleep(RATE_LIMIT_MS)
    discovered.push({
      municipality: m,
      hero: heroResult.row,
      escudo: escudoResult.row,
      warnings: [...heroResult.warnings, ...escudoResult.warnings],
    })
  }

  const { stats, manifestPath } = await emitManifest(discovered)

  console.log(`\n[DONE] Manifest: ${manifestPath}`)
  console.log(
    `[DONE] ${stats.heroes_found}/${stats.total} heroes, ${stats.escudos_found}/${stats.total} escudos.`,
  )

  // Bifurcar entre dry-run (fin) y write (ingesta Supabase).
  if (mode === 'write') {
    await runWrite(discovered)
  } else {
    console.log(
      '\n[INFO] Dry-run sin Supabase. Para ingestar:\n' +
        '       npx tsx scripts/discover-municipality-assets.ts --write',
    )
  }

  // Si todo OK: exit 0. Si falta algo pero al menos hubo progreso: exit 0 también
  // (el operador decidirá el siguiente paso). Solo exit 1 en crash técnico arriba.
}

main().catch((err: unknown) => {
  console.error('\n[FATAL]', err)
  process.exit(1)
})
