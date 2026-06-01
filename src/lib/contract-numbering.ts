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
