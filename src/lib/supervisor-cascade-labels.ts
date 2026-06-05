/** Copy for supervisor / workstream-lead cascade from upstream manager contract. */
export function getSupervisorCascadeDialogTitle(
  isProjectWorkstream: boolean,
): string {
  return isProjectWorkstream
    ? "Cascade from project manager's contract"
    : "Cascade from manager's contract"
}

export function getSupervisorUpstreamRoleLabel(
  isProjectWorkstream: boolean,
): string {
  return isProjectWorkstream ? 'project manager' : 'manager'
}

export function getSupervisorUpstreamContractNoun(
  isProjectWorkstream: boolean,
): string {
  return isProjectWorkstream ? 'project manager contract' : 'manager contract'
}

export function getCascadeActivityTypeLabel(
  activityType: 'kpi' | 'measurable' | 'cross-cutting',
  isProjectWorkstream: boolean,
): string {
  if (activityType === 'measurable' || isProjectWorkstream) return 'MA'
  return 'KPI'
}
