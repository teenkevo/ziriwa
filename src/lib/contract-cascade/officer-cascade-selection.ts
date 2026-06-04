import type {
  CascadeImportActivitySelection,
  CascadeImportSelection,
} from './types'

export function taskSelectionId(activityKey: string, taskKey: string) {
  return `${activityKey}::${taskKey}`
}

export function parseTaskSelectionId(id: string): {
  activityKey: string
  taskKey: string
} | null {
  const idx = id.indexOf('::')
  if (idx <= 0) return null
  const activityKey = id.slice(0, idx).trim()
  const taskKey = id.slice(idx + 2).trim()
  if (!activityKey || !taskKey) return null
  return { activityKey, taskKey }
}

export function expandOfficerCascadeActivities(
  selection: CascadeImportSelection,
): CascadeImportActivitySelection[] {
  if (selection.activities?.length) {
    return selection.activities
      .map(activity => ({
        activityKey: activity.activityKey.trim(),
        taskKeys: activity.taskKeys
          .map(key => key.trim())
          .filter(Boolean),
      }))
      .filter(activity => activity.activityKey && activity.taskKeys.length > 0)
  }
  return []
}

export function countOfficerImportableTasks(
  selections: CascadeImportSelection[],
) {
  let count = 0
  for (const selection of selections) {
    for (const activity of expandOfficerCascadeActivities(selection)) {
      count += activity.taskKeys.length
    }
  }
  return count
}

export function normalizeOfficerCascadeSelections(
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
    const activitiesRaw = (item as CascadeImportSelection).activities
    if (!Array.isArray(activitiesRaw)) return null

    const activities: CascadeImportActivitySelection[] = []
    for (const activity of activitiesRaw) {
      if (!activity || typeof activity !== 'object') return null
      const activityKey = String(
        (activity as CascadeImportActivitySelection).activityKey ?? '',
      ).trim()
      const taskKeysRaw = (activity as CascadeImportActivitySelection).taskKeys
      if (!activityKey || !Array.isArray(taskKeysRaw)) return null
      const taskKeys = taskKeysRaw
        .filter((k): k is string => typeof k === 'string' && Boolean(k.trim()))
        .map(k => k.trim())
      if (taskKeys.length === 0) continue
      activities.push({ activityKey, taskKeys })
    }

    if (activities.length === 0) continue
    out.push({
      initiativeKey,
      activityKeys: activities.map(activity => activity.activityKey),
      activities,
    })
  }

  return out.length > 0 ? out : null
}
