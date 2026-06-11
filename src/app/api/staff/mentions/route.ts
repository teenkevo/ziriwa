import { NextRequest, NextResponse } from 'next/server'

import { assertAuth } from '@/lib/authz/guards.server'
import { getStaffForMentions } from '@/sanity/lib/staff/get-staff-for-mentions'

export async function GET(req: NextRequest) {
  const authResult = await assertAuth()
  if (authResult instanceof NextResponse) return authResult

  const q = req.nextUrl.searchParams.get('q') ?? ''
  const people = await getStaffForMentions(q)

  return NextResponse.json({
    people: people.map(person => ({
      id: person._id,
      label: person.fullName,
      staffId: person.staffId,
      role: person.role,
    })),
  })
}
