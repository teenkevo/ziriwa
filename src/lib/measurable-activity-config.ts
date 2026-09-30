const ACTIVITY_PRIORITIES = [
  'highest',
  'high',
  'medium',
  'low',
  'lowest',
] as const

/** Extra measurable-activity fields used when the activity carries detailed-task settings. */
export function measurableActivityConfigPatch(
  basePath: string,
  fields: {
    priority?: unknown
    expectedDeliverable?: unknown
    reportingPeriodStart?: unknown
  },
): Record<string, unknown> {
  const setPayload: Record<string, unknown> = {}
  if (
    typeof fields.priority === 'string' &&
    (ACTIVITY_PRIORITIES as readonly string[]).includes(fields.priority)
  ) {
    setPayload[`${basePath}.priority`] = fields.priority
  }
  if (fields.expectedDeliverable !== undefined) {
    const value =
      typeof fields.expectedDeliverable === 'string'
        ? fields.expectedDeliverable.trim()
        : ''
    setPayload[`${basePath}.expectedDeliverable`] = value || undefined
  }
  if (fields.reportingPeriodStart !== undefined) {
    const value =
      typeof fields.reportingPeriodStart === 'string'
        ? fields.reportingPeriodStart.trim()
        : ''
    setPayload[`${basePath}.reportingPeriodStart`] = value || undefined
  }
  return setPayload
}
