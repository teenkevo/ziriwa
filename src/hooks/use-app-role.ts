'use client'

import * as React from 'react'
import { useUser } from '@clerk/nextjs'

import { appRoleFromPublicMetadata, type AppRole } from '@/lib/app-role'
import { useViewer } from '@/contexts/viewer-context'

export function useAppRole(): {
  role: AppRole | null
  isLoaded: boolean
  isSignedIn: boolean
} {
  const { user, isLoaded, isSignedIn } = useUser()
  const { isImpersonating, effectiveRole } = useViewer()

  const clerkRole = React.useMemo(
    () =>
      appRoleFromPublicMetadata(
        user?.publicMetadata as Record<string, unknown> | undefined,
      ),
    [user],
  )

  const role = isImpersonating ? effectiveRole : clerkRole

  return { role, isLoaded, isSignedIn: isSignedIn ?? false }
}
