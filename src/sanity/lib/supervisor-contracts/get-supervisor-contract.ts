import { gateContractObjectives } from '@/lib/contract-cascade-visibility'
import { defineQuery } from 'next-sanity'

import { SPRINT_CONTRACT_TASKS_PROJECTION } from '../contracts/sprint-contract-tasks-projection'
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
  contractAlignment?: 'itil4' | 'pms'
  status?: string
  cascadeHoldMessage?: string | null
  hiddenCascadeKeys?: string[]
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
      contractAlignment,
      status,
      objectives[] {
        _key,
        cascadeKind,
        code,
        title,
        order,
        initiatives[] {
          _key,
          cascadeKind,
          code,
          title,
          order,
          measurableActivities[] {
            _key,
            cascadeKind,
            activityType,
            "assignees": assignees[]->{ _id },
            title,
            order,
            targetDate,
            status,
            "reportingFrequency": coalesce(reportingFrequency, "n/a"),
            evidence,
            cascadeSource { nodeRole },
            ${SPRINT_CONTRACT_TASKS_PROJECTION},
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
    return gateContractObjectives(contract || null)
  } catch (error) {
    console.error('Error fetching supervisor contract', error)
    return null
  }
}
