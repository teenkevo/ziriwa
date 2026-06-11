'use client'

import * as React from 'react'

import type { AppRole } from '@/lib/app-role'

interface ViewerContextValue {
  isSuperadmin: boolean
  isImpersonating: boolean
  effectiveRole: AppRole | null
}

const ViewerContext = React.createContext<ViewerContextValue>({
  isSuperadmin: false,
  isImpersonating: false,
  effectiveRole: null,
})

export function ViewerProvider({
  isSuperadmin,
  isImpersonating,
  effectiveRole,
  children,
}: {
  isSuperadmin: boolean
  isImpersonating: boolean
  effectiveRole: AppRole | null
  children: React.ReactNode
}) {
  const value = React.useMemo(
    () => ({ isSuperadmin, isImpersonating, effectiveRole }),
    [isSuperadmin, isImpersonating, effectiveRole],
  )
  return (
    <ViewerContext.Provider value={value}>{children}</ViewerContext.Provider>
  )
}

export function useViewer(): ViewerContextValue {
  return React.useContext(ViewerContext)
}
