import { normalizeAim } from './aim'
import type {
  CascadeActivityRewrite,
  CascadeImportSelection,
  CascadeRewriteContextItem,
} from './types'
import type { SsmartaObjective } from '@/sanity/lib/section-contracts/get-section-contract'

function taskText(task: { task?: string } | string): string {
  if (typeof task === 'string') return task.trim()
  return task.task?.trim() ?? ''
}

function findManagerKpi(
  objectives: SsmartaObjective[],
  initiativeKey: string,
  activityKey: string,
) {
  for (const objective of objectives) {
    const initiative = objective.initiatives?.find(i => i._key === initiativeKey)
    if (!initiative) continue
    const kpi = initiative.measurableActivities?.find(a => a._key === activityKey)
    if (kpi) {
      return { objective, initiative, kpi }
    }
  }
  return null
}

export function buildCascadeRewriteContexts(
  managerObjectives: SsmartaObjective[],
  selections: CascadeImportSelection[],
  options?: { upstreamIsProjectContract?: boolean },
): CascadeRewriteContextItem[] {
  const upstreamIsProjectContract = options?.upstreamIsProjectContract === true
  const items: CascadeRewriteContextItem[] = []

  for (const selection of selections) {
    for (const activityKey of selection.activityKeys) {
      const located = findManagerKpi(
        managerObjectives,
        selection.initiativeKey,
        activityKey,
      )
      if (!located) continue

      const { objective, initiative, kpi } = located
      const managerTasks = (kpi.tasks ?? []).map(taskText).filter(Boolean)
      const isProjectCascade =
        upstreamIsProjectContract || kpi.activityType === 'measurable'
      const measurableTitle = isProjectCascade
        ? (kpi.title?.trim() ?? '')
        : normalizeAim(kpi.aim)

      items.push({
        activityKey,
        initiativeKey: selection.initiativeKey,
        initiativeCode: initiative.code,
        managerObjectiveCode: objective.code,
        managerObjectiveTitle: objective.title,
        managerInitiativeTitle: initiative.title,
        managerKpiTitle: kpi.title,
        managerAim: isProjectCascade
          ? (kpi.title?.trim() ?? '')
          : (kpi.aim?.trim() ?? ''),
        managerTargetDate: kpi.targetDate,
        managerTasks: isProjectCascade ? [] : managerTasks,
        asIs: {
          objectiveTitle: initiative.title,
          initiativeTitle: kpi.title,
          measurableTitle,
          tasks: isProjectCascade ? [] : managerTasks,
        },
      })
    }
  }

  return items
}

export function normalizeCascadeSelections(
  raw: unknown,
): CascadeImportSelection[] | null {
  if (!Array.isArray(raw)) return null
  const out: CascadeImportSelection[] = []
  for (const item of raw) {
    if (
      !item ||
      typeof item !== 'object' ||
      typeof (item as CascadeImportSelection).initiativeKey !== 'string'
    ) {
      return null
    }
    const initiativeKey = (item as CascadeImportSelection).initiativeKey.trim()
    const activityKeysRaw = (item as CascadeImportSelection).activityKeys
    if (!Array.isArray(activityKeysRaw)) return null
    const activityKeys = activityKeysRaw
      .filter((k): k is string => typeof k === 'string' && Boolean(k.trim()))
      .map(k => k.trim())
    if (activityKeys.length === 0) continue
    out.push({ initiativeKey, activityKeys })
  }
  return out.length > 0 ? out : null
}

export function normalizeCascadeRewrites(
  raw: unknown,
  selections: CascadeImportSelection[],
): CascadeActivityRewrite[] | null {
  if (!Array.isArray(raw)) return null

  const allowed = new Map<string, string>()
  for (const selection of selections) {
    if (selection.activities?.length) {
      for (const activity of selection.activities) {
        allowed.set(activity.activityKey, selection.initiativeKey)
      }
    } else {
      for (const activityKey of selection.activityKeys) {
        allowed.set(activityKey, selection.initiativeKey)
      }
    }
  }

  const out: CascadeActivityRewrite[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') return null
    const activityKey = String(
      (item as CascadeActivityRewrite).activityKey ?? '',
    ).trim()
    const initiativeKey = String(
      (item as CascadeActivityRewrite).initiativeKey ?? '',
    ).trim()
    if (!activityKey || !allowed.has(activityKey)) return null
    if (allowed.get(activityKey) !== initiativeKey) return null

    const objectiveTitle = String(
      (item as CascadeActivityRewrite).objectiveTitle ?? '',
    ).trim()
    const initiativeTitle = String(
      (item as CascadeActivityRewrite).initiativeTitle ?? '',
    ).trim()
    const measurableTitle = String(
      (item as CascadeActivityRewrite).measurableTitle ?? '',
    ).trim()
    const tasksRaw = (item as CascadeActivityRewrite).tasks
    if (!objectiveTitle || !initiativeTitle || !measurableTitle) return null
    if (!Array.isArray(tasksRaw)) return null
    const tasks = tasksRaw
      .map(task => String(task ?? '').trim())
      .filter(Boolean)

    out.push({
      activityKey,
      initiativeKey,
      objectiveTitle,
      initiativeTitle,
      measurableTitle,
      tasks,
    })
  }

  if (out.length !== allowed.size) return null
  return out
}
