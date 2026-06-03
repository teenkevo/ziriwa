import { managerKpiHasCascadeAim } from './aim'
import type {
  ManagerCascadeObjectiveOption,
  ManagerCascadeOptionsResponse,
} from './types'
import type { SsmartaObjective } from '@/sanity/lib/section-contracts/get-section-contract'

interface CascadeSourceLike {
  sectionContractId?: string
  activityKey?: string
  nodeRole?: string
}

function initiativeCascadeSource(
  init: { cascadeSource?: CascadeSourceLike },
): CascadeSourceLike | undefined {
  return init.cascadeSource
}

function isKpiAlreadyImported(
  supervisorObjectives: SsmartaObjective[] | undefined,
  sectionContractId: string,
  activityKey: string,
): boolean {
  for (const obj of supervisorObjectives ?? []) {
    for (const init of obj.initiatives ?? []) {
      const src = initiativeCascadeSource(
        init as { cascadeSource?: CascadeSourceLike },
      )
      if (
        src?.sectionContractId === sectionContractId &&
        src.activityKey === activityKey &&
        src.nodeRole === 'managerKpiAsInitiative'
      ) {
        return true
      }
    }
  }
  return false
}

export function buildManagerCascadeOptions(
  sectionContractId: string,
  financialYearLabel: string,
  cascadeRevision: number,
  managerObjectives: SsmartaObjective[] | undefined,
  supervisorObjectives: SsmartaObjective[] | undefined,
): ManagerCascadeOptionsResponse {
  const objectives: ManagerCascadeObjectiveOption[] = []

  for (const obj of managerObjectives ?? []) {
    const initiatives = []
    for (const init of obj.initiatives ?? []) {
      const kpis = []
      for (const act of init.measurableActivities ?? []) {
        if (act.activityType !== 'kpi') continue
        const hasAim = managerKpiHasCascadeAim(act.aim)
        const alreadyImported = isKpiAlreadyImported(
          supervisorObjectives,
          sectionContractId,
          act._key,
        )
        kpis.push({
          activityKey: act._key,
          title: act.title,
          aim: act.aim?.trim() ?? '',
          hasAim,
          canCascade: hasAim && !alreadyImported,
          alreadyImported,
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
    sectionContractId,
    financialYearLabel,
    cascadeRevision,
    objectives,
  }
}
