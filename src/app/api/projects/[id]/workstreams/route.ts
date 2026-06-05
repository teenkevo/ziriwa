import { NextRequest, NextResponse } from 'next/server'

import { assertAuth } from '@/lib/authz/guards.server'
import { canManageProjectRoster } from '@/lib/project-onboarding-auth.server'
import { upsertWorkstreamLeadProjectMember } from '@/lib/project-workstream-lead.server'
import { getProjectWorkstreamsForManagement } from '@/sanity/lib/projects/get-project-workstreams-for-management'
import { writeClient } from '@/sanity/lib/write-client'
import { generateUniqueSlug } from '@/sanity/lib/unique-slug'

function ref(id: string) {
  return { _type: 'reference' as const, _ref: id }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await assertAuth()
  if (authResult instanceof NextResponse) return authResult

  const { id: projectId } = await params
  const workstreams = await getProjectWorkstreamsForManagement(projectId)
  return NextResponse.json({ workstreams })
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await assertAuth()
  if (authResult instanceof NextResponse) return authResult

  const { id: projectId } = await params
  if (!(await canManageProjectRoster(projectId))) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  const workstreamLeadStaffId =
    typeof body.workstreamLeadStaffId === 'string'
      ? body.workstreamLeadStaffId.trim()
      : ''

  if (!name) {
    return NextResponse.json(
      { error: 'Workstream name is required' },
      { status: 400 },
    )
  }

  const project = await writeClient.fetch<{
    projectManagerId?: string
  } | null>(
    /* groq */ `*[_type == "project" && _id == $projectId][0]{
      "projectManagerId": projectManager._ref
    }`,
    { projectId },
  )
  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  }

  const baseSlug = `${name}-ws`
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
  const slug = await generateUniqueSlug(baseSlug, 'section')
  const section = await writeClient.create({
    _type: 'section',
    name,
    slug: { _type: 'slug', current: slug },
    project: ref(projectId),
    ...(project.projectManagerId
      ? { manager: ref(project.projectManagerId) }
      : {}),
  })

  if (workstreamLeadStaffId) {
    await upsertWorkstreamLeadProjectMember(
      projectId,
      section._id,
      workstreamLeadStaffId,
    )
  }

  return NextResponse.json({ workstreamId: section._id, slug })
}
