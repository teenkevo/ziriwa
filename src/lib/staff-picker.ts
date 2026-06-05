import type { ProjectRole } from '@/lib/project-role'

export interface StaffPickerMember {
  _id: string
  fullName: string
  staffId?: string
  idNumber?: string
  projectRole?: ProjectRole
  /** Department, division, or section id this person currently heads. */
  assignedEntityId?: string
  assignedLabel?: string
}

/** PM/DPM cannot be assigned as workstream leads. */
export function filterWorkstreamLeadPickerMembers(
  members: StaffPickerMember[],
): StaffPickerMember[] {
  return members.filter(
    m =>
      m.projectRole !== 'project_manager' &&
      m.projectRole !== 'deputy_project_manager',
  )
}

export function isStaffPickerDisabled(
  member: StaffPickerMember,
  currentEntityId?: string,
): boolean {
  if (!member.assignedEntityId) return false
  if (!currentEntityId) return true
  return member.assignedEntityId !== currentEntityId
}

export function formatStaffPickerLabel(
  member: StaffPickerMember,
  roleLabel: string,
  disabled: boolean,
  showStaffId = true,
  assignedLabelFormat: 'brackets' | 'role-suffix' = 'role-suffix',
): string {
  const base = showStaffId && member.staffId
    ? `${member.fullName} (${member.staffId})`
    : member.fullName
  if (disabled && member.assignedLabel) {
    if (assignedLabelFormat === 'brackets') {
      return `${base} (${member.assignedLabel})`
    }
    return `${base} (${roleLabel} — ${member.assignedLabel})`
  }
  return base
}
