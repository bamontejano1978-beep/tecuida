/**
 * Script de registro — registra esta app en el catálogo de TE CUIDA.
 *
 * Uso:
 *   1. Copia .env.example → .env y rellena TECUIDA_API_KEY
 *   2. Edita src/config.ts con los metadatos de tu app
 *   3. Ejecuta: npx tsx scripts/register.ts
 *
 * Flujo:
 *   1. Lee metadatos desde src/config.ts
 *   2. POST /api/register-app → crea la ficha en el catálogo
 *   3. Muestra el resultado (éxito / error)
 *
 * Idempotente: si la app ya existe (mismo app_slug), actualiza sus campos.
 */

import { appMeta } from '../src/config.js'

const API_URL =
  process.env.TECUIDA_API_URL || 'https://tecuida.group'
const API_KEY = process.env.TECUIDA_API_KEY

if (!API_KEY) {
  console.error('❌ TECUIDA_API_KEY no está definida en .env')
  console.error('   Cópiala del panel de admin de Te Cuida o del .env del monorepo')
  process.exit(1)
}

async function register() {
  console.log('')
  console.log('╔══════════════════════════════════════╗')
  console.log('║   TE CUIDA — Registro de app        ║')
  console.log('╚══════════════════════════════════════╝')
  console.log('')
  console.log(`📦 App:    ${appMeta.nombre}`)
  console.log(`🔗 Slug:   ${appMeta.app_slug}`)
  console.log(`🏷️  Tipo:   ${appMeta.tipo}`)
  console.log(`🎨 Color:  ${appMeta.brand_color}`)
  console.log(`🌐 URL:    ${appMeta.url_acceso}`)
  console.log('')

  const body = {
    nombre: appMeta.nombre,
    descripcion: appMeta.descripcion,
    app_slug: appMeta.app_slug,
    tipo: appMeta.tipo,
    brand_color: appMeta.brand_color,
    category_id: appMeta.category_id,
    url_acceso: appMeta.url_acceso,
    instrucciones: appMeta.instrucciones,
    thumbnail_url: appMeta.thumbnail_url,
    activa: true,
  }

  try {
    const res = await fetch(`${API_URL}/api/register-app`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
      } as Record<string, string>,
      body: JSON.stringify(body),
    })

    const data = await res.json().catch(() => ({}))

    if (res.ok) {
      console.log('✅ App registrada correctamente en el catálogo')
      console.log(`   ${API_URL}/admin/aplicaciones/${(data as { data?: { id: string } }).data?.id || ''}`)
    } else if (res.status === 409) {
      console.log('⚠️  La app ya existe con ese slug. Para actualizarla usa el panel de admin:')
      console.log(`   ${API_URL}/admin/aplicaciones`)
    } else {
      console.error(`❌ Error ${res.status}: ${(data as { error?: string }).error || 'Desconocido'}`)
      process.exit(1)
    }
  } catch (err) {
    console.error('❌ Error de conexión:', err instanceof Error ? err.message : err)
    console.error(`   ¿Está ${API_URL} accesible?`)
    process.exit(1)
  }
}

register()
