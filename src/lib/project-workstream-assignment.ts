interface WorkstreamLeadOccupancyRow {
  status: string
  projectRole: string
  workstreamId?: string | null
  memberId: string
}

/** Workstream ids that already have an active lead assigned. */
export function getOccupiedWorkstreamLeadIds(
  roster: WorkstreamLeadOccupancyRow[],
  excludeMemberId?: string,
): Set<string> {
  const ids = new Set<string>()
  for (const row of roster) {
    if (row.status !== 'active') continue
    if (row.projectRole !== 'workstream_lead') continue
    if (!row.workstreamId) continue
    if (excludeMemberId && row.memberId === excludeMemberId) continue
    ids.add(row.workstreamId)
  }
  return ids
}

export function isWorkstreamLeadSlotTaken(
  workstreamId: string,
  occupiedIds: Set<string>,
  allowedWorkstreamId?: string,
): boolean {
  if (allowedWorkstreamId === workstreamId) return false
  return occupiedIds.has(workstreamId)
}

export function firstAvailableWorkstreamId(
  workstreams: { _id: string }[],
  occupiedIds: Set<string>,
  allowedWorkstreamId?: string,
): string {
  const available = workstreams.find(
    w => !isWorkstreamLeadSlotTaken(w._id, occupiedIds, allowedWorkstreamId),
  )
  return available?._id ?? workstreams[0]?._id ?? ''
}
