import { getCurrentFinancialYear } from '@/lib/financial-year'

import { getDepartmentContract } from './get-department-contract'

export type { DepartmentContract } from './get-department-contract'

export async function getDepartmentContractByDepartment(departmentId: string) {
  const currentFY = getCurrentFinancialYear()
  return getDepartmentContract(departmentId, currentFY.label)
}
