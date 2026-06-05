import { NextRequest, NextResponse } from 'next/server'

import { assertAuth } from '@/lib/authz/guards.server'
import { canManageProjectRoster } from '@/lib/project-onboarding-auth.server'
import { getProjectMembersRoster } from '@/sanity/lib/projects/get-project-members-roster'

/** @deprecated Prefer GET /api/projects/[id]/members-roster */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await assertAuth()
  if (authResult instanceof NextResponse) return authResult

  const { id: projectId } = await params
  if (!(await canManageProjectRoster(projectId))) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
  }

  const roster = await getProjectMembersRoster(projectId)
  return NextResponse.json({ roster })
}
