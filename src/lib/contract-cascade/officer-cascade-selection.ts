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
        taskKeys: [],
      }))
      .filter(activity => activity.activityKey)
  }
  return selection.activityKeys
    .map(key => key.trim())
    .filter(Boolean)
    .map(activityKey => ({ activityKey, taskKeys: [] }))
}

export function countOfficerImportableTasks(
  selections: CascadeImportSelection[],
) {
  let count = 0
  for (const selection of selections) {
    count += expandOfficerCascadeActivities(selection).length
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
    const activityKeysRaw = (item as CascadeImportSelection).activityKeys
    const activities: CascadeImportActivitySelection[] = []

    if (Array.isArray(activitiesRaw) && activitiesRaw.length > 0) {
      for (const activity of activitiesRaw) {
        if (!activity || typeof activity !== 'object') return null
        const activityKey = String(
          (activity as CascadeImportActivitySelection).activityKey ?? '',
        ).trim()
        if (!activityKey) return null
        activities.push({ activityKey, taskKeys: [] })
      }
    } else if (Array.isArray(activityKeysRaw)) {
      for (const key of activityKeysRaw) {
        if (typeof key !== 'string' || !key.trim()) continue
        activities.push({ activityKey: key.trim(), taskKeys: [] })
      }
    } else {
      return null
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
