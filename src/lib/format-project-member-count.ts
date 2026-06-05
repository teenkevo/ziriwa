export function formatProjectMemberCount(count: number): string {
  const n = Math.max(0, count)
  return `${n} ${n === 1 ? 'project member' : 'project members'}`
}
