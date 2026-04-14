import { defineQuery } from 'next-sanity'
import { sanityFetch } from '../client'
import { getSectionDivisionPairsForDepartment } from '../sections/get-section-division-pairs-for-department'
import { getInitiativeProgressForSections } from '../section-contracts/get-initiative-progress-for-sections'
import { aggregateProgress } from '@/lib/initiative-progress'
import { getCurrentFinancialYear } from '@/lib/financial-year'

export type DepartmentListRow = {
  _id: string
  name: string
  slug?: { current: string }
  fullName?: string
  acronym?: string
  isDefault?: boolean
  commissioner?: { _id: string; fullName?: string }
  staffCount?: number
  initiativeProgressPercent: number
  initiativeProgressCompleted: number
  initiativeProgressTotal: number
  /** Division names in this department (search). */
  divisionNames?: string[]
}

export async function getAllDepartmentsForList(): Promise<DepartmentListRow[]> {
  const query = defineQuery(`
    *[_type == "department"] | order(coalesce(fullName, name) asc) {
      _id,
      "name": coalesce(acronym, fullName, name),
      slug,
      fullName,
      acronym,
      isDefault,
      commissioner->{ _id, "fullName": coalesce(fullName, firstName + " " + lastName) },
      "staffCount": count(*[_type == "staff" && status == "active" && department._ref == ^._id]),
      "divisionNames": *[_type == "division" && department._ref == ^._id].fullName,
    }
  `)

  try {
    const rows =
      (await sanityFetch({
        query,
        revalidate: 0,
      })) as Omit<
        DepartmentListRow,
        | 'initiativeProgressPercent'
        | 'initiativeProgressCompleted'
        | 'initiativeProgressTotal'
      >[]

    const base = rows || []
    const fy = getCurrentFinancialYear()

    return Promise.all(
      base.map(async d => {
        const pairs = await getSectionDivisionPairsForDepartment(d._id)
        const sectionIds = pairs.map(p => p._id)
        const progressBySection = await getInitiativeProgressForSections(
          sectionIds,
          fy.label,
        )
        const parts = sectionIds.map(
          id =>
            progressBySection.get(id) ?? { completed: 0, total: 0, percent: 0 },
        )
        const agg = aggregateProgress(
          parts.map(p => ({ completed: p.completed, total: p.total })),
        )
        return {
          ...d,
          initiativeProgressPercent: agg.percent,
          initiativeProgressCompleted: agg.completed,
          initiativeProgressTotal: agg.total,
        }
      }),
    )
  } catch (error) {
    console.error('Error fetching departments for list', error)
    return []
  }
}
