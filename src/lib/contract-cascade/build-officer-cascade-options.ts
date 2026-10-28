import { managerActivityCanCascade } from './aim'
import type {
  ManagerCascadeObjectiveOption,
  SupervisorCascadeOptionsResponse,
} from './types'
import type { SsmartaObjective } from '@/sanity/lib/section-contracts/get-section-contract'

interface CascadeSourceLike {
  supervisorContractId?: string
  activityKey?: string
  nodeRole?: string
}

function isActivityAlreadyImported(
  officerObjectives: SsmartaObjective[] | undefined,
  supervisorContractId: string,
  activityKey: string,
): boolean {
  for (const obj of officerObjectives ?? []) {
    for (const init of obj.initiatives ?? []) {
      const src = (init as { cascadeSource?: CascadeSourceLike }).cascadeSource
      if (
        src?.supervisorContractId === supervisorContractId &&
        src.activityKey === activityKey &&
        src.nodeRole === 'supervisorMeasurableAsInitiative'
      ) {
        return true
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
      const activities = []
      for (const act of init.measurableActivities ?? []) {
        if (!managerActivityCanCascade(act)) continue
        const alreadyImported = isActivityAlreadyImported(
          officerObjectives,
          supervisorContractId,
          act._key,
        )
        const activityType =
          act.activityType === 'kpi' ||
          act.activityType === 'measurable' ||
          act.activityType === 'core'
            ? act.activityType
            : 'measurable'
        activities.push({
          activityKey: act._key,
          title: act.title,
          aim: act.title?.trim() ?? '',
          activityType,
          hasAim: true,
          canCascade: !alreadyImported,
          alreadyImported,
        })
      }
      if (activities.length > 0) {
        initiatives.push({
          initiativeKey: init._key,
          code: init.code,
          title: init.title,
          kpis: activities,
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
