'use client'

import * as React from 'react'

import { getCapabilitiesForRole } from '@/lib/authz/capabilities-client'
import type { Capabilities } from '@/lib/authz/types'
import { useAppRole } from '@/hooks/use-app-role'

export function useCapabilities(): {
  capabilities: Capabilities
  role: ReturnType<typeof useAppRole>['role']
  isLoaded: boolean
  isSignedIn: boolean
} {
  const { role, isLoaded, isSignedIn } = useAppRole()
  const capabilities = React.useMemo(
    () => getCapabilitiesForRole(role),
    [role],
  )
  return { capabilities, role, isLoaded, isSignedIn }
}
