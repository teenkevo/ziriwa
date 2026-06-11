/** Registry of resource identifiers shown in the audit log table. */
export const AUDIT_RESOURCE_TYPES = {
  department: 'Department',
  division: 'Division',
  section: 'Section',
  sectionContract: 'Contract',
  weeklySprint: 'Weekly Sprint',
  sprintTask: 'Sprint Task',
  stakeholderEngagement: 'Stakeholders',
  staff: 'Staff',
  sectionDelegation: 'Delegation',
  staffTransferRequest: 'Transfer Request',
  appNotification: 'Notification',
  impersonation: 'Impersonation',
} as const

export type AuditResourceType = keyof typeof AUDIT_RESOURCE_TYPES

export const AUDIT_CHANGE_TYPES = {
  CREATED: 'CREATED',
  UPDATED: 'UPDATED',
  DELETED: 'DELETED',
  SUBMITTED: 'SUBMITTED',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  ASSIGNED: 'ASSIGNED',
  DELEGATED: 'DELEGATED',
  TRANSFERRED: 'TRANSFERRED',
  REVIEWED: 'REVIEWED',
  IMPERSONATION_STARTED: 'IMPERSONATION_STARTED',
  IMPERSONATION_STOPPED: 'IMPERSONATION_STOPPED',
} as const

export type AuditChangeType = keyof typeof AUDIT_CHANGE_TYPES

export interface AuditActor {
  name: string
  email: string
  staffId?: string
  impersonatorName?: string
  impersonatorEmail?: string
}

export interface RecordAuditInput {
  change: AuditChangeType
  resourceType: AuditResourceType
  resourceId: string
  resourceLabel: string
  message: string
  actionKey?: string
  previousValue?: unknown
  newValue?: unknown
  scopeSectionId?: string
  actor?: AuditActor | null
}

export interface AuditLogRow {
  id: string
  timestamp: string
  authorName: string
  authorEmail: string
  impersonatorName?: string
  impersonatorEmail?: string
  change: string
  resourceType: string
  resourceLabel: string
  resourceId: string
  message: string
  previousValue?: string
  newValue?: string
}
