import { NextRequest, NextResponse } from 'next/server'

import { assertAuth } from '@/lib/authz/guards.server'
import { canManageProjectRoster } from '@/lib/project-onboarding-auth.server'
import { client } from '@/sanity/lib/client'
import { getProjectMembersForPicker } from '@/sanity/lib/projects/get-project-members-for-picker'

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

  const [projectMembers, projectManagerId] = await Promise.all([
    getProjectMembersForPicker(projectId),
    client.fetch<string | null>(
      /* groq */ `*[_type == "project" && _id == $projectId][0].projectManager._ref`,
      { projectId },
    ),
  ])

  return NextResponse.json({
    projectMembers,
    projectManagerId: projectManagerId ?? '',
  })
}
