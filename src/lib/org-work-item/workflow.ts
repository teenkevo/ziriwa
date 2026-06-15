import { isPast, parseISO, startOfDay } from 'date-fns'

import type {
  OrgWorkItemApprovalRole,
  OrgWorkItemCascadeRole,
  OrgWorkItemStatus,
} from '@/lib/org-work-item/types'

export const ORG_WORK_ITEM_WORKFLOW_STEPS = [
  { key: 'at_commissioner', label: 'Commissioner' },
  { key: 'assigned_to_division', label: 'Division' },
  { key: 'delegated_to_section', label: 'Section' },
  { key: 'assigned_to_supervisor', label: 'Supervisor' },
  { key: 'assigned_to_officer', label: 'Officer' },
  { key: 'completed', label: 'Completed' },
] as const

export function orgWorkItemStatusLabel(status?: string): string {
  if (status === 'at_commissioner') return 'At commissioner'
  if (status === 'assigned_to_division') return 'Assigned to division'
  if (status === 'delegated_to_section') return 'Assigned to section'
  if (status === 'assigned_to_supervisor') return 'Assigned to supervisor'
  if (status === 'assigned_to_officer') return 'Assigned to officer'
  if (status === 'pending_supervisor_approval') return 'Pending supervisor approval'
  if (status === 'pending_manager_approval') return 'Pending manager approval'
  if (status === 'pending_ac_approval') return 'Pending AC approval'
  if (status === 'pending_commissioner_approval')
    return 'Pending commissioner approval'
  if (status === 'completed') return 'Completed'
  return 'Open'
}

export function orgWorkItemWorkflowStepIndex(status?: string): number {
  if (!status || status === 'completed') {
    return ORG_WORK_ITEM_WORKFLOW_STEPS.length - 1
  }
  if (status.startsWith('pending_')) {
    return ORG_WORK_ITEM_WORKFLOW_STEPS.findIndex(s => s.key === 'assigned_to_officer')
  }
  const idx = ORG_WORK_ITEM_WORKFLOW_STEPS.findIndex(s => s.key === status)
  return idx >= 0 ? idx : 0
}

export function orgWorkItemCascadeStatusForRole(
  role: OrgWorkItemCascadeRole,
): OrgWorkItemStatus {
  if (role === 'commissioner') return 'at_commissioner'
  if (role === 'assistant_commissioner') return 'assigned_to_division'
  if (role === 'manager') return 'delegated_to_section'
  return 'assigned_to_supervisor'
}

export function orgWorkItemNextCascadeStatus(
  currentStatus?: string,
): OrgWorkItemStatus | null {
  if (currentStatus === 'at_commissioner') return 'assigned_to_division'
  if (currentStatus === 'assigned_to_division') return 'delegated_to_section'
  if (currentStatus === 'delegated_to_section') return 'assigned_to_supervisor'
  if (currentStatus === 'assigned_to_supervisor') return 'assigned_to_officer'
  return null
}

export function orgWorkItemPendingApprovalRole(
  status?: string,
): OrgWorkItemApprovalRole | null {
  if (status === 'pending_supervisor_approval') return 'supervisor'
  if (status === 'pending_manager_approval') return 'manager'
  if (status === 'pending_ac_approval') return 'assistant_commissioner'
  if (status === 'pending_commissioner_approval') return 'commissioner'
  return null
}

export function orgWorkItemNextApprovalStatus(
  currentStatus?: string,
): OrgWorkItemStatus | null {
  if (currentStatus === 'pending_supervisor_approval')
    return 'pending_manager_approval'
  if (currentStatus === 'pending_manager_approval') return 'pending_ac_approval'
  if (currentStatus === 'pending_ac_approval')
    return 'pending_commissioner_approval'
  if (currentStatus === 'pending_commissioner_approval') return 'completed'
  return null
}

export function orgWorkItemRejectStatus(): OrgWorkItemStatus {
  return 'assigned_to_officer'
}

export function orgWorkItemCanCascadeAtStatus(
  status?: string,
  role?: string | null,
): boolean {
  if (!status || !role) return false
  if (role === 'commissioner' && status === 'at_commissioner') return true
  if (role === 'assistant_commissioner' && status === 'assigned_to_division')
    return true
  if (role === 'manager' && status === 'delegated_to_section') return true
  if (role === 'supervisor' && status === 'assigned_to_supervisor') return true
  return false
}

export function orgWorkItemCanSubmitResponse(
  status?: string,
  role?: string | null,
): boolean {
  return role === 'officer' && status === 'assigned_to_officer'
}

export function orgWorkItemCanApprove(
  status?: string,
  role?: string | null,
): boolean {
  const pending = orgWorkItemPendingApprovalRole(status)
  if (!pending || !role) return false
  if (pending === 'supervisor') return role === 'supervisor'
  if (pending === 'manager') return role === 'manager'
  if (pending === 'assistant_commissioner')
    return role === 'assistant_commissioner'
  if (pending === 'commissioner') return role === 'commissioner'
  return false
}

export function orgWorkItemIsOverdue(
  dueDate?: string,
  status?: string,
): boolean {
  if (!dueDate || status === 'completed') return false
  try {
    return isPast(startOfDay(parseISO(dueDate)))
  } catch {
    return false
  }
}
