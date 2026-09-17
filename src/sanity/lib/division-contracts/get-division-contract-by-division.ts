import { getActiveFinancialYear } from '@/lib/financial-year.server'

import { getDivisionContract } from './get-division-contract'

export type { DivisionContract } from './get-division-contract'

export async function getDivisionContractByDivision(
  divisionId: string,
  financialYearLabel?: string,
) {
  const label =
    financialYearLabel ?? (await getActiveFinancialYear()).label
  return getDivisionContract(divisionId, label)
}
