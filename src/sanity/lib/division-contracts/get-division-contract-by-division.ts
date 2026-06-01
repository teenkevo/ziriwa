import { getCurrentFinancialYear } from '@/lib/financial-year'

import { getDivisionContract } from './get-division-contract'

export type { DivisionContract } from './get-division-contract'

export async function getDivisionContractByDivision(divisionId: string) {
  const currentFY = getCurrentFinancialYear()
  return getDivisionContract(divisionId, currentFY.label)
}
