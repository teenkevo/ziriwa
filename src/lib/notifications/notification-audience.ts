import type { AppRole } from '@/lib/app-role'
import type { NotificationType } from '@/lib/notifications/types'

/** Work assigned to the officer and outcomes on their submissions. */
const OFFICER_TYPES: NotificationType[] = [
  'sprint_task_assigned',
  'sprint_task_priority_changed',
  'sprint_work_approved',
  'sprint_work_rejected',
  'contract_deliverable_approved',
  'contract_deliverable_rejected',
  'contract_inputs_approved',
  'contract_inputs_rejected',
  'transfer_approved',
  'transfer_rejected',
  'delegation_started',
]

/** Supervisors also see team submissions and transfer approvals at their step. */
const SUPERVISOR_TYPES: NotificationType[] = [
  ...OFFICER_TYPES,
  'sprint_submission_pending',
  'sprint_unsubmitted',
  'sprint_task_reviewed',
  'sprint_task_manager_approved',
  'sprint_task_manager_rejected',
  'sprint_task_manager_revisions_requested',
  'sprint_plan_review_complete',
  'transfer_pending_approval',
]

/** Managers inherit supervisor visibility plus sprint review signals. */
const MANAGER_TYPES: NotificationType[] = [...SUPERVISOR_TYPES]

/**
 * Returns allowed notification types for the viewer, or `null` when all types
 * should be shown (global admin / org leadership).
 */
export function notificationTypesForViewer(input: {
  staffRole: string | null
  appRole: AppRole | null
  isGlobalAdmin: boolean
}): NotificationType[] | null {
  if (input.isGlobalAdmin) return null

  const role = input.staffRole ?? input.appRole
  if (!role) return OFFICER_TYPES

  if (role === 'officer') return OFFICER_TYPES
  if (role === 'supervisor') return SUPERVISOR_TYPES
  if (role === 'manager') return MANAGER_TYPES

  if (
    input.appRole === 'assistant_commissioner' ||
    input.appRole === 'commissioner' ||
    input.appRole === 'commissioner_general'
  ) {
    return null
  }

  return OFFICER_TYPES
}
