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

export async function GET() {
  try {
    const supabase = createAdminClient()
    const { error } = await supabase
      .from('municipalities')
      .select('count', { count: 'exact', head: true })

    if (error) {
      return NextResponse.json(
        { status: 'unhealthy', error: error.message },
        { status: 503 },
      )
    }

    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        error: err instanceof Error ? err.message : 'Unknown error',
      },
      { status: 503 },
    )
  }
}
