export const PROJECT_MEMBER_EMAIL_ACTIVE_ERROR =
  'This email is already assigned to this project.'

export const PROJECT_MEMBER_EMAIL_INACTIVE_ERROR =
  'This person is an inactive project member. Reactivate them from the members list.'

interface ProjectMemberEmailRow {
  email?: string | null
  status: string
  workstreamId?: string | null
}

export function getProjectMemberEmailConflict(
  email: string,
  roster: ProjectMemberEmailRow[],
): 'active' | 'inactive' | null {
  const normalized = email.trim().toLowerCase()
  if (!normalized) return null

  const match = roster.find(
    row => row.email?.trim().toLowerCase() === normalized,
  )
  if (!match) return null
  return match.status === 'active' ? 'active' : 'inactive'
}

export function projectMemberEmailConflictMessage(
  conflict: 'active' | 'inactive',
): string {
  return conflict === 'active'
    ? PROJECT_MEMBER_EMAIL_ACTIVE_ERROR
    : PROJECT_MEMBER_EMAIL_INACTIVE_ERROR
}

export const WORKSTREAM_MEMBER_EMAIL_ACTIVE_ERROR =
  'This email is already a member of this workstream.'

export const WORKSTREAM_MEMBER_EMAIL_INACTIVE_ERROR =
  'This person is an inactive member of this workstream.'

export function workstreamMemberEmailConflictMessage(
  conflict: 'active' | 'inactive',
): string {
  return conflict === 'active'
    ? WORKSTREAM_MEMBER_EMAIL_ACTIVE_ERROR
    : WORKSTREAM_MEMBER_EMAIL_INACTIVE_ERROR
}

export function getWorkstreamMemberEmailConflictFromRoster(
  email: string,
  roster: ProjectMemberEmailRow[],
  workstreamId: string,
): 'active' | 'inactive' | null {
  const normalized = email.trim().toLowerCase()
  if (!normalized || !workstreamId) return null

  const match = roster.find(
    row =>
      row.workstreamId === workstreamId &&
      row.email?.trim().toLowerCase() === normalized,
  )
  if (!match) return null
  return match.status === 'active' ? 'active' : 'inactive'
}
