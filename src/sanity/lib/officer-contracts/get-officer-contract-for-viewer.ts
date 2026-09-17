import { getActiveFinancialYear } from '@/lib/financial-year.server'

import { getOfficerContract, type OfficerContract } from './get-officer-contract'

export type { OfficerContract }

export async function getOfficerContractForViewer(
  sectionId: string,
  officerStaffId: string,
  financialYearLabel?: string,
) {
  const label =
    financialYearLabel ?? (await getActiveFinancialYear()).label
  return getOfficerContract(sectionId, officerStaffId, label)
}
