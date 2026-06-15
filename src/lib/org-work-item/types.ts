export type OrgWorkItemDocumentType = 'boardAction' | 'auditQuery'

export const ORG_WORK_ITEM_STATUSES = [
  'at_commissioner',
  'assigned_to_division',
  'delegated_to_section',
  'assigned_to_supervisor',
  'assigned_to_officer',
  'pending_supervisor_approval',
  'pending_manager_approval',
  'pending_ac_approval',
  'pending_commissioner_approval',
  'completed',
] as const

export type OrgWorkItemStatus = (typeof ORG_WORK_ITEM_STATUSES)[number]

export type OrgWorkItemCascadeRole =
  | 'commissioner'
  | 'assistant_commissioner'
  | 'manager'
  | 'supervisor'

export type OrgWorkItemApprovalRole =
  | 'supervisor'
  | 'manager'
  | 'assistant_commissioner'
  | 'commissioner'
