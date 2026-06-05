import { NextRequest, NextResponse } from 'next/server'

import { assertAuth } from '@/lib/authz/guards.server'
import { canManageWorkstreamRoster } from '@/lib/project-onboarding-auth.server'
import { getWorkstreamMemberEmailConflict } from '@/lib/project-member-email.server'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; workstreamId: string }> },
) {
  const authResult = await assertAuth()
  if (authResult instanceof NextResponse) return authResult

  const { id: projectId, workstreamId } = await params
  const email = req.nextUrl.searchParams.get('email')?.trim() ?? ''

  if (!email) {
    return NextResponse.json({ conflict: null })
  }

  if (!(await canManageWorkstreamRoster(projectId, workstreamId))) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
  }

  const conflict = await getWorkstreamMemberEmailConflict(
    projectId,
    workstreamId,
    email,
  )

  return NextResponse.json({ conflict })
}
