'use client'

import { useFinancialYear } from '@/contexts/financial-year-context'

/** Shown while the workspace is on a year other than the calendar current year. */
export function HistoricalYearBanner() {
  const { isHistorical, displayLabel, calendarCurrent } = useFinancialYear()
  if (!isHistorical) return null

  return (
    <div
      className='border-b border-amber-500/40 bg-amber-50 px-4 py-2 text-center text-sm text-amber-950 dark:border-amber-500/30 dark:bg-amber-950/40 dark:text-amber-50'
      role='status'
    >
      {displayLabel} is read-only. Switch to {calendarCurrent.label} to make
      changes.
    </div>
  )
}
