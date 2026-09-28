/**
 * Planning section display name derived from its division.
 * Prefers acronym when present, otherwise the division name.
 */
export function buildPlanningSectionName(division: {
  acronym?: string | null
  name?: string | null
}): string {
  const acronym = division.acronym?.trim()
  const name = division.name?.trim()
  const prefix = acronym || name
  if (!prefix) return 'Planning'
  return `${prefix}-Planning`
}
