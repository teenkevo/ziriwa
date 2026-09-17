import { getActiveFinancialYear } from '@/lib/financial-year.server'

import {
  getSupervisorContract,
  type SupervisorContract,
} from './get-supervisor-contract'

export type { SupervisorContract }

export async function getSupervisorContractForViewer(
  sectionId: string,
  supervisorStaffId: string,
  financialYearLabel?: string,
) {
  const label =
    financialYearLabel ?? (await getActiveFinancialYear()).label
  return getSupervisorContract(sectionId, supervisorStaffId, label)
}
