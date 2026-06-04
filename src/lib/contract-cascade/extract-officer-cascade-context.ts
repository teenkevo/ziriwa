import { expandOfficerCascadeActivities } from './officer-cascade-selection'
import type {
  CascadeImportSelection,
  CascadeRewriteContextItem,
} from './types'
import type { SsmartaObjective } from '@/sanity/lib/section-contracts/get-section-contract'

function taskText(task: { task?: string } | string): string {
  if (typeof task === 'string') return task.trim()
  return task.task?.trim() ?? ''
}

function resolveSupervisorTaskKey(
  raw: { _key?: string } | string,
  index: number,
): string {
  if (typeof raw !== 'string' && raw._key) return raw._key
  return `idx-${index}`
}

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
      const { activityKey, taskKeys } = activitySelection
      const selectedKeys = new Set(taskKeys)
      const located = findSupervisorMeasurable(
        supervisorObjectives,
        selection.initiativeKey,
        activityKey,
      )
      if (!located) continue

      const { objective, initiative, measurable } = located
      const measurableTitle = measurable.title?.trim() ?? ''
      const supervisorTasks: string[] = []
      for (const [index, raw] of (measurable.tasks ?? []).entries()) {
        const key = resolveSupervisorTaskKey(raw, index)
        if (!selectedKeys.has(key)) continue
        const text = taskText(raw)
        if (text) supervisorTasks.push(text)
      }
      if (supervisorTasks.length === 0) continue

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
        managerTasks: supervisorTasks,
        asIs: {
          objectiveTitle: initiative.title,
          initiativeTitle: measurableTitle,
          measurableTitle,
          tasks: supervisorTasks,
        },
      })
    }
  }

  return items
}
