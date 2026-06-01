import { getCurrentFinancialYear } from '@/lib/financial-year'

import {
  getSupervisorContract,
  type SupervisorContract,
} from './get-supervisor-contract'

export type { SupervisorContract }

export async function getSupervisorContractForViewer(
  sectionId: string,
  supervisorStaffId: string,
) {
  const currentFY = getCurrentFinancialYear()
  return getSupervisorContract(sectionId, supervisorStaffId, currentFY.label)
}
