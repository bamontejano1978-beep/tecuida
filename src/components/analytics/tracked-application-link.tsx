'use client'

import Link from 'next/link'
import type { ComponentProps } from 'react'
import { useAnalytics } from '@/lib/analytics/tracker'

interface Props extends Omit<ComponentProps<typeof Link>, 'onClick'> {
  applicationId: string
  municipalityId?: string | null
}

export default function TrackedApplicationLink({
  applicationId,
  municipalityId,
  children,
  ...props
}: Props) {
  const { track, flushNow } = useAnalytics(null, municipalityId)

  return (
    <Link
      {...props}
      onClick={() => {
        track('app_view', { application_id: applicationId })
        void flushNow()
      }}
    >
      {children}
    </Link>
  )
}
