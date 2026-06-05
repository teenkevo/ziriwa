'use client'

import * as React from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

import { WorkspaceRouteLoading } from '@/components/workspace-route-loading'

interface WorkspaceRouteNavigationContextValue {
  isNavigating: boolean
  navigateToHref: (href: string) => void
}

const WorkspaceRouteNavigationContext =
  React.createContext<WorkspaceRouteNavigationContextValue | null>(null)

export function useWorkspaceRouteNavigation() {
  const ctx = React.useContext(WorkspaceRouteNavigationContext)
  if (!ctx) {
    throw new Error(
      'useWorkspaceRouteNavigation must be used within WorkspaceRouteNavigationProvider',
    )
  }
  return ctx
}

export function useWorkspaceRouteNavigationOptional() {
  return React.useContext(WorkspaceRouteNavigationContext)
}

function hrefMatchesCurrent(
  href: string,
  pathname: string,
  searchParams: URLSearchParams,
): boolean {
  const [targetPath, targetQuery = ''] = href.split('?')
  if (targetPath !== pathname) return false
  const targetParams = new URLSearchParams(targetQuery)
  for (const [key, value] of targetParams.entries()) {
    if (searchParams.get(key) !== value) return false
  }
  return true
}

interface WorkspaceRouteNavigationProviderProps {
  children: React.ReactNode
}

export function WorkspaceRouteNavigationProvider({
  children,
}: WorkspaceRouteNavigationProviderProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = React.useTransition()
  const [pendingHref, setPendingHref] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!pendingHref || isPending) return
    if (hrefMatchesCurrent(pendingHref, pathname, searchParams)) {
      setPendingHref(null)
    }
  }, [pendingHref, isPending, pathname, searchParams])

  const navigateToHref = React.useCallback(
    (href: string) => {
      if (hrefMatchesCurrent(href, pathname, searchParams) && !isPending) {
        return
      }
      setPendingHref(href)
      startTransition(() => {
        router.push(href, { scroll: false })
      })
    },
    [isPending, pathname, router, searchParams],
  )

  const isNavigating = isPending || pendingHref !== null

  const value = React.useMemo(
    () => ({
      isNavigating,
      navigateToHref,
    }),
    [isNavigating, navigateToHref],
  )

  return (
    <WorkspaceRouteNavigationContext.Provider value={value}>
      {children}
    </WorkspaceRouteNavigationContext.Provider>
  )
}

/** Renders over main content while a workspace route navigation is in flight. */
export function WorkspaceRouteNavigationOverlay() {
  const navigation = useWorkspaceRouteNavigationOptional()
  if (!navigation?.isNavigating) return null

  return (
    <div
      className='absolute inset-0 z-20 flex items-center justify-center bg-background'
      role='status'
      aria-live='polite'
      aria-busy='true'
    >
      <WorkspaceRouteLoading />
    </div>
  )
}
