/**
 * TenantCache — Capa de caché para configuraciones de municipio (tenant)
 *
 * Usa Upstash Redis como backend principal con TTL de 300 segundos.
 * Si las variables de entorno no están definidas (desarrollo/test),
 * degrada gracefully a un Map en memoria como fallback.
 *
 * Clave Redis: `tenant:config:{slug}`
 *
 * Requisitos: 2.1, 2.2, 2.3, 2.4
 */

import type { MunicipalityConfig } from '@/types'

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------

const DEFAULT_TTL_SECONDS = 300
const KEY_PREFIX = 'tenant:config:'

// ---------------------------------------------------------------------------
// Interfaz interna del driver de caché
// ---------------------------------------------------------------------------

interface CacheDriver {
  get(key: string): Promise<MunicipalityConfig | null>
  set(key: string, value: MunicipalityConfig, ttl: number): Promise<void>
  del(key: string): Promise<void>
}

// ---------------------------------------------------------------------------
// Driver Redis (Upstash)
// ---------------------------------------------------------------------------

async function createRedisDriver(): Promise<CacheDriver> {
  const { Redis } = await import('@upstash/redis')
  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  })

  return {
    async get(key: string): Promise<MunicipalityConfig | null> {
      const value = await redis.get<MunicipalityConfig>(key)
      return value ?? null
    },

    async set(key: string, value: MunicipalityConfig, ttl: number): Promise<void> {
      await redis.set(key, value, { ex: ttl })
    },

    async del(key: string): Promise<void> {
      await redis.del(key)
    },
  }
}

// ---------------------------------------------------------------------------
// Driver en memoria (fallback para desarrollo/test)
// ---------------------------------------------------------------------------

interface InMemoryEntry {
  value: MunicipalityConfig
  expiresAt: number
}

function createInMemoryDriver(): CacheDriver {
  const store = new Map<string, InMemoryEntry>()

  return {
    async get(key: string): Promise<MunicipalityConfig | null> {
      const entry = store.get(key)
      if (!entry) return null
      if (Date.now() > entry.expiresAt) {
        store.delete(key)
        return null
      }
      return entry.value
    },

    async set(key: string, value: MunicipalityConfig, ttl: number): Promise<void> {
      store.set(key, {
        value,
        expiresAt: Date.now() + ttl * 1000,
      })
    },

    async del(key: string): Promise<void> {
      store.delete(key)
    },
  }
}

// ---------------------------------------------------------------------------
// Selección del driver según entorno
// ---------------------------------------------------------------------------

function hasRedisConfig(): boolean {
  return (
    typeof process.env.UPSTASH_REDIS_REST_URL === 'string' &&
    process.env.UPSTASH_REDIS_REST_URL.length > 0 &&
    typeof process.env.UPSTASH_REDIS_REST_TOKEN === 'string' &&
    process.env.UPSTASH_REDIS_REST_TOKEN.length > 0
  )
}

// ---------------------------------------------------------------------------
// Clase TenantCache
// ---------------------------------------------------------------------------

export class TenantCache {
  private driver: CacheDriver | null = null
  private driverReady: Promise<CacheDriver> | null = null

  private async getDriver(): Promise<CacheDriver> {
    if (this.driver) return this.driver

    if (!this.driverReady) {
      this.driverReady = (async () => {
        if (hasRedisConfig()) {
          try {
            const redisDriver = await createRedisDriver()
            this.driver = redisDriver
            return redisDriver
          } catch {
            // Si Redis falla al inicializar, usar el fallback en memoria
            const memDriver = createInMemoryDriver()
            this.driver = memDriver
            return memDriver
          }
        } else {
          const memDriver = createInMemoryDriver()
          this.driver = memDriver
          return memDriver
        }
      })()
    }

    return this.driverReady
  }

  /**
   * Obtiene la configuración de un municipio desde caché.
   * Devuelve null si no existe la entrada o ha expirado.
   */
  async get(slug: string): Promise<MunicipalityConfig | null> {
    const driver = await this.getDriver()
    return driver.get(`${KEY_PREFIX}${slug}`)
  }

  /**
   * Almacena la configuración de un municipio en caché.
   * @param slug - Identificador del municipio (p. ej. "calamonte")
   * @param config - Configuración completa del municipio
   * @param ttl - Tiempo de vida en segundos (por defecto 300)
   */
  async set(
    slug: string,
    config: MunicipalityConfig,
    ttl: number = DEFAULT_TTL_SECONDS
  ): Promise<void> {
    const driver = await this.getDriver()
    await driver.set(`${KEY_PREFIX}${slug}`, config, ttl)
  }

  /**
   * Elimina la entrada de caché para un municipio.
   * Se usa al crear o actualizar un municipio para forzar revalidación.
   */
  async delete(slug: string): Promise<void> {
    const driver = await this.getDriver()
    await driver.del(`${KEY_PREFIX}${slug}`)
  }
}

// ---------------------------------------------------------------------------
// Singleton exportado
// ---------------------------------------------------------------------------

export const tenantCache = new TenantCache()
