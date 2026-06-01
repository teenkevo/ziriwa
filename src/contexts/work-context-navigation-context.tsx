'use client'

import * as React from 'react'
import { Loader2 } from 'lucide-react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

import { buildWorkContextHref } from '@/features/delegation/build-work-context-href'
import { parseWorkContextParam } from '@/features/delegation/parse-work-context'
import type { WorkContextMode } from '@/lib/section-access'

interface WorkContextNavigationContextValue {
  /** Active tab highlight (optimistic while navigating). */
  displayContext: WorkContextMode
  isSwitching: boolean
  switchLabel: string | null
  navigateToWorkContext: (mode: WorkContextMode) => void
  navigateToHref: (href: string, label: string) => void
}

const WorkContextNavigationContext =
  React.createContext<WorkContextNavigationContextValue | null>(null)

export function useWorkContextNavigation() {
  const ctx = React.useContext(WorkContextNavigationContext)
  if (!ctx) {
    throw new Error(
      'useWorkContextNavigation must be used within WorkContextNavigationProvider',
    )
  }
  return ctx
}

function switchLabelForMode(
  mode: WorkContextMode,
  actingForName?: string | null,
): string {
  if (mode === 'acting' && actingForName) {
    return `Switching to acting for ${actingForName}…`
  }
  if (mode === 'acting') {
    return 'Switching to acting duties…'
  }
  return 'Switching to your work…'
}

interface WorkContextNavigationProviderProps {
  serverWorkContext: WorkContextMode
  actingForName?: string | null
  children: React.ReactNode
}

export function WorkContextNavigationProvider({
  serverWorkContext,
  actingForName,
  children,
}: WorkContextNavigationProviderProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = React.useTransition()
  const [optimisticContext, setOptimisticContext] =
    React.useState<WorkContextMode | null>(null)
  const [switchLabel, setSwitchLabel] = React.useState<string | null>(null)
  const [externalNav, setExternalNav] = React.useState(false)

  const urlContext = React.useMemo(
    () => parseWorkContextParam(searchParams.get('workContext') ?? undefined),
    [searchParams],
  )

  const displayContext = optimisticContext ?? serverWorkContext

  const awaitingServerSync =
    optimisticContext !== null && serverWorkContext !== optimisticContext

  React.useEffect(() => {
    if (optimisticContext === null) {
      if (!isPending && externalNav) {
        setSwitchLabel(null)
        setExternalNav(false)
      }
      return
    }
    if (
      !isPending &&
      optimisticContext === urlContext &&
      serverWorkContext === optimisticContext
    ) {
      setOptimisticContext(null)
      setSwitchLabel(null)
      setExternalNav(false)
    }
  }, [
    optimisticContext,
    urlContext,
    serverWorkContext,
    isPending,
    externalNav,
    pathname,
    searchParams,
  ])

  const isSwitching =
    isPending ||
    optimisticContext !== null ||
    externalNav ||
    awaitingServerSync

  const navigateToWorkContext = React.useCallback(
    (mode: WorkContextMode) => {
      if (mode === urlContext && !isPending) return

      setOptimisticContext(mode)
      setSwitchLabel(switchLabelForMode(mode, actingForName))
      setExternalNav(false)

      const href = buildWorkContextHref(pathname, mode, searchParams)
      startTransition(() => {
        router.push(href, { scroll: false })
      })
    },
    [actingForName, isPending, pathname, router, searchParams, urlContext],
  )

  const navigateToHref = React.useCallback(
    (href: string, label: string) => {
      setSwitchLabel(label)
      setExternalNav(true)
      setOptimisticContext(null)
      startTransition(() => {
        router.push(href, { scroll: false })
      })
    },
    [router],
  )

  const value = React.useMemo(
    () => ({
      displayContext,
      isSwitching,
      switchLabel,
      navigateToWorkContext,
      navigateToHref,
    }),
    [
      displayContext,
      isSwitching,
      switchLabel,
      navigateToWorkContext,
      navigateToHref,
    ],
  )

  return (
    <WorkContextNavigationContext.Provider value={value}>
      <div className='relative flex min-h-0 flex-1 flex-col overflow-hidden'>
        {children}
        {isSwitching ? (
          <div
            className='absolute inset-0 z-20 flex items-center justify-center bg-background/70 backdrop-blur-[2px]'
            role='status'
            aria-live='polite'
            aria-busy='true'
          >
            <div className='flex flex-col items-center gap-3 rounded-lg border bg-background px-6 py-5 shadow-md'>
              <Loader2
                className='h-7 w-7 animate-spin text-primary'
                aria-hidden='true'
              />
              <p className='text-sm font-medium text-foreground'>
                {switchLabel ?? 'Switching work context…'}
              </p>
            </div>
          </div>
        ) : null}
      </div>
    </WorkContextNavigationContext.Provider>
  )
}

/** Optional hook for shells that render the bar outside the dimmed region. */
export function useWorkContextNavigationOptional() {
  return React.useContext(WorkContextNavigationContext)
}
