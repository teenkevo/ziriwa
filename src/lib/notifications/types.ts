export type NotificationType =
  | 'sprint_task_assigned'
  | 'sprint_task_priority_changed'
  | 'sprint_work_approved'
  | 'sprint_work_rejected'
  | 'sprint_submission_pending'
  | 'sprint_unsubmitted'
  | 'sprint_task_reviewed'
  | 'sprint_task_manager_approved'
  | 'sprint_task_manager_rejected'
  | 'sprint_task_manager_revisions_requested'
  | 'sprint_plan_review_complete'
  | 'contract_deliverable_approved'
  | 'contract_deliverable_rejected'
  | 'contract_inputs_approved'
  | 'contract_inputs_rejected'
  | 'delegation_started'
  | 'transfer_pending_approval'
  | 'transfer_approved'
  | 'transfer_rejected'

export interface CreateNotificationInput {
  recipientStaffId: string
  type: NotificationType
  title: string
  body?: string
  href?: string
  metadata?: Record<string, unknown>
}

export interface AppNotificationRow {
  _id: string
  type: string
  title: string
  body?: string
  href?: string
  readAt?: string
  createdAt: string
}
