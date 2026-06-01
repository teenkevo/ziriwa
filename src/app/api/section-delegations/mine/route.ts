import { NextResponse } from 'next/server'

import { assertAuth } from '@/lib/authz/guards.server'
import { currentUser } from '@clerk/nextjs/server'
import { client } from '@/sanity/lib/client'
import {
  getActiveDelegationAsDelegatee,
  getOutgoingActiveDelegation,
} from '@/lib/section-delegation.server'

async function getViewerStaffId() {
  const user = await currentUser()
  const email = (
    user?.primaryEmailAddress?.emailAddress ??
    user?.emailAddresses?.[0]?.emailAddress ??
    ''
  )
    .trim()
    .toLowerCase()
  if (!email) return null

  return client.fetch<string | null>(
    /* groq */ `*[_type == "staff" && lower(email) == $email && status == "active"][0]._id`,
    { email },
  )
}

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
