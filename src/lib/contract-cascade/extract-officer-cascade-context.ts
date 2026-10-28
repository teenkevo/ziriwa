import { expandOfficerCascadeActivities } from './officer-cascade-selection'
import type {
  CascadeImportSelection,
  CascadeRewriteContextItem,
} from './types'
import type { SsmartaObjective } from '@/sanity/lib/section-contracts/get-section-contract'

function findSupervisorMeasurable(
  objectives: SsmartaObjective[],
  initiativeKey: string,
  activityKey: string,
) {
  for (const objective of objectives) {
    const initiative = objective.initiatives?.find(i => i._key === initiativeKey)
    if (!initiative) continue
    const measurable = initiative.measurableActivities?.find(
      a => a._key === activityKey,
    )
    if (measurable) {
      return { objective, initiative, measurable }
    }
  }
  return null
}

export function buildOfficerCascadeRewriteContexts(
  supervisorObjectives: SsmartaObjective[],
  selections: CascadeImportSelection[],
): CascadeRewriteContextItem[] {
  const items: CascadeRewriteContextItem[] = []

  for (const selection of selections) {
    for (const activitySelection of expandOfficerCascadeActivities(selection)) {
      const { activityKey } = activitySelection
      const located = findSupervisorMeasurable(
        supervisorObjectives,
        selection.initiativeKey,
        activityKey,
      )
      if (!located) continue

      const { objective, initiative, measurable } = located
      const measurableTitle = measurable.title?.trim() ?? ''
      if (!measurableTitle) continue

      items.push({
        activityKey,
        initiativeKey: selection.initiativeKey,
        initiativeCode: initiative.code,
        managerObjectiveCode: objective.code,
        managerObjectiveTitle: objective.title,
        managerInitiativeTitle: initiative.title,
        managerKpiTitle: measurableTitle,
        managerAim: measurableTitle,
        managerTargetDate: measurable.targetDate,
        managerTasks: [],
        asIs: {
          objectiveTitle: initiative.title,
          initiativeTitle: measurableTitle,
          measurableTitle,
          tasks: [],
        },
      })
    }
  }

  return items
}
