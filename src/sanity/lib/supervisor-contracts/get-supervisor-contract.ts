import { defineQuery } from 'next-sanity'

import { sanityFetch } from '../client'
import type {
  ContractInitiative,
  SsmartaObjective,
} from '../section-contracts/get-section-contract'

export type SupervisorContract = {
  _id: string
  section?: { _id: string; name?: string }
  supervisor?: { _id: string; fullName?: string }
  financialYearLabel?: string
  status?: string
  objectives?: SsmartaObjective[]
}

export type { ContractInitiative, SsmartaObjective }

export async function getSupervisorContract(
  sectionId: string,
  supervisorStaffId: string,
  financialYearLabel: string,
): Promise<SupervisorContract | null> {
  const query = defineQuery(`
    *[
      _type == "supervisorContract"
      && section._ref == $sectionId
      && supervisor._ref == $supervisorStaffId
      && financialYearLabel == $financialYearLabel
    ][0] {
      _id,
      section->{ _id, name },
      supervisor->{ _id, "fullName": coalesce(fullName, firstName + " " + lastName) },
      financialYearLabel,
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
      params: { sectionId, supervisorStaffId, financialYearLabel },
      revalidate: 0,
    })
    return contract || null
  } catch (error) {
    console.error('Error fetching supervisor contract', error)
    return null
  }
}
