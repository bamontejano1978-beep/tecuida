'use client'

import Link from 'next/link'
import type { ComponentProps } from 'react'

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
  void applicationId
  void municipalityId

  return (
    <Link
      {...props}
    >
      {children}
    </Link>
  )
}
