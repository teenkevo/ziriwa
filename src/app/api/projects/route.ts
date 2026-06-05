import { NextRequest, NextResponse } from 'next/server'

import { assertAuth, canCreateProject } from '@/lib/authz/guards.server'
import { provisionClerkForProjectStaff } from '@/lib/project-member-clerk.server'
import { getProjectsForViewer } from '@/sanity/lib/projects/get-projects-for-viewer'
import { writeClient } from '@/sanity/lib/write-client'
import { generateUniqueSlug } from '@/sanity/lib/unique-slug'

export async function GET() {
  const authResult = await assertAuth()
  if (authResult instanceof NextResponse) return authResult

  const projects = await getProjectsForViewer()
  return NextResponse.json({ projects })
}

export async function POST(req: NextRequest) {
  const authResult = await assertAuth()
  if (authResult instanceof NextResponse) return authResult

  if (!(await canCreateProject())) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  const description =
    typeof body.description === 'string' ? body.description.trim() : undefined
  const projectManagerStaffId =
    typeof body.projectManagerStaffId === 'string'
      ? body.projectManagerStaffId.trim()
      : ''

  if (!name) {
    return NextResponse.json({ error: 'Project name is required' }, { status: 400 })
  }

  const baseSlug = name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
  const slug = await generateUniqueSlug(baseSlug, 'project')

  const project = await writeClient.create({
    _type: 'project',
    name,
    slug: { _type: 'slug', current: slug },
    description: description || undefined,
    status: 'active',
    ...(projectManagerStaffId
      ? { projectManager: { _type: 'reference', _ref: projectManagerStaffId } }
      : {}),
  })

  if (projectManagerStaffId) {
    try {
      await provisionClerkForProjectStaff(projectManagerStaffId)
    } catch (error) {
      console.error('Project manager Clerk onboarding failed', error)
      await writeClient.delete(project._id)
      return NextResponse.json(
        {
          error:
            error instanceof Error
              ? error.message
              : 'Failed to provision Clerk access for project manager',
        },
        { status: 502 },
      )
    }

    await writeClient.create({
      _type: 'projectMember',
      project: { _type: 'reference', _ref: project._id },
      staff: { _type: 'reference', _ref: projectManagerStaffId },
      role: 'project_manager',
      status: 'active',
    })
  }

  return NextResponse.json({ id: project._id, slug })
}
