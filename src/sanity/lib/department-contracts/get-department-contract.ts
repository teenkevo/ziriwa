import { defineQuery } from 'next-sanity'

import { sanityFetch } from '../client'
import type {
  ContractInitiative,
  SsmartaObjective,
} from '../section-contracts/get-section-contract'

export type DepartmentContract = {
  _id: string
  department?: { _id: string; fullName?: string; acronym?: string }
  financialYearLabel?: string
  commissioner?: { _id: string; fullName?: string }
  status?: string
  objectives?: SsmartaObjective[]
}

export type { ContractInitiative, SsmartaObjective }

export async function getDepartmentContract(
  departmentId: string,
  financialYearLabel: string,
): Promise<DepartmentContract | null> {
  const query = defineQuery(`
    *[_type == "departmentContract" && department._ref == $departmentId && financialYearLabel == $financialYearLabel][0] {
      _id,
      department->{ _id, fullName, acronym },
      financialYearLabel,
      commissioner->{ _id, "fullName": coalesce(fullName, firstName + " " + lastName) },
      status,
      objectives[] {
        _key,
        code,
        title,
        order,
        initiatives[] {
          _key,
          code,
          title,
          order,
          measurableActivities[] {
            _key,
            activityType,
            title,
            order,
            targetDate,
            status,
            "reportingFrequency": coalesce(reportingFrequency, "n/a"),
          },
        },
      },
    }
  `)

  try {
    const contract = await sanityFetch({
      query,
      params: { departmentId, financialYearLabel },
      revalidate: 0,
    })
    return contract || null
  } catch (error) {
    console.error('Error fetching department contract', error)
    return null
  }
}
