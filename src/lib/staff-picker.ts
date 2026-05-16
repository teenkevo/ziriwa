export interface StaffPickerMember {
  _id: string
  fullName: string
  staffId?: string
  idNumber?: string
  /** Department, division, or section id this person currently heads. */
  assignedEntityId?: string
  assignedLabel?: string
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
): string {
  const base = `${member.fullName}${member.staffId ? ` (${member.staffId})` : ''}`
  if (disabled && member.assignedLabel) {
    return `${base} (${roleLabel} — ${member.assignedLabel})`
  }
  return base
}
