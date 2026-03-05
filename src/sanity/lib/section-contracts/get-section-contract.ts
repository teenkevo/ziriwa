import { defineQuery } from 'next-sanity'
import { sanityFetch } from '../client'

export type MeasurableActivity = {
  _key: string
  activityType: 'kpi' | 'cross-cutting'
  title: string
  aim?: string
  order?: number
  targetDate?: string
  status?: string
  evidence?: { asset?: { url?: string } }[]
}

export type ContractInitiative = {
  _key: string
  code?: string
  title: string
  order?: number
  measurableActivities?: MeasurableActivity[]
}

export type SsmartaObjective = {
  _key: string
  code?: string
  title: string
  order?: number
  initiatives?: ContractInitiative[]
}

export type SectionContract = {
  _id: string
  section?: { _id: string; name: string }
  financialYearLabel?: string
  manager?: { _id: string; fullName?: string }
  status?: string
  objectives?: SsmartaObjective[]
}

/**
 * Get the section contract for a section and financial year label.
 * One contract per section per FY. Includes embedded objectives.
 */
export async function getSectionContract(
  sectionId: string,
  financialYearLabel: string,
): Promise<SectionContract | null> {
  const query = defineQuery(`
    *[_type == "sectionContract" && section._ref == $sectionId && financialYearLabel == $financialYearLabel][0] {
      _id,
      section->{ _id, name },
      financialYearLabel,
      manager->{ _id, "fullName": coalesce(fullName, firstName + " " + lastName) },
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
            aim,
            order,
            targetDate,
            status,
            evidence,
          },
        },
      },
    }
  `)

  try {
    const contract = await sanityFetch({
      query,
      params: { sectionId, financialYearLabel },
      revalidate: 0,
    })
    return contract || null
  } catch (error) {
    console.error('Error fetching section contract', error)
    return null
  }
}
