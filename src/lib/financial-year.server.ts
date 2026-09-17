import 'server-only'

import { cookies } from 'next/headers'

import {
  FINANCIAL_YEAR_COOKIE,
  getCurrentFinancialYear,
  listSelectableFinancialYears,
  parseFinancialYearLabel,
  type FinancialYear,
} from '@/lib/financial-year'

/**
 * Active workspace financial year from cookie, falling back to calendar current.
 * Invalid or out-of-range cookie values are ignored.
 */
export async function getActiveFinancialYear(): Promise<FinancialYear> {
  const store = await cookies()
  const raw = store.get(FINANCIAL_YEAR_COOKIE)?.value
  const parsed = parseFinancialYearLabel(raw)
  if (!parsed) return getCurrentFinancialYear()

  const allowed = new Set(
    listSelectableFinancialYears().map(fy => fy.label),
  )
  if (!allowed.has(parsed.label)) return getCurrentFinancialYear()
  return parsed
}

export async function getActiveFinancialYearLabel(): Promise<string> {
  const fy = await getActiveFinancialYear()
  return fy.label
}
