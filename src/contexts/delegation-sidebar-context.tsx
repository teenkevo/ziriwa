'use client'

import * as React from 'react'

interface DelegationSidebarState {
  canSelfServiceDelegate: boolean
  onOpenDelegate: () => void
}

const DelegationSidebarStateContext =
  React.createContext<DelegationSidebarState | null>(null)

const DelegationSidebarDispatchContext = React.createContext<
  React.Dispatch<React.SetStateAction<DelegationSidebarState | null>>
>(() => {})

export function DelegationSidebarProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [state, setState] = React.useState<DelegationSidebarState | null>(null)

  return (
    <DelegationSidebarDispatchContext.Provider value={setState}>
      <DelegationSidebarStateContext.Provider value={state}>
        {children}
      </DelegationSidebarStateContext.Provider>
    </DelegationSidebarDispatchContext.Provider>
  )
}

export function useDelegationSidebarOptional() {
  return React.useContext(DelegationSidebarStateContext)
}

export function useRegisterDelegationSidebar(
  canSelfServiceDelegate: boolean,
  onOpenDelegate: () => void,
) {
  const setState = React.useContext(DelegationSidebarDispatchContext)

  React.useEffect(() => {
    if (!canSelfServiceDelegate) {
      setState(current =>
        current === null ? current : null,
      )
      return
    }

    setState(current => {
      if (
        current?.canSelfServiceDelegate &&
        current.onOpenDelegate === onOpenDelegate
      ) {
        return current
      }
      return { canSelfServiceDelegate: true, onOpenDelegate }
    })

    return () => setState(null)
  }, [setState, canSelfServiceDelegate, onOpenDelegate])
}
