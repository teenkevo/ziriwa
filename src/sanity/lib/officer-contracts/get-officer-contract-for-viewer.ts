import { getCurrentFinancialYear } from '@/lib/financial-year'

import { getOfficerContract, type OfficerContract } from './get-officer-contract'

export type { OfficerContract }

export async function getOfficerContractForViewer(
  sectionId: string,
  officerStaffId: string,
) {
  const currentFY = getCurrentFinancialYear()
  return getOfficerContract(sectionId, officerStaffId, currentFY.label)
}
