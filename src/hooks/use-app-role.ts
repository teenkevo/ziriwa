'use client'

import * as React from 'react'
import { useUser } from '@clerk/nextjs'
import { appRoleFromPublicMetadata, type AppRole } from '@/lib/app-role'

export function useAppRole(): {
  role: AppRole | null
  isLoaded: boolean
  isSignedIn: boolean
} {
  const { user, isLoaded, isSignedIn } = useUser()
  const role = React.useMemo(
    () =>
      appRoleFromPublicMetadata(
        user?.publicMetadata as Record<string, unknown> | undefined,
      ),
    [user],
  )
  return { role, isLoaded, isSignedIn: isSignedIn ?? false }
}
