export const COMMISSIONER_LEVEL_DIVISION = '__commissioner__'

export function workflowStatusLabel(status?: string) {
  if (status === 'at_commissioner') return 'At commissioner'
  if (status === 'assigned_to_division') return 'Assigned to division'
  if (status === 'delegated_to_section') return 'Delegated to section'
  if (status === 'completed') return 'Completed'
  return 'Open'
}

export function responsibilityCenterLabel(row: {
  sectionName?: string
  divisionName?: string
}) {
  if (row.sectionName) return row.sectionName
  if (row.divisionName) return row.divisionName
  return 'Commissioner'
}

export function divisionIdForApi(divisionId: string) {
  if (!divisionId || divisionId === COMMISSIONER_LEVEL_DIVISION) return null
  return divisionId
}

export function divisionIdFromAction(divisionId?: string) {
  return divisionId ?? COMMISSIONER_LEVEL_DIVISION
}
