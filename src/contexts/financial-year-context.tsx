'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'

import { WorkspaceRouteLoading } from '@/components/workspace-route-loading'
import type { FinancialYear } from '@/lib/financial-year'

interface FinancialYearContextValue {
  active: FinancialYear
  calendarCurrent: FinancialYear
  options: FinancialYear[]
  isHistorical: boolean
  isSwitching: boolean
  /** Label shown while a switch is in flight (optimistic). */
  displayLabel: string
  switchFinancialYear: (label: string) => Promise<void>
}

const FinancialYearContext =
  React.createContext<FinancialYearContextValue | null>(null)

const SWITCH_TIMEOUT_MS = 20_000

export function FinancialYearProvider({
  active,
  calendarCurrent,
  options,
  children,
}: {
  active: FinancialYear
  calendarCurrent: FinancialYear
  options: FinancialYear[]
  children: React.ReactNode
}) {
  const router = useRouter()
  const [isPending, startTransition] = React.useTransition()
  const [pendingLabel, setPendingLabel] = React.useState<string | null>(null)
  const switchInFlightRef = React.useRef(false)

  React.useEffect(() => {
    if (!pendingLabel) return
    if (active.label === pendingLabel) {
      setPendingLabel(null)
      switchInFlightRef.current = false
    }
  }, [active.label, pendingLabel])

  // Safety valve: never leave the overlay stuck if refresh fails silently.
  React.useEffect(() => {
    if (!pendingLabel) return
    const timer = window.setTimeout(() => {
      setPendingLabel(null)
      switchInFlightRef.current = false
    }, SWITCH_TIMEOUT_MS)
    return () => window.clearTimeout(timer)
  }, [pendingLabel])

  const switchFinancialYear = React.useCallback(
    async (label: string) => {
      if (label === active.label || switchInFlightRef.current) return

      switchInFlightRef.current = true
      setPendingLabel(label)
      try {
        const res = await fetch('/api/financial-year/select', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ label }),
        })
        if (!res.ok) {
          const data = (await res.json().catch(() => null)) as {
            error?: string
          } | null
          throw new Error(data?.error || 'Failed to switch financial year')
        }
        startTransition(() => {
          router.refresh()
        })
      } catch (error) {
        setPendingLabel(null)
        switchInFlightRef.current = false
        throw error
      }
    },
    [active.label, router],
  )

  const isSwitching = isPending || pendingLabel !== null
  const displayLabel = pendingLabel ?? active.label

  const value = React.useMemo(
    () => ({
      active,
      calendarCurrent,
      options,
      isHistorical: displayLabel !== calendarCurrent.label,
      isSwitching,
      displayLabel,
      switchFinancialYear,
    }),
    [
      active,
      calendarCurrent,
      options,
      displayLabel,
      isSwitching,
      switchFinancialYear,
    ],
  )

  return (
    <FinancialYearContext.Provider value={value}>
      {children}
    </FinancialYearContext.Provider>
  )
}

export function useFinancialYear(): FinancialYearContextValue {
  const ctx = React.useContext(FinancialYearContext)
  if (!ctx) {
    throw new Error('useFinancialYear must be used within FinancialYearProvider')
  }
  return ctx
}

/** Safe for trees that may render outside the provider (falls back to null). */
export function useFinancialYearOptional(): FinancialYearContextValue | null {
  return React.useContext(FinancialYearContext)
}

/** Renders over main content while a financial year switch is in flight. */
export function FinancialYearSwitchOverlay() {
  const fy = useFinancialYearOptional()
  if (!fy?.isSwitching) return null

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
