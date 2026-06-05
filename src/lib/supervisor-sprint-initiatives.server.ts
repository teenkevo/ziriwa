import { getCurrentFinancialYear } from '@/lib/financial-year'
import { flattenInitiativesWithActivities } from '@/lib/flatten-initiatives-with-activities'
import type { InitiativeWithActivities } from '@/lib/flatten-initiatives-with-activities'
import { supervisorSprintInitiativesKey } from '@/lib/supervisor-sprint-initiatives'
import { getSupervisorContract } from '@/sanity/lib/supervisor-contracts/get-supervisor-contract'
import type { WeeklySprint } from '@/sanity/lib/weekly-sprints/get-sprints-by-section'

export { getSupervisorSprintInitiatives, supervisorSprintInitiativesKey } from '@/lib/supervisor-sprint-initiatives'

/** Initiatives from each sprint supervisor's contract (for revise dialog on manager views). */
export async function buildSupervisorSprintInitiativesByStaffId(
  defaultSectionId: string,
  sprints: WeeklySprint[],
  financialYearLabel?: string,
): Promise<Record<string, InitiativeWithActivities[]>> {
  const fy = financialYearLabel ?? getCurrentFinancialYear().label

  const lookups = new Map<
    string,
    { sectionId: string; supervisorStaffId: string }
  >()

  for (const sprint of sprints) {
    const supervisorStaffId = sprint.supervisor?._id
    if (!supervisorStaffId) continue
    const sectionId = sprint.sectionId ?? defaultSectionId
    if (!sectionId) continue
    const key = supervisorSprintInitiativesKey(sectionId, supervisorStaffId)
    if (!lookups.has(key)) {
      lookups.set(key, { sectionId, supervisorStaffId })
    }
  }

  if (lookups.size === 0) return {}

  const entries = await Promise.all(
    [...lookups.values()].map(async ({ sectionId, supervisorStaffId }) => {
      const contract = await getSupervisorContract(
        sectionId,
        supervisorStaffId,
        fy,
      )
      return [
        supervisorSprintInitiativesKey(sectionId, supervisorStaffId),
        flattenInitiativesWithActivities(contract),
      ] as const
    }),
  )

  return Object.fromEntries(entries)
}
