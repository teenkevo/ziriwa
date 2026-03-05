import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const parseStringify = (value: any) => JSON.parse(JSON.stringify(value))

/**
 * Calculates the number of months between two dates.
 * If includePartialEnd is true, counts the ending month even if the day hasn't fully elapsed.
 */
export function monthsBetween(
  startDate: Date,
  endDate: Date,
  includePartialEnd: boolean = false,
): number {
  const startYear = startDate.getFullYear()
  const startMonth = startDate.getMonth()
  const startDay = startDate.getDate()

  const endYear = endDate.getFullYear()
  const endMonth = endDate.getMonth()
  const endDay = endDate.getDate()

  let totalMonths = (endYear - startYear) * 12 + (endMonth - startMonth)

  if (!includePartialEnd && endDay < startDay) {
    totalMonths -= 1
  }
  return totalMonths >= 0 ? totalMonths : 0
}

/**
 * Determines whether a member has fulfilled all monthly pledges up to today.
 *
 * @param startDate             When the member first pledged (e.g., new Date(2023, 2, 15) for March 15, 2023).
 * @param actualContributed     Sum of all contributions the member has made so far.
 * @param pledgePerMonth        Fixed pledge amount per month (default: 100000).
 *
 * @returns `true` if actual contributions >= expected total; otherwise, `false`.
 */
export function hasFulfilledPledges(
  startDate: Date,
  actualContributed: number,
  pledgePerMonth: number = 100000,
): boolean {
  const today = new Date()
  // 1. If startDate is after today, no pledges are due yet.
  if (startDate > today) {
    return actualContributed >= 0
  }

  // 2. Count months from startDate through current month (includePartialEnd = true).
  const monthsElapsed = monthsBetween(startDate, today, true)

  // 3. Compute expected total
  const expectedTotal = monthsElapsed * pledgePerMonth

  // 4. Return true if actualContributed meets or exceeds expectedTotal
  return actualContributed >= expectedTotal
}

const months = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]
export function getMonthName(n: number) {
  return n >= 1 && n <= 12 ? months[n - 1] : 'Invalid month number'
}
