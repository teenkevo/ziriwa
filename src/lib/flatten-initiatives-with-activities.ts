import type { OfficerContract } from '@/sanity/lib/officer-contracts/get-officer-contract'
import type { SupervisorContract } from '@/sanity/lib/supervisor-contracts/get-supervisor-contract'
import type { SectionContract } from '@/sanity/lib/section-contracts/get-section-contract'
import type { DetailedTask } from '@/sanity/lib/section-contracts/get-section-contract'

export type ContractActivityTask = {
  key: string
  title: string
}

export type InitiativeWithActivities = {
  key: string
  title: string
  activities: {
    key: string
    title: string
    tasks: ContractActivityTask[]
  }[]
}

type ContractWithObjectives =
  | SectionContract
  | SupervisorContract
  | OfficerContract
  | null
  | undefined

function detailedTaskLabel(task: DetailedTask | string, index: number): string {
  if (typeof task === 'string') return task.trim()
  return (task.task ?? '').trim()
}

function detailedTaskKey(task: DetailedTask | string, index: number): string {
  if (typeof task === 'string') return `task-${index}`
  return task._key?.trim() || `task-${index}`
}

export function flattenInitiativesWithActivities(
  contract: ContractWithObjectives,
): InitiativeWithActivities[] {
  if (!contract?.objectives) return []
  const out: InitiativeWithActivities[] = []
  for (const obj of contract.objectives) {
    for (const init of obj.initiatives ?? []) {
      const key = init._key
      if (!key || !init.title) continue
      out.push({
        key,
        title: `${init.code ? `${init.code} – ` : ''}${init.title}`,
        activities: (init.measurableActivities ?? [])
          .filter(a => a._key && a.title)
          .map(a => ({
            key: a._key,
            title: a.title,
            tasks: (a.tasks ?? [])
              .map((t, i) => {
                const title = detailedTaskLabel(t, i)
                const taskKey = detailedTaskKey(t, i)
                if (!title) return null
                return { key: taskKey, title }
              })
              .filter((t): t is ContractActivityTask => t !== null),
          })),
      })
    }
  }
  return out
}

export function findContractActivity(
  initiatives: InitiativeWithActivities[],
  initiativeKey: string | undefined,
  activityKey: string | undefined,
) {
  if (!initiativeKey?.trim() || !activityKey?.trim()) return null
  const init = initiatives.find(i => i.key === initiativeKey)
  return init?.activities.find(a => a.key === activityKey) ?? null
}

export function findContractDetailedTask(
  initiatives: InitiativeWithActivities[],
  initiativeKey: string | undefined,
  activityKey: string | undefined,
  contractTaskKey: string | undefined,
) {
  if (!contractTaskKey?.trim()) return null
  const activity = findContractActivity(initiatives, initiativeKey, activityKey)
  return activity?.tasks.find(t => t.key === contractTaskKey) ?? null
}
