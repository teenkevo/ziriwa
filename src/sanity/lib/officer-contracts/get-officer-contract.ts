import { defineQuery } from 'next-sanity'

import { sanityFetch } from '../client'
import type {
  ContractInitiative,
  SsmartaObjective,
} from '../section-contracts/get-section-contract'

export type OfficerContract = {
  _id: string
  section?: { _id: string; name?: string }
  officer?: { _id: string; fullName?: string }
  financialYearLabel?: string
  status?: string
  objectives?: SsmartaObjective[]
}

export type { ContractInitiative, SsmartaObjective }

export async function getOfficerContract(
  sectionId: string,
  officerStaffId: string,
  financialYearLabel: string,
): Promise<OfficerContract | null> {
  const query = defineQuery(`
    *[
      _type == "officerContract"
      && section._ref == $sectionId
      && officer._ref == $officerStaffId
      && financialYearLabel == $financialYearLabel
    ][0] {
      _id,
      section->{ _id, name },
      officer->{ _id, "fullName": coalesce(fullName, firstName + " " + lastName) },
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
            cascadeSource { nodeRole },
          },
        },
      },
    }
  `)

  try {
    const contract = await sanityFetch({
      query,
      params: { sectionId, officerStaffId, financialYearLabel },
      revalidate: 0,
    })
    return contract || null
  } catch (error) {
    console.error('Error fetching officer contract', error)
    return null
  }
}
