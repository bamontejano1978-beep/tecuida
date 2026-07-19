/**
 * Health check endpoint — usado por Vercel cron jobs
 *
 * GET /api/admin/health
 *
 * Verifica que la aplicación está funcionando y tiene
 * conectividad con la base de datos.
 */

import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { logEvent, notifyOperationalAlert } from '@/lib/observability/logger'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = createAdminClient()
    const { error } = await supabase
      .from('municipalities')
      .select('count', { count: 'exact', head: true })

    if (error) {
      logEvent('error', 'health_database_unavailable', {}, error)
      await notifyOperationalAlert('health_database_unavailable', {
        deployment: process.env.VERCEL_GIT_COMMIT_SHA || 'local',
      })
      return NextResponse.json(
        { status: 'unhealthy', database: 'unavailable', deployment: process.env.VERCEL_GIT_COMMIT_SHA || 'local' },
        { status: 503 },
      )
    }

    return NextResponse.json({
      status: 'healthy',
      database: 'available',
      deployment: process.env.VERCEL_GIT_COMMIT_SHA || 'local',
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    logEvent('error', 'health_unexpected_error', {}, err)
    await notifyOperationalAlert('health_unexpected_error', {
      deployment: process.env.VERCEL_GIT_COMMIT_SHA || 'local',
    })
    return NextResponse.json(
      { status: 'unhealthy' },
      { status: 503 },
    )
  }
}
