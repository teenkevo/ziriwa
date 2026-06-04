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

/** Number for supervisor/officer/department tree rows (e.g. 1.1.1-KPI-1 or 1.1.1-MA-1). */
export function leadershipActivityNumber(
  initiativeNumber: string,
  activity: ActivityNumberingInput,
  activityOrder: number,
): string {
  const kind = resolveActivityNumberingType(activity)
  if (kind === 'kpi' || kind === 'cross-cutting') {
    return measurableActivityNumber(initiativeNumber, kind, activityOrder)
  }
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
