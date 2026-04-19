import { defineQuery } from 'next-sanity'
import { sanityFetch } from '../client'
import {
  countMeasurableActivityProgress,
  type ObjectivesProgressInput,
} from '@/lib/initiative-progress'
import { getInitiativeProgressForSectionsOracle } from '@/oracle/lib/section-contracts/get-initiative-progress-for-sections'

type ContractRow = {
  sectionId: string
  objectives?: ObjectivesProgressInput
}

/**
 * Current FY section contracts for the given sections — returns per-section activity completion counts.
 */
export async function getInitiativeProgressForSections(
  sectionIds: string[],
  financialYearLabel: string,
): Promise<Map<string, { completed: number; total: number; percent: number }>> {
  if (process.env.CMS_PROVIDER === 'oracle') {
    return getInitiativeProgressForSectionsOracle(sectionIds, financialYearLabel)
  }
  const out = new Map<
    string,
    { completed: number; total: number; percent: number }
  >()
  if (!sectionIds.length) return out

  const query = defineQuery(`
    *[_type == "sectionContract" && section._ref in $sectionIds && financialYearLabel == $financialYearLabel]{
      "sectionId": section._ref,
      objectives[]{
        initiatives[]{
          measurableActivities[]{
            status
          }
        }
      }
    }
  `)

  try {
    const rows = await sanityFetch({
      query,
      params: { sectionIds, financialYearLabel },
      revalidate: 0,
    })
    const list = (rows || []) as ContractRow[]
    for (const row of list) {
      if (!row.sectionId) continue
      const { completed, total, percent } = countMeasurableActivityProgress(
        row.objectives,
      )
      out.set(row.sectionId, { completed, total, percent })
    }
    return out
  } catch (e) {
    console.error('getInitiativeProgressForSections', e)
    return out
  }
}
