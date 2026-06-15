export const COMMISSIONER_LEVEL_DIVISION = '__commissioner__'

import { orgWorkItemStatusLabel } from '@/lib/org-work-item/workflow'

export function workflowStatusLabel(status?: string) {
  return orgWorkItemStatusLabel(status)
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
