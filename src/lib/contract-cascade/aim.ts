/** Manager KPI AIM is required to cascade (AIM becomes supervisor measurable title). */
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

/** Project PM measurable activities cascade on title; mainstream manager KPIs need AIM. */
export function managerActivityCanCascade(
  activity: ManagerCascadeActivityLike,
): boolean {
  if (activity.activityType === 'measurable') {
    return Boolean(activity.title?.trim())
  }
  if (activity.activityType === 'kpi') {
    return managerKpiHasCascadeAim(activity.aim)
  }
  return false
}

/** Label shown in cascade picker secondary line (AIM for KPI, title echo for measurable). */
export function managerActivityCascadeDetail(
  activity: ManagerCascadeActivityLike,
): string {
  if (activity.activityType === 'measurable') {
    return activity.title?.trim() ?? ''
  }
  return activity.aim?.trim() ?? ''
}
