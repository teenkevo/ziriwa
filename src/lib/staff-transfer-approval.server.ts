import 'server-only'

import type { AppRole } from '@/lib/app-role'
import { isSuperadmin } from '@/lib/authz/guards.server'

export interface TransferApprovalStep {
  approverRole?: string
  decision?: string
}

export function getPendingApprovalStep(
  approvals: TransferApprovalStep[],
): { index: number; approverRole: string } | null {
  const index = approvals.findIndex(a => a.decision === 'pending')
  if (index < 0) return null
  const role = approvals[index]?.approverRole
  if (!role) return null
  return { index, approverRole: role }
}

export async function canViewerApproveTransferStep(input: {
  pendingApproverRole: string
  viewerStaffRole: string | null
  appRole: AppRole | null
}): Promise<boolean> {
  if (await isSuperadmin()) return true
  if (input.appRole === 'commissioner_general') return true

  if (
    input.viewerStaffRole &&
    input.viewerStaffRole === input.pendingApproverRole
  ) {
    return true
  }

  if (input.appRole && input.appRole === input.pendingApproverRole) {
    return true
  }

  return false
}

export function viewerCanSeeTransferInbox(input: {
  viewerStaffRole: string | null
  appRole: AppRole | null
  isSuperadmin: boolean
}): boolean {
  if (input.isSuperadmin) return true
  if (input.appRole === 'commissioner_general') return true
  if (input.appRole === 'commissioner') return true
  if (input.appRole === 'assistant_commissioner') return true
  if (input.viewerStaffRole === 'manager') return true
  if (input.viewerStaffRole === 'supervisor') return true
  return false
}
