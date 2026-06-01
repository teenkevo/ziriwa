import { NextRequest, NextResponse } from 'next/server'

import { assertAuth } from '@/lib/authz/guards.server'
import { getViewerStaffId } from '@/lib/get-viewer-staff.server'
import { syncOrgDelegationStatuses } from '@/lib/org-role-delegation.server'
import { client } from '@/sanity/lib/client'
import { writeClient } from '@/sanity/lib/write-client'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authResult = await assertAuth()
    if (authResult instanceof NextResponse) return authResult

    const { id } = await params
    const body = await req.json()
    const { action } = body

    if (action !== 'cancel') {
      return NextResponse.json({ error: 'Unsupported action' }, { status: 400 })
    }

    const delegation = await client.fetch<{
      _id: string
      fromStaffId: string
      toStaffId: string
      status: string
      divisionId: string | null
      departmentId: string | null
    } | null>(
      /* groq */ `*[_type == "orgRoleDelegation" && _id == $id][0]{
        _id,
        status,
        "fromStaffId": fromStaff._ref,
        "toStaffId": toStaff._ref,
        "divisionId": division._ref,
        "departmentId": department._ref
      }`,
      { id },
    )

    if (!delegation) {
      return NextResponse.json({ error: 'Delegation not found' }, { status: 404 })
    }

    if (delegation.status === 'completed' || delegation.status === 'cancelled') {
      return NextResponse.json(
        { error: 'Delegation is already closed' },
        { status: 400 },
      )
    }

    const viewerStaffId = await getViewerStaffId()
    const canCancel =
      viewerStaffId === delegation.fromStaffId ||
      viewerStaffId === delegation.toStaffId

    if (!canCancel) {
      return NextResponse.json(
        { error: 'You cannot cancel this delegation' },
        { status: 403 },
      )
    }

    await writeClient.patch(id).set({ status: 'cancelled' }).commit()
    await syncOrgDelegationStatuses({
      divisionId: delegation.divisionId ?? undefined,
      departmentId: delegation.departmentId ?? undefined,
    })

    return NextResponse.json({ id, status: 'cancelled' })
  } catch (error) {
    console.error('PATCH org-role-delegations/[id]', error)
    return NextResponse.json(
      { error: 'Failed to update delegation' },
      { status: 500 },
    )
  }
}
