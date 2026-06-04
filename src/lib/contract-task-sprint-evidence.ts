import type {
  WeeklySprint,
  WorkSubmission,
} from '@/sanity/lib/weekly-sprints/get-sprints-by-section'

export interface ContractTaskSprintCycleEvidence {
  sprintId: string
  weekLabel: string
  weekStart: string
  weekEnd: string
  sprintStatus: WeeklySprint['status']
  sprintTaskKey: string
  sprintTaskDescription: string
  taskStatus?: string
  workSubmissions: WorkSubmission[]
}

export interface CollectSprintEvidenceParams {
  contractTaskKey: string
  activityKey?: string
  initiativeKey?: string
}

/**
 * Gathers work submissions from all sprint cycles linked to a contract detailed task.
 */
export function collectSprintEvidenceForContractTask(
  sprints: WeeklySprint[],
  params: CollectSprintEvidenceParams,
): ContractTaskSprintCycleEvidence[] {
  const taskKey = params.contractTaskKey.trim()
  if (!taskKey) return []

  const out: ContractTaskSprintCycleEvidence[] = []

  for (const sprint of sprints) {
    for (const task of sprint.tasks ?? []) {
      if (task == null) continue
      if (!task.contractTaskKey || task.contractTaskKey !== taskKey) continue
      if (
        params.activityKey?.trim() &&
        task.activityKey &&
        task.activityKey !== params.activityKey.trim()
      ) {
        continue
      }
      if (
        params.initiativeKey?.trim() &&
        task.initiativeKey &&
        task.initiativeKey !== params.initiativeKey.trim()
      ) {
        continue
      }

      const submissions = (task.workSubmissions ?? []).filter(Boolean)
      out.push({
        sprintId: sprint._id,
        weekLabel: sprint.weekLabel,
        weekStart: sprint.weekStart,
        weekEnd: sprint.weekEnd,
        sprintStatus: sprint.status,
        sprintTaskKey: task._key,
        sprintTaskDescription: task.description,
        taskStatus: task.taskStatus,
        workSubmissions: submissions,
      })
    }
  }

  return out.sort((a, b) => b.weekStart.localeCompare(a.weekStart))
}

export function countSprintEvidenceSubmissions(
  cycles: ContractTaskSprintCycleEvidence[],
): number {
  return cycles.reduce((n, cycle) => n + cycle.workSubmissions.length, 0)
}
