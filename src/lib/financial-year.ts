/**
 * Uganda FY runs July 1 - June 30.
 * FY-2025/2026 = July 1, 2025 - June 30, 2026
 * Current FY is computed from today's date - no seeding required.
 */
export type CurrentFinancialYear = {
  label: string
  startDate: string
  endDate: string
}

export function getCurrentFinancialYear(): CurrentFinancialYear {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1 // 0-indexed

  let startYear: number
  let endYear: number

  // July (7) onwards = FY starts this year
  if (month >= 7) {
    startYear = year
    endYear = year + 1
  } else {
    startYear = year - 1
    endYear = year
  }

  return {
    label: `FY-${startYear}/${endYear}`,
    startDate: `${startYear}-07-01`,
    endDate: `${endYear}-06-30`,
  }
}
