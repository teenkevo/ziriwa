import type {
  ManagerCascadeObjectiveOption,
  SupervisorCascadeOptionsResponse,
} from './types'
import type {
  DetailedTask,
  SsmartaObjective,
} from '@/sanity/lib/section-contracts/get-section-contract'

interface CascadeSourceLike {
  supervisorContractId?: string
  activityKey?: string
  taskKey?: string
  nodeRole?: string
}

function taskLabel(task: DetailedTask | string): string {
  if (typeof task === 'string') return task.trim()
  return task.task?.trim() ?? ''
}

function taskKey(task: DetailedTask | string, index: number): string {
  if (typeof task !== 'string' && task._key) return task._key
  return `idx-${index}`
}

function isTaskAlreadyImported(
  officerObjectives: SsmartaObjective[] | undefined,
  supervisorContractId: string,
  activityKey: string,
  supervisorTaskKey: string,
): boolean {
  for (const obj of officerObjectives ?? []) {
    for (const init of obj.initiatives ?? []) {
      for (const act of init.measurableActivities ?? []) {
        for (const raw of act.tasks ?? []) {
          const src = (raw as { cascadeSource?: CascadeSourceLike })
            .cascadeSource
          if (
            src?.supervisorContractId === supervisorContractId &&
            src.activityKey === activityKey &&
            src.taskKey === supervisorTaskKey &&
            src.nodeRole === 'supervisorTaskAsTask'
          ) {
            return true
          }
        }
      }
    }
  }
  return false
}

export function buildOfficerCascadeOptions(
  supervisorContractId: string,
  financialYearLabel: string,
  cascadeRevision: number,
  supervisorObjectives: SsmartaObjective[] | undefined,
  officerObjectives: SsmartaObjective[] | undefined,
): SupervisorCascadeOptionsResponse {
  const objectives: ManagerCascadeObjectiveOption[] = []

  for (const obj of supervisorObjectives ?? []) {
    const initiatives = []
    for (const init of obj.initiatives ?? []) {
      const kpis = []
      for (const act of init.measurableActivities ?? []) {
        const taskOptions = []
        for (const [index, raw] of (act.tasks ?? []).entries()) {
          const title = taskLabel(raw)
          if (!title) continue
          const key = taskKey(raw, index)
          const alreadyImported = isTaskAlreadyImported(
            officerObjectives,
            supervisorContractId,
            act._key,
            key,
          )
          taskOptions.push({
            taskKey: key,
            title,
            canCascade: !alreadyImported,
            alreadyImported,
          })
        }

        const canCascade = taskOptions.some(task => task.canCascade)
        const alreadyImported =
          taskOptions.length > 0 &&
          taskOptions.every(task => task.alreadyImported)

        kpis.push({
          activityKey: act._key,
          title: act.title,
          aim: act.title?.trim() ?? '',
          activityType:
            act.activityType === 'kpi'
              ? ('kpi' as const)
              : ('measurable' as const),
          hasAim: true,
          canCascade,
          alreadyImported,
          tasks: taskOptions,
        })
      }
      if (kpis.length > 0) {
        initiatives.push({
          initiativeKey: init._key,
          code: init.code,
          title: init.title,
          kpis,
        })
      }
    }
    if (initiatives.length > 0) {
      objectives.push({
        objectiveKey: obj._key,
        code: obj.code,
        title: obj.title,
        initiatives,
      })
    }
  }

  return {
    supervisorContractId,
    financialYearLabel,
    cascadeRevision,
    objectives,
  }
}
