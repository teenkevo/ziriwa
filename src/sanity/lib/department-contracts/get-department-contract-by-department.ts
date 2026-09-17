import { getActiveFinancialYear } from '@/lib/financial-year.server'

import { getDepartmentContract } from './get-department-contract'

export type { DepartmentContract } from './get-department-contract'

export async function getDepartmentContractByDepartment(
  departmentId: string,
  financialYearLabel?: string,
) {
  const label =
    financialYearLabel ?? (await getActiveFinancialYear()).label
  return getDepartmentContract(departmentId, label)
}
