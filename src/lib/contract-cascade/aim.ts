/** Kept for callers that still inspect AIM text. Cascade no longer copies AIM downward. */
export function managerKpiHasCascadeAim(aim: string | undefined | null): boolean {
  return Boolean(aim?.trim())
}

export function normalizeAim(aim: string | undefined | null): string {
  return aim?.trim() ?? ''
}

interface ManagerCascadeActivityLike {
  activityType?: string
  title?: string
  aim?: string | null
}

/** A measurable activity cascades on its title. The next level writes its own activities. */
export function managerActivityCanCascade(
  activity: ManagerCascadeActivityLike,
): boolean {
  // Cross-cutting work stays with the level that owns it.
  if (activity.activityType === 'cross-cutting') return false
  if (
    activity.activityType === 'measurable' ||
    activity.activityType === 'core' ||
    activity.activityType === 'kpi'
  ) {
    return Boolean(activity.title?.trim())
  }
  return false
}

/** Label shown in cascade picker secondary line (AIM for KPI, title echo for measurable). */
export function managerActivityCascadeDetail(
  activity: ManagerCascadeActivityLike,
): string {
  if (
    activity.activityType === 'measurable' ||
    activity.activityType === 'core'
  ) {
    return activity.title?.trim() ?? ''
  }
  return activity.aim?.trim() ?? ''
}
