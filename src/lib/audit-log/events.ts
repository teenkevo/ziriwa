import 'server-only'

import { recordAudit } from '@/lib/audit-log/record-audit.server'
import type {
  AuditActor,
  AuditChangeType,
  AuditResourceType,
} from '@/lib/audit-log/types'

interface AuditEventBase {
  resourceId: string
  resourceLabel: string
  message: string
  actionKey?: string
  previousValue?: unknown
  newValue?: unknown
  scopeSectionId?: string
}

function emit(
  change: AuditChangeType,
  resourceType: AuditResourceType,
  input: AuditEventBase,
): void {
  recordAudit({ change, resourceType, ...input })
}

export const audit = {
  department: {
    created: (id: string, label: string, newValue?: unknown) =>
      emit('CREATED', 'department', {
        resourceId: id,
        resourceLabel: label,
        message: 'Department created',
        actionKey: 'department.create',
        newValue,
      }),
    updated: (id: string, label: string, patch?: unknown) =>
      emit('UPDATED', 'department', {
        resourceId: id,
        resourceLabel: label,
        message: 'Department updated',
        actionKey: 'department.update',
        newValue: patch,
      }),
    deleted: (id: string, label: string) =>
      emit('DELETED', 'department', {
        resourceId: id,
        resourceLabel: label,
        message: 'Department deleted',
        actionKey: 'department.delete',
      }),
  },
  division: {
    created: (id: string, label: string, newValue?: unknown) =>
      emit('CREATED', 'division', {
        resourceId: id,
        resourceLabel: label,
        message: 'Division created',
        actionKey: 'division.create',
        newValue,
      }),
    updated: (id: string, label: string, patch?: unknown) =>
      emit('UPDATED', 'division', {
        resourceId: id,
        resourceLabel: label,
        message: 'Division updated',
        actionKey: 'division.update',
        newValue: patch,
      }),
    deleted: (id: string, label: string) =>
      emit('DELETED', 'division', {
        resourceId: id,
        resourceLabel: label,
        message: 'Division deleted',
        actionKey: 'division.delete',
      }),
  },
  section: {
    created: (id: string, label: string, newValue?: unknown) =>
      emit('CREATED', 'section', {
        resourceId: id,
        resourceLabel: label,
        message: 'Section created',
        actionKey: 'section.create',
        newValue,
      }),
    updated: (id: string, label: string, patch?: unknown) =>
      emit('UPDATED', 'section', {
        resourceId: id,
        resourceLabel: label,
        message: 'Section updated',
        actionKey: 'section.update',
        newValue: patch,
      }),
    deleted: (id: string, label: string) =>
      emit('DELETED', 'section', {
        resourceId: id,
        resourceLabel: label,
        message: 'Section deleted',
        actionKey: 'section.delete',
      }),
  },
  sectionContract: {
    updated: (
      id: string,
      label: string,
      op: string,
      sectionId?: string,
      patch?: unknown,
    ) =>
      emit('UPDATED', 'sectionContract', {
        resourceId: id,
        resourceLabel: label,
        message: `Contract: ${op}`,
        actionKey: `section-contract.${op}`,
        scopeSectionId: sectionId,
        newValue: patch,
      }),
  },
  weeklySprint: {
    created: (id: string, label: string, sectionId?: string) =>
      emit('CREATED', 'weeklySprint', {
        resourceId: id,
        resourceLabel: label,
        message: 'Weekly sprint draft created',
        actionKey: 'weekly-sprint.create',
        scopeSectionId: sectionId,
      }),
    updated: (id: string, label: string, action: string, sectionId?: string) =>
      emit('UPDATED', 'weeklySprint', {
        resourceId: id,
        resourceLabel: label,
        message: `Weekly sprint: ${action}`,
        actionKey: `weekly-sprint.${action}`,
        scopeSectionId: sectionId,
      }),
    submitted: (id: string, label: string, sectionId?: string) =>
      emit('SUBMITTED', 'weeklySprint', {
        resourceId: id,
        resourceLabel: label,
        message: 'Weekly sprint submitted for manager review',
        actionKey: 'weekly-sprint.submit',
        scopeSectionId: sectionId,
      }),
    reviewed: (
      id: string,
      label: string,
      taskDesc: string,
      status: string,
      sectionId?: string,
    ) =>
      emit('REVIEWED', 'weeklySprint', {
        resourceId: id,
        resourceLabel: label,
        message: `Manager reviewed task: ${taskDesc} (${status})`,
        actionKey: 'weekly-sprint.review-task',
        scopeSectionId: sectionId,
        newValue: { reviewStatus: status, task: taskDesc },
      }),
    deleted: (id: string, label: string, sectionId?: string) =>
      emit('DELETED', 'weeklySprint', {
        resourceId: id,
        resourceLabel: label,
        message: 'Draft weekly sprint deleted',
        actionKey: 'weekly-sprint.delete',
        scopeSectionId: sectionId,
      }),
  },
  stakeholderEngagement: {
    updated: (id: string, label: string, sectionId?: string, patch?: unknown) =>
      emit('UPDATED', 'stakeholderEngagement', {
        resourceId: id,
        resourceLabel: label,
        message: 'Stakeholder engagement updated',
        actionKey: 'stakeholder-engagement.update',
        scopeSectionId: sectionId,
        newValue: patch,
      }),
  },
  staff: {
    created: (id: string, label: string, newValue?: unknown) =>
      emit('CREATED', 'staff', {
        resourceId: id,
        resourceLabel: label,
        message: 'Staff member created',
        actionKey: 'staff.create',
        newValue,
      }),
    updated: (id: string, label: string, patch?: unknown) =>
      emit('UPDATED', 'staff', {
        resourceId: id,
        resourceLabel: label,
        message: 'Staff profile updated',
        actionKey: 'staff.update',
        newValue: patch,
      }),
  },
  sectionDelegation: {
    created: (id: string, label: string, sectionId?: string, detail?: unknown) =>
      emit('DELEGATED', 'sectionDelegation', {
        resourceId: id,
        resourceLabel: label,
        message: 'Section delegation created',
        actionKey: 'section-delegation.create',
        scopeSectionId: sectionId,
        newValue: detail,
      }),
  },
  impersonation: {
    started: (
      staffId: string,
      label: string,
      detail?: unknown,
      actor?: AuditActor | null,
    ) =>
      recordAudit({
        change: 'IMPERSONATION_STARTED',
        resourceType: 'impersonation',
        resourceId: staffId,
        resourceLabel: label,
        message: `Impersonation started for ${label}`,
        actionKey: 'impersonation.start',
        newValue: detail,
        actor,
      }),
    stopped: (
      staffId: string,
      label: string,
      detail?: unknown,
      actor?: AuditActor | null,
    ) =>
      recordAudit({
        change: 'IMPERSONATION_STOPPED',
        resourceType: 'impersonation',
        resourceId: staffId,
        resourceLabel: label,
        message: `Impersonation stopped for ${label}`,
        actionKey: 'impersonation.stop',
        newValue: detail,
        actor,
      }),
  },
}
