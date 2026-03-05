const LETTERS = 'abcdefghijklmnopqrstuvwxyz'

/**
 * Governed numbering for contract hierarchy.
 */

/** Objective number (e.g. 1.1, 1.2) */
export function objectiveNumber(order: number): string {
  return String(order)
}

/** Measurable activity number (e.g. 1.1.1-KPI-1, 1.1.1-CC-1) */
export function measurableActivityNumber(
  initiativeNumber: string,
  activityType: 'kpi' | 'cross-cutting',
  activityOrder: number,
): string {
  const cat = activityType === 'cross-cutting' ? 'CC' : 'KPI'
  return `${initiativeNumber}-${cat}-${activityOrder}`
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
