const LETTERS = 'abcdefghijklmnopqrstuvwxyz'

/**
 * Governed numbering for contract hierarchy.
 */

/** Objective number (e.g. 1.1, 1.2) */
export function objectiveNumber(order: number): string {
  return String(order)
}

/** Measurable activity number (e.g. 1.1.1-KPI-1, 1.1.1-CRC-1) */
export function measurableActivityNumber(
  initiativeNumber: string,
  activityType: 'kpi' | 'cross-cutting',
  activityOrder: number,
): string {
  const cat = activityType === 'cross-cutting' ? 'CRC' : 'KPI'
  return `${initiativeNumber}-${cat}-${activityOrder}`
}

/** Department commissioner measurable activity (e.g. 1.1.1-MA-1) */
export function departmentMeasurableActivityNumber(
  initiativeNumber: string,
  activityOrder: number,
): string {
  return `${initiativeNumber}-MA-${activityOrder}`
}

type ActivityNumberingInput = {
  activityType?: 'kpi' | 'cross-cutting' | 'measurable' | string
  cascadeSource?: { nodeRole?: string } | null
}

/** KPI/CRC vs MA for leadership contracts (supervisor cascades store KPI as measurable + cascadeSource). */
export function resolveActivityNumberingType(
  activity: ActivityNumberingInput,
): 'kpi' | 'cross-cutting' | 'measurable' {
  if (activity.activityType === 'core') {
    return 'kpi'
  }
  if (activity.activityType === 'kpi' || activity.activityType === 'cross-cutting') {
    return activity.activityType
  }
  if (
    activity.cascadeSource?.nodeRole === 'managerAimAsMeasurable' ||
    activity.cascadeSource?.nodeRole === 'supervisorMeasurableAsInitiative'
  ) {
    return 'kpi'
  }
  return 'measurable'
}

function activityHasTitle(
  item: { title?: string | null } | null | undefined,
): boolean {
  return Boolean(item?.title && String(item.title).trim())
}

/** Position among titled activities under one initiative, starting at 1. */
export function displayedActivityOrder(
  activities: ReadonlyArray<{ title?: string | null } | null | undefined>,
  activityIndex: number,
): number {
  return activities.slice(0, activityIndex).filter(activityHasTitle).length + 1
}

/**
 * Rebuilds the full key list after a visible subset is reordered. Hidden rows
 * keep their slots.
 */
export function mergeKeyedListOrder<T extends { _key?: string }>(
  items: ReadonlyArray<T | null | undefined>,
  orderedVisibleKeys: string[],
  isVisible: (item: T & { _key: string }) => boolean = () => true,
): string[] | null {
  const list = items.filter((item): item is T => item != null)
  if (list.some(item => !item._key)) return null
  const keyed = list as Array<T & { _key: string }>

  const visibleKeys = keyed.filter(isVisible).map(item => item._key)
  if (orderedVisibleKeys.length !== visibleKeys.length) return null
  if (new Set(orderedVisibleKeys).size !== orderedVisibleKeys.length) return null
  const visibleSet = new Set(visibleKeys)
  if (orderedVisibleKeys.some(key => !visibleSet.has(key))) return null

  let nextVisible = 0
  return keyed.map(item =>
    isVisible(item) ? orderedVisibleKeys[nextVisible++] : item._key,
  )
}

/**
 * Rebuilds the full activity-key list after the titled (visible) subset is
 * reordered. Untitled rows keep their slots.
 */
export function mergeVisibleActivityOrder(
  activities: ReadonlyArray<
    { _key?: string; title?: string | null } | null | undefined
  >,
  orderedVisibleKeys: string[],
): string[] | null {
  return mergeKeyedListOrder(activities, orderedVisibleKeys, activityHasTitle)
}

/** Every measurable activity uses MA numbering (e.g. 1.1.1-MA-1). */
export function leadershipActivityNumber(
  initiativeNumber: string,
  _activity: ActivityNumberingInput,
  activityOrder: number,
): string {
  return departmentMeasurableActivityNumber(initiativeNumber, activityOrder)
}

/** Detailed task under an officer MA row (e.g. 1.1.1-MA-a). */
export function departmentDetailedTaskNumber(
  initiativeNumber: string,
  taskOrder: number,
): string {
  const letter = LETTERS[taskOrder - 1] ?? String(taskOrder)
  return `${initiativeNumber}-MA-${letter}`
}

/** Measurable activity sub-number: CC = a,b,c; KPI = E1,E2 */
export function measurableSubNumber(
  activityType: 'kpi' | 'cross-cutting',
  activityOrder: number,
): string {
  if (activityType === 'cross-cutting') {
    return LETTERS[activityOrder - 1] ?? String(activityOrder)
  }
  return `E${activityOrder}`
}
