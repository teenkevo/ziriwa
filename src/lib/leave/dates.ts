import {
  addDays,
  differenceInCalendarDays,
  endOfMonth,
  endOfWeek,
  format,
  startOfMonth,
  startOfWeek,
} from 'date-fns'

export const LEAVE_KINDS = [
  { value: 'annual', label: 'Annual' },
  { value: 'sick', label: 'Sick' },
  { value: 'study', label: 'Study' },
  { value: 'compassionate', label: 'Compassionate' },
  { value: 'unpaid', label: 'Unpaid' },
  { value: 'other', label: 'Other' },
] as const

export type LeaveKind = (typeof LEAVE_KINDS)[number]['value']
export type LeaveStatus = 'planned' | 'confirmed'

export const MAX_LEAVE_DAYS = 90

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/

export function toDateKey(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}

export function parseDateKey(value: string): Date {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, (month ?? 1) - 1, day ?? 1)
}

export function isDateKey(value: string): boolean {
  if (!DATE_KEY.test(value)) return false
  return toDateKey(parseDateKey(value)) === value
}

export function shiftDateKey(value: string, days: number): string {
  return toDateKey(addDays(parseDateKey(value), days))
}

export function inclusiveDays(startDate: string, endDate: string): number {
  return differenceInCalendarDays(parseDateKey(endDate), parseDateKey(startDate)) + 1
}

export function rangesOverlap(
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string,
): boolean {
  return aStart <= bEnd && bStart <= aEnd
}

export function overlapBounds(
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string,
): { startDate: string; endDate: string } {
  return {
    startDate: aStart > bStart ? aStart : bStart,
    endDate: aEnd < bEnd ? aEnd : bEnd,
  }
}

export function normalizeRange(a: string, b: string): {
  startDate: string
  endDate: string
} {
  return a <= b
    ? { startDate: a, endDate: b }
    : { startDate: b, endDate: a }
}

export const OWN_LEAVE_TAKEN_MESSAGE =
  'Those days are already on your leave calendar.'

export const CONFIRMED_LEAVE_LOCKED_MESSAGE =
  'Confirmed leave cannot be changed.'

export function datesCoveredByPlans(
  plans: { id?: string; startDate: string; endDate: string }[],
  exceptId?: string,
): string[] {
  const dates: string[] = []
  for (const plan of plans) {
    if (exceptId && plan.id === exceptId) continue
    if (plan.endDate < plan.startDate) continue
    let cursor = plan.startDate
    let guard = 0
    while (cursor <= plan.endDate && guard < 400) {
      dates.push(cursor)
      cursor = shiftDateKey(cursor, 1)
      guard += 1
    }
  }
  return dates
}

export function rangeHitsPlans(
  startDate: string,
  endDate: string,
  plans: { id?: string; startDate: string; endDate: string }[],
  exceptId?: string,
): boolean {
  return plans.some(
    plan =>
      plan.id !== exceptId &&
      rangesOverlap(plan.startDate, plan.endDate, startDate, endDate),
  )
}

/** Furthest date from the anchor that does not step onto a locked day. */
export function clampBeforeLockedDate(
  anchor: string,
  pointer: string,
  lockedDates: ReadonlySet<string>,
): string {
  if (pointer === anchor || lockedDates.has(anchor)) return anchor
  const step = pointer > anchor ? 1 : -1
  let cursor = anchor
  while (cursor !== pointer) {
    const next = shiftDateKey(cursor, step)
    if (lockedDates.has(next)) return cursor
    cursor = next
  }
  return pointer
}

export function outsideFinancialYearMessage(
  startDate: string,
  endDate: string,
  fy: { label: string; startDate: string; endDate: string },
): string | null {
  if (startDate >= fy.startDate && endDate <= fy.endDate) return null
  return `Choose dates within ${fy.label}.`
}

export function validateLeaveRange(
  startDate: string,
  endDate: string,
): string | null {
  if (!isDateKey(startDate) || !isDateKey(endDate)) return 'Choose valid dates.'
  if (endDate < startDate) return 'The end date has to be on or after the start.'
  if (inclusiveDays(startDate, endDate) > MAX_LEAVE_DAYS) {
    return `Leave can cover at most ${MAX_LEAVE_DAYS} days.`
  }
  return null
}

export function kindLabel(kind: string): string {
  return LEAVE_KINDS.find(item => item.value === kind)?.label ?? 'Leave'
}

/** Monday-start weeks covering the month, including leading and trailing days. */
export function monthWeeks(month: Date): Date[][] {
  const start = startOfWeek(startOfMonth(month), { weekStartsOn: 1 })
  const end = endOfWeek(endOfMonth(month), { weekStartsOn: 1 })
  const weeks: Date[][] = []
  let cursor = start
  while (cursor <= end) {
    weeks.push(Array.from({ length: 7 }, (_, index) => addDays(cursor, index)))
    cursor = addDays(cursor, 7)
  }
  return weeks
}

export function visibleMonthBounds(month: Date): { from: string; to: string } {
  const weeks = monthWeeks(month)
  const first = weeks[0]?.[0] ?? startOfMonth(month)
  const lastWeek = weeks[weeks.length - 1]
  const last = lastWeek?.[6] ?? endOfMonth(month)
  return { from: toDateKey(first), to: toDateKey(last) }
}
