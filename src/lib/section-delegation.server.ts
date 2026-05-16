import 'server-only'

import { client } from '@/sanity/lib/client'

export interface ActiveDelegationForStaff {
  _id: string
  actingRole: 'manager' | 'supervisor'
  fromStaffId: string
  sectionId: string
}

export async function getActiveDelegationsForStaff(
  staffId: string,
): Promise<ActiveDelegationForStaff[]> {
  const date = new Date().toISOString().slice(0, 10)
  return client.fetch(
    /* groq */ `*[_type == "sectionDelegation"
      && toStaff._ref == $staffId
      && status in ["scheduled", "active"]
      && startDate <= $date
      && endDate >= $date
    ]{
      _id,
      actingRole,
      "fromStaffId": fromStaff._ref,
      "sectionId": section._ref
    }`,
    { staffId, date },
  )
}

export async function syncDelegationStatuses(sectionId?: string): Promise<void> {
  const date = new Date().toISOString().slice(0, 10)
  const filter = sectionId
    ? `section._ref == $sectionId && status in ["scheduled", "active"]`
    : `status in ["scheduled", "active"]`
  const delegations = await client.fetch<
    { _id: string; startDate: string; endDate: string; status: string }[]
  >(
    /* groq */ `*[_type == "sectionDelegation" && ${filter}]{ _id, startDate, endDate, status }`,
    sectionId ? { sectionId, date } : { date },
  )

  const { writeClient } = await import('@/sanity/lib/write-client')
  for (const d of delegations) {
    let next = d.status
    if (d.endDate < date) next = 'completed'
    else if (d.startDate <= date) next = 'active'
    else next = 'scheduled'
    if (next !== d.status) {
      await writeClient.patch(d._id).set({ status: next }).commit()
    }
  }
}
