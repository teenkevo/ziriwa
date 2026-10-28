import type { CascadeAssigneeOption } from './types'

export const ASSIGN_TO_MYSELF_LABEL = 'Assign to myself'
export const ASSIGNED_TO_MYSELF_LABEL = 'Assigned to Myself'

/** Puts the contract owner last, labeled as owning the activity at this level. */
export function withAssignToMyself(
  options: CascadeAssigneeOption[] | null | undefined,
  self?: { _id?: string; fullName?: string } | null,
): CascadeAssigneeOption[] | null {
  if (options == null) return null
  if (!self?._id) return options
  return [
    ...options.filter(option => option._id !== self._id),
    {
      _id: self._id,
      fullName: self.fullName?.trim() || ASSIGN_TO_MYSELF_LABEL,
      assignToSelf: true,
    },
  ]
}

function assigneeOptionLabel(option: CascadeAssigneeOption): string {
  return option.assignToSelf ? ASSIGNED_TO_MYSELF_LABEL : option.fullName
}

/**
 * Names keyed by staff id, covering both the selectable options and anyone
 * already assigned. Contract queries only project assignee ids, so names come
 * from the options list; assignees who are no longer selectable (moved on,
 * assigned from another level) keep a readable fallback.
 */
export function buildAssigneeNameMap(
  assignees: { _id: string; fullName?: string }[] | undefined,
  options: CascadeAssigneeOption[],
): Map<string, string> {
  const names = new Map(
    options.map(person => [person._id, assigneeOptionLabel(person)]),
  )
  for (const person of assignees ?? []) {
    if (person._id && !names.has(person._id)) {
      names.set(person._id, person.fullName?.trim() || 'Staff')
    }
  }
  return names
}

export function resolveAssigneeNames(
  assignees: { _id: string; fullName?: string }[] | undefined,
  options: CascadeAssigneeOption[],
): string[] {
  const names = buildAssigneeNameMap(assignees, options)
  return (assignees ?? [])
    .map(person => person._id)
    .filter(Boolean)
    .map(id => names.get(id) ?? 'Staff')
}
