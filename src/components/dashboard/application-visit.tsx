'use client'

import { useEffect } from 'react'
import { useAnalytics } from '@/lib/analytics/tracker'

export default function ApplicationVisit({ applicationId, launch = false, view = true }: { applicationId: string; launch?: boolean; view?: boolean }) {
  const { track, flushNow } = useAnalytics(null, null)
  useEffect(() => {
    if (view) track('app_view', { application_id: applicationId })
    if (launch) track('app_launch', { application_id: applicationId })
    void flushNow()
    if (launch) void fetch('/api/citizen/applications', {
      method: 'POST', keepalive: true, headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ application_id: applicationId, action: 'open' }),
    }).catch(() => {})
  }, [applicationId, launch, view, track, flushNow])
  return null
}
