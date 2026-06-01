import { defineQuery } from 'next-sanity'

import { sanityFetch } from '../client'
import type {
  ContractInitiative,
  SsmartaObjective,
} from '../section-contracts/get-section-contract'

export type DivisionContract = {
  _id: string
  division?: { _id: string; fullName?: string; acronym?: string }
  financialYearLabel?: string
  assistantCommissioner?: { _id: string; fullName?: string }
  status?: string
  objectives?: SsmartaObjective[]
}

export type { ContractInitiative, SsmartaObjective }

export async function getDivisionContract(
  divisionId: string,
  financialYearLabel: string,
): Promise<DivisionContract | null> {
  const query = defineQuery(`
    *[_type == "divisionContract" && division._ref == $divisionId && financialYearLabel == $financialYearLabel][0] {
      _id,
      division->{ _id, fullName, acronym },
      financialYearLabel,
      assistantCommissioner->{ _id, "fullName": coalesce(fullName, firstName + " " + lastName) },
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
      params: { divisionId, financialYearLabel },
      revalidate: 0,
    })
    return contract || null
  } catch (error) {
    console.error('Error fetching division contract', error)
    return null
  }
}
