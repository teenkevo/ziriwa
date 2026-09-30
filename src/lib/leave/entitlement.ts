import { isWeekend } from 'date-fns'

import {
  buildFinancialYear,
  getFinancialYearForDate,
  type FinancialYear,
} from '@/lib/financial-year'
import { isDateKey, parseDateKey, shiftDateKey } from '@/lib/leave/dates'

export const STANDARD_ANNUAL_LEAVE_DAYS = 30
export const ASSISTANT_COMMISSIONER_ANNUAL_LEAVE_DAYS = 36

export interface LeaveEntitlement {
  label: string
  startDate: string
  endDate: string
  allowance: number
  used: number
  remaining: number
}

export interface AnnualLeaveSpan {
  id?: string
  startDate: string
  endDate: string
}

export function annualLeaveAllowance(role: string | null | undefined): number {
  return role === 'assistant_commissioner'
    ? ASSISTANT_COMMISSIONER_ANNUAL_LEAVE_DAYS
    : STANDARD_ANNUAL_LEAVE_DAYS
}

export function isWorkingDay(dateKey: string): boolean {
  return isDateKey(dateKey) && !isWeekend(parseDateKey(dateKey))
}

export function eachDateKey(startDate: string, endDate: string): string[] {
  if (!isDateKey(startDate) || !isDateKey(endDate) || endDate < startDate) return []
  const dates: string[] = []
  let cursor = startDate
  let guard = 0
  while (cursor <= endDate && guard < 400) {
    dates.push(cursor)
    cursor = shiftDateKey(cursor, 1)
    guard += 1
  }
  return dates
}

export function countWorkingDays(startDate: string, endDate: string): number {
  return eachDateKey(startDate, endDate).filter(isWorkingDay).length
}

export function workingDaysInYear(
  startDate: string,
  endDate: string,
  fy: Pick<FinancialYear, 'startDate' | 'endDate'>,
): number {
  const clippedStart = startDate > fy.startDate ? startDate : fy.startDate
  const clippedEnd = endDate < fy.endDate ? endDate : fy.endDate
  if (clippedEnd < clippedStart) return 0
  return countWorkingDays(clippedStart, clippedEnd)
}

export function financialYearsTouched(
  startDate: string,
  endDate: string,
): FinancialYear[] {
  if (!isDateKey(startDate) || !isDateKey(endDate) || endDate < startDate) return []
  const years: FinancialYear[] = []
  let cursor = getFinancialYearForDate(parseDateKey(startDate))
  years.push(cursor)
  while (cursor.endDate < endDate && years.length < 5) {
    cursor = buildFinancialYear(cursor.startYear + 1)
    years.push(cursor)
  }
  return years
}

export function summarizeEntitlement(
  fy: FinancialYear,
  allowance: number,
  plans: AnnualLeaveSpan[],
): LeaveEntitlement {
  const usedDates = new Set<string>()
  for (const plan of plans) {
    const start = plan.startDate > fy.startDate ? plan.startDate : fy.startDate
    const end = plan.endDate < fy.endDate ? plan.endDate : fy.endDate
    for (const date of eachDateKey(start, end)) {
      if (isWorkingDay(date)) usedDates.add(date)
    }
  }
  const used = usedDates.size
  return {
    label: fy.label,
    startDate: fy.startDate,
    endDate: fy.endDate,
    allowance,
    used,
    remaining: Math.max(allowance - used, 0),
  }
}

export function annualLeaveDraftError(input: {
  startDate: string
  endDate: string
  kind: string
  entitlements: LeaveEntitlement[]
  editing?: { startDate: string; endDate: string; kind: string } | null
}): string | null {
  if (input.kind !== 'annual') return null
  for (const fy of financialYearsTouched(input.startDate, input.endDate)) {
    const balance = input.entitlements.find(item => item.label === fy.label)
    if (!balance) continue
    const already =
      input.editing?.kind === 'annual'
        ? workingDaysInYear(input.editing.startDate, input.editing.endDate, fy)
        : 0
    const error = annualEntitlementError({
      fy,
      allowance: balance.allowance,
      usedByOthers: Math.max(balance.used - already, 0),
      requested: workingDaysInYear(input.startDate, input.endDate, fy),
    })
    if (error) return error
  }
  return null
}

export function annualLeaveDraftNote(
  startDate: string,
  endDate: string,
  kind: string,
): string | null {
  if (kind !== 'annual') return null
  const years = financialYearsTouched(startDate, endDate)
  if (years.length === 0) return null
  const counts = years.map(fy => workingDaysInYear(startDate, endDate, fy))
  if (counts.every(count => count === 0)) {
    return 'Weekends are not counted, so this uses no annual leave.'
  }
  const parts = years.map((fy, index) => {
    const days = counts[index] ?? 0
    return `${days} working ${days === 1 ? 'day' : 'days'} in ${fy.label}`
  })
  return `${parts.join(' · ')}. Weekends are not counted.`
}

export function annualEntitlementError(input: {
  fy: FinancialYear
  allowance: number
  usedByOthers: number
  requested: number
}): string | null {
  const left = Math.max(input.allowance - input.usedByOthers, 0)
  if (input.requested <= left) return null
  const dayLabel = left === 1 ? 'day' : 'days'
  return `${input.fy.label} has ${left} working ${dayLabel} left. This needs ${input.requested}.`
}
