/**
 * Uganda FY runs July 1 - June 30.
 * FY-2025/2026 = July 1, 2025 - June 30, 2026
 * Calendar "current" FY is computed from today's date; the active workspace FY
 * may differ when the user switches years (see financial-year.server.ts).
 */

export const FINANCIAL_YEAR_COOKIE = 'ziriwa_financial_year'
export const FINANCIAL_YEAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 365

/** Matches labels like FY-2025/2026 */
const FY_LABEL_RE = /^FY-(\d{4})\/(\d{4})$/

export type FinancialYear = {
  label: string
  startDate: string
  endDate: string
  startYear: number
  endYear: number
}

/** @deprecated Prefer FinancialYear — kept for existing imports. */
export type CurrentFinancialYear = FinancialYear

export function buildFinancialYear(startYear: number): FinancialYear {
  const endYear = startYear + 1
  return {
    label: `FY-${startYear}/${endYear}`,
    startDate: `${startYear}-07-01`,
    endDate: `${endYear}-06-30`,
    startYear,
    endYear,
  }
}

export function getFinancialYearForDate(date: Date = new Date()): FinancialYear {
  const year = date.getFullYear()
  const month = date.getMonth() + 1 // 0-indexed
  const startYear = month >= 7 ? year : year - 1
  return buildFinancialYear(startYear)
}

/** Calendar current FY from today's date. */
export function getCurrentFinancialYear(): FinancialYear {
  return getFinancialYearForDate(new Date())
}

export function parseFinancialYearLabel(
  label: string | null | undefined,
): FinancialYear | null {
  if (!label) return null
  const match = FY_LABEL_RE.exec(label.trim())
  if (!match) return null
  const startYear = Number(match[1])
  const endYear = Number(match[2])
  if (!Number.isFinite(startYear) || endYear !== startYear + 1) return null
  return buildFinancialYear(startYear)
}

export function isFinancialYearLabel(
  label: string | null | undefined,
): label is string {
  return parseFinancialYearLabel(label) !== null
}

/** True when an ISO date (YYYY-MM-DD) falls within the FY inclusive range. */
export function isDateInFinancialYear(
  date: string | null | undefined,
  fy: Pick<FinancialYear, 'startDate' | 'endDate'>,
): boolean {
  if (!date) return false
  return date >= fy.startDate && date <= fy.endDate
}

/**
 * Selectable FYs for the switcher: from FY-2025/2026 through the calendar
 * current year (newest first). Older years are not offered.
 */
export const EARLIEST_SELECTABLE_FY_START_YEAR = 2025

export function listSelectableFinancialYears(options?: {
  referenceDate?: Date
}): FinancialYear[] {
  const current = getFinancialYearForDate(options?.referenceDate ?? new Date())
  const latestStart = Math.max(
    current.startYear,
    EARLIEST_SELECTABLE_FY_START_YEAR,
  )

  const years: FinancialYear[] = []
  for (
    let startYear = latestStart;
    startYear >= EARLIEST_SELECTABLE_FY_START_YEAR;
    startYear--
  ) {
    years.push(buildFinancialYear(startYear))
  }
  return years
}
