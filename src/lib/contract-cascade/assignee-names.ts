import type { CascadeAssigneeOption } from './types'

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
  const names = new Map(options.map(person => [person._id, person.fullName]))
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
