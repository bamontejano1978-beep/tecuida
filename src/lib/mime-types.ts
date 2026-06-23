/**
 * Utilidad compartida para mapear extensiones de archivo → Content-Type.
 *
 * Usada por:
 *  - src/app/api/admin/applications/upload/route.ts  (subida a Supabase Storage)
 *  - src/app/a/[slug]/[[...path]]/route.ts            (servir apps subidas)
 */

/** Extensión (sin punto) → Content-Type */
const MIME_MAP: Record<string, string> = {
  html: 'text/html',
  htm: 'text/html',
  css: 'text/css',
  js: 'application/javascript',
  mjs: 'application/javascript',
  json: 'application/json',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  svg: 'image/svg+xml',
  webp: 'image/webp',
  ico: 'image/x-icon',
  woff: 'font/woff',
  woff2: 'font/woff2',
  ttf: 'font/ttf',
  otf: 'font/otf',
  eot: 'application/vnd.ms-fontobject',
  xml: 'application/xml',
  txt: 'text/plain',
  mp4: 'video/mp4',
  webm: 'video/webm',
  ogg: 'audio/ogg',
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  wasm: 'application/wasm',
  map: 'application/json',
}

/**
 * Devuelve el Content-Type correspondiente a un nombre de archivo.
 * Si la extensión no está en el mapa, devuelve 'application/octet-stream'.
 */
export function getContentType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() ?? ''
  return MIME_MAP[ext] || 'application/octet-stream'
}
