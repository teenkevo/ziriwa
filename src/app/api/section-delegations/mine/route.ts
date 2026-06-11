import { NextResponse } from 'next/server'

import { assertAuth } from '@/lib/authz/guards.server'
import { getViewerStaffId } from '@/lib/get-viewer-staff.server'
import {
  getActiveDelegationAsDelegatee,
  getOutgoingActiveDelegation,
} from '@/lib/section-delegation.server'

export async function GET(req: Request) {
  try {
    const authResult = await assertAuth()
    if (authResult instanceof NextResponse) return authResult

    const { searchParams } = new URL(req.url)
    const sectionId = searchParams.get('sectionId')

    const viewerStaffId = await getViewerStaffId()
    if (!viewerStaffId) {
      return NextResponse.json({
        assignmentAsDelegatee: null,
        assignmentAsAbsent: null,
      })
    }

    if (!sectionId) {
      const assignmentAsDelegatee =
        await getActiveDelegationAsDelegatee(viewerStaffId)
      return NextResponse.json({
        assignmentAsDelegatee,
        assignmentAsAbsent: null,
      })
    }

    const [assignmentAsDelegatee, assignmentAsAbsent] = await Promise.all([
      getActiveDelegationAsDelegatee(viewerStaffId, sectionId),
      getOutgoingActiveDelegation(viewerStaffId, sectionId),
    ])

    return NextResponse.json({
      assignmentAsDelegatee,
      assignmentAsAbsent,
    })
  } catch (error) {
    console.error('GET section-delegations/mine', error)
    return NextResponse.json(
      { error: 'Failed to load delegations' },
      { status: 500 },
    )
  }
}
