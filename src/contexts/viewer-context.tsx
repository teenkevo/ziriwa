'use client'

import * as React from 'react'

interface ViewerContextValue {
  isSuperadmin: boolean
}

const ViewerContext = React.createContext<ViewerContextValue>({
  isSuperadmin: false,
})

export function ViewerProvider({
  isSuperadmin,
  children,
}: {
  isSuperadmin: boolean
  children: React.ReactNode
}) {
  const value = React.useMemo(() => ({ isSuperadmin }), [isSuperadmin])
  return (
    <ViewerContext.Provider value={value}>{children}</ViewerContext.Provider>
  )
}

export function useViewer(): ViewerContextValue {
  return React.useContext(ViewerContext)
}
