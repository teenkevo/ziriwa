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

/**
 * Selectable FYs for the switcher: past years through the calendar current year.
 * Defaults to 5 years of history (including current).
 */
export function listSelectableFinancialYears(options?: {
  pastCount?: number
  referenceDate?: Date
}): FinancialYear[] {
  const pastCount = options?.pastCount ?? 4
  const current = getFinancialYearForDate(options?.referenceDate ?? new Date())
  const years: FinancialYear[] = []
  for (let i = 0; i <= pastCount; i++) {
    years.push(buildFinancialYear(current.startYear - i))
  }
  return years
}
