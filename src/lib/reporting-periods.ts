/**
 * Reporting period utilities for periodic tasks.
 * Derives expected deliverables per period (weekly, monthly, quarterly)
 * for use in due items and automated reporting.
 */

import {
  startOfWeek,
  endOfWeek,
  endOfMonth,
  endOfQuarter,
  format,
  addWeeks,
  addMonths,
  addQuarters,
  isBefore,
  isAfter,
  getISOWeek,
} from 'date-fns'

/** FY runs July 1 - June 30. */
const FY_START_MONTH = 6 // July (0-indexed)

/** Parse YYYY-MM-DD as local date to avoid timezone shifting to previous day. */
export function parseDateAsLocal(dateStr: string): Date {
  const [y, m, d] = dateStr.split(/[T ]/)[0].split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** End of FY containing the given date. FY = Jul 1 - Jun 30. */
function getEndOfFY(date: Date): Date {
  const year = date.getFullYear()
  const month = date.getMonth()
  const fyEndYear = month >= FY_START_MONTH ? year + 1 : year
  return endOfMonth(new Date(fyEndYear, 5, 1)) // June 30
}

export type ReportingFrequency = 'weekly' | 'monthly' | 'quarterly'

export type PeriodInfo = {
  periodKey: string
  label: string
  startDate: string
  endDate: string
  dueDate: string
}

/**
 * Get period key for a date given frequency.
 * - weekly: 2025-W01 (ISO week)
 * - monthly: 2025-01
 * - quarterly: 2025-Q1
 */
export function getPeriodKey(
  date: Date,
  frequency: ReportingFrequency,
): string {
  const year = date.getFullYear()
  if (frequency === 'weekly') {
    const weekNum = getISOWeek(date)
    return `${year}-W${String(weekNum).padStart(2, '0')}`
  }
  if (frequency === 'monthly') {
    const month = date.getMonth() + 1
    return `${year}-${String(month).padStart(2, '0')}`
  }
  if (frequency === 'quarterly') {
    const quarter = Math.floor(date.getMonth() / 3) + 1
    return `${year}-Q${quarter}`
  }
  return ''
}

/**
 * Get period info for a given period key and frequency.
 */
export function getPeriodInfo(
  periodKey: string,
  frequency: ReportingFrequency,
): PeriodInfo | null {
  try {
    if (frequency === 'monthly') {
      const [year, month] = periodKey.split('-').map(Number)
      const start = new Date(year, month - 1, 1)
      const end = endOfMonth(start)
      return {
        periodKey,
        label: format(start, 'MMMM yyyy'),
        startDate: format(start, 'yyyy-MM-dd'),
        endDate: format(end, 'yyyy-MM-dd'),
        dueDate: format(end, 'yyyy-MM-dd'),
      }
    }
    if (frequency === 'quarterly') {
      const [year, q] = periodKey.split('-')
      const quarter = parseInt(q.replace('Q', ''), 10)
      const start = new Date(parseInt(year, 10), (quarter - 1) * 3, 1)
      const end = endOfQuarter(start)
      return {
        periodKey,
        label: `Q${quarter} ${year}`,
        startDate: format(start, 'yyyy-MM-dd'),
        endDate: format(end, 'yyyy-MM-dd'),
        dueDate: format(end, 'yyyy-MM-dd'),
      }
    }
    if (frequency === 'weekly') {
      const [year, w] = periodKey.split('-')
      const weekNum = parseInt(w.replace('W', ''), 10)
      const jan4 = new Date(parseInt(year, 10), 0, 4)
      const start = startOfWeek(jan4, { weekStartsOn: 1 })
      const periodStart = addWeeks(start, weekNum - 1)
      const end = endOfWeek(periodStart, { weekStartsOn: 1 })
      return {
        periodKey,
        label: `Week ${weekNum} ${year}`,
        startDate: format(periodStart, 'yyyy-MM-dd'),
        endDate: format(end, 'yyyy-MM-dd'),
        dueDate: format(end, 'yyyy-MM-dd'),
      }
    }
  } catch {
    return null
  }
  return null
}

/**
 * Generate all periods between start and end dates for a given frequency.
 */
export function getPeriodsInRange(
  startDate: string,
  endDate: string,
  frequency: ReportingFrequency,
): PeriodInfo[] {
  const start = parseDateAsLocal(startDate)
  const end = parseDateAsLocal(endDate)
  const periods: PeriodInfo[] = []
  let current = new Date(start)

  while (!isAfter(current, end)) {
    const periodKey = getPeriodKey(current, frequency)
    const info = getPeriodInfo(periodKey, frequency)
    if (info && !isBefore(parseDateAsLocal(info.endDate), start)) {
      periods.push(info)
    }
    if (frequency === 'weekly') {
      current = addWeeks(current, 1)
    } else if (frequency === 'monthly') {
      current = addMonths(current, 1)
    } else {
      current = addQuarters(current, 1)
    }
  }

  return periods
}

/**
 * Get expected periods for a task from reporting start through current + future.
 * Used to populate period selector for periodic deliverables.
 */
export function getExpectedPeriodsForTask(
  reportingPeriodStart: string,
  frequency: ReportingFrequency,
  options?: { periodsAhead?: number },
): PeriodInfo[] {
  const start = parseDateAsLocal(reportingPeriodStart)
  const now = new Date()
  const fyEnd = getEndOfFY(start)
  let horizon: Date
  if (frequency === 'weekly') {
    horizon = addWeeks(now, options?.periodsAhead ?? 4)
  } else if (frequency === 'monthly') {
    horizon = addMonths(now, options?.periodsAhead ?? 3)
  } else {
    horizon = addQuarters(now, options?.periodsAhead ?? 2)
  }
  const end = isAfter(horizon, fyEnd) ? horizon : fyEnd
  return getPeriodsInRange(
    format(start, 'yyyy-MM-dd'),
    format(end, 'yyyy-MM-dd'),
    frequency,
  )
}

/**
 * Get the current period's due date for a frequency.
 */
export function getCurrentPeriodDueDate(
  frequency: ReportingFrequency,
): string {
  const now = new Date()
  if (frequency === 'weekly') {
    return format(endOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd')
  }
  if (frequency === 'monthly') {
    return format(endOfMonth(now), 'yyyy-MM-dd')
  }
  if (frequency === 'quarterly') {
    return format(endOfQuarter(now), 'yyyy-MM-dd')
  }
  return ''
}
