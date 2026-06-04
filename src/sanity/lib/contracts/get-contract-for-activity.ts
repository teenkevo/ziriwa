import { defineQuery } from 'next-sanity'

import type { ContractsApiResource } from '@/lib/contracts-api'
import { sanityFetch } from '../client'
import type {
  MeasurableActivity,
  SectionContract,
  SsmartaObjective,
} from '../section-contracts/get-section-contract'
import { MEASURABLE_ACTIVITIES_WITH_TASKS_PROJECTION } from './measurable-activities-projection'

export type ActivityPageContractType =
  | 'sectionContract'
  | 'supervisorContract'
  | 'officerContract'

export type ActivityPageContract = Pick<SectionContract, '_id' | 'objectives'> & {
  _type: ActivityPageContractType
}

type ActivityContractsApi = Extract<
  ContractsApiResource,
  'section-contracts' | 'supervisor-contracts' | 'officer-contracts'
>

const CONTRACTS_API_BY_TYPE: Record<ActivityPageContractType, ActivityContractsApi> =
  {
  sectionContract: 'section-contracts',
  supervisorContract: 'supervisor-contracts',
  officerContract: 'officer-contracts',
}

export function contractsApiForActivityContract(
  contractType: ActivityPageContractType,
): ActivityContractsApi {
  return CONTRACTS_API_BY_TYPE[contractType]
}

export async function getContractForActivityPage(
  contractId: string,
  sectionId: string,
): Promise<ActivityPageContract | null> {
  const query = defineQuery(`
    *[
      _id == $contractId
      && section._ref == $sectionId
      && _type in ["sectionContract", "supervisorContract", "officerContract"]
    ][0] {
      _id,
      _type,
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
          ${MEASURABLE_ACTIVITIES_WITH_TASKS_PROJECTION}
        },
      },
    }
  `)

  try {
    const contract = await sanityFetch({
      query,
      params: { contractId, sectionId },
      revalidate: 0,
    })
    return contract || null
  } catch (error) {
    console.error('Error fetching contract for activity page', error)
    return null
  }
}

export function getActivityFromContract(
  contract: ActivityPageContract,
  objectiveIndex: number,
  initiativeIndex: number,
  activityIndex: number,
): MeasurableActivity | null {
  return (
    contract.objectives?.[objectiveIndex]?.initiatives?.[initiativeIndex]
      ?.measurableActivities?.[activityIndex] ?? null
  )
}

export type { MeasurableActivity, SsmartaObjective }
