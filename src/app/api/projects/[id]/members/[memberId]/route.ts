import { NextRequest, NextResponse } from 'next/server'

import { assertAuth } from '@/lib/authz/guards.server'
import { canManageProjectRoster } from '@/lib/project-onboarding-auth.server'
import {
  parseProjectRole,
  projectRoleRequiresWorkstream,
  type ProjectRole,
} from '@/lib/project-role'
import { provisionClerkForProjectStaff } from '@/lib/project-member-clerk.server'
import { client } from '@/sanity/lib/client'
import { writeClient } from '@/sanity/lib/write-client'

function ref(id: string) {
  return { _type: 'reference' as const, _ref: id }
}

type ProjectMemberRecord = {
  role: ProjectRole
  status: string
  staffId: string
  workstreamId: string | null
}

async function getProjectMember(
  projectId: string,
  memberId: string,
): Promise<ProjectMemberRecord | null> {
  return client.fetch(
    /* groq */ `
      *[_type == "projectMember" && _id == $memberId && project._ref == $projectId][0]{
        role,
        status,
        "staffId": staff._ref,
        "workstreamId": workstream._ref
      }
    `,
    { projectId, memberId },
  )
}

async function deactivateProjectMembersExcept(
  projectId: string,
  role: ProjectRole,
  keepStaffId: string,
  workstreamId?: string,
) {
  const memberIds = await client.fetch<string[]>(
    /* groq */ `
      *[_type == "projectMember"
        && project._ref == $projectId
        && role == $role
        && status == "active"
        && staff._ref != $keepStaffId
        && ($workstreamId == "" || workstream._ref == $workstreamId)
      ]._id
    `,
    { projectId, role, keepStaffId, workstreamId: workstreamId ?? '' },
  )

  for (const id of memberIds) {
    await writeClient.patch(id).set({ status: 'inactive' }).commit()
  }
}

async function clearLeadershipRefs(
  projectId: string,
  member: ProjectMemberRecord,
) {
  if (member.role === 'project_manager') {
    const pmRef = await client.fetch<string | null>(
      /* groq */ `*[_type == "project" && _id == $projectId][0].projectManager._ref`,
      { projectId },
    )
    if (pmRef === member.staffId) {
      await writeClient.patch(projectId).unset(['projectManager']).commit()
    }
  }

  if (member.role === 'deputy_project_manager') {
    const dpmRef = await client.fetch<string | null>(
      /* groq */ `*[_type == "project" && _id == $projectId][0].deputyProjectManager._ref`,
      { projectId },
    )
    if (dpmRef === member.staffId) {
      await writeClient.patch(projectId).unset(['deputyProjectManager']).commit()
    }
  }

  if (member.role === 'workstream_lead' && member.workstreamId) {
    const leadRef = await client.fetch<string | null>(
      /* groq */ `*[_type == "section" && _id == $workstreamId][0].workstreamLead._ref`,
      { workstreamId: member.workstreamId },
    )
    if (leadRef === member.staffId) {
      await writeClient
        .patch(member.workstreamId)
        .unset(['workstreamLead'])
        .commit()
    }
  }
}

async function restoreLeadershipRefs(
  projectId: string,
  member: ProjectMemberRecord,
) {
  if (member.role === 'project_manager') {
    await writeClient
      .patch(projectId)
      .set({ projectManager: ref(member.staffId) })
      .commit()
  }

  if (member.role === 'deputy_project_manager') {
    await writeClient
      .patch(projectId)
      .set({ deputyProjectManager: ref(member.staffId) })
      .commit()
  }

  if (member.role === 'workstream_lead' && member.workstreamId) {
    await writeClient
      .patch(member.workstreamId)
      .set({ workstreamLead: ref(member.staffId) })
      .commit()
  }
}

async function hasActiveRoleConflict(
  projectId: string,
  memberId: string,
  role: ProjectRole,
  workstreamId: string | null,
): Promise<boolean> {
  if (role === 'project_manager' || role === 'deputy_project_manager') {
    const count = await client.fetch<number>(
      /* groq */ `
        count(*[_type == "projectMember"
          && project._ref == $projectId
          && role == $role
          && status == "active"
          && _id != $memberId
        ])
      `,
      { projectId, role, memberId },
    )
    return count > 0
  }

  if (role === 'workstream_lead' && workstreamId) {
    const count = await client.fetch<number>(
      /* groq */ `
        count(*[_type == "projectMember"
          && project._ref == $projectId
          && role == "workstream_lead"
          && status == "active"
          && workstream._ref == $workstreamId
          && _id != $memberId
        ])
      `,
      { projectId, workstreamId, memberId },
    )
    return count > 0
  }

  return false
}

async function applyRoleChange(
  projectId: string,
  memberId: string,
  member: ProjectMemberRecord,
  role: ProjectRole,
  workstreamId: string,
) {
  if (role === 'project_manager') {
    const existingPmStaffId = await client.fetch<string | null>(
      /* groq */ `*[_type == "project" && _id == $projectId][0].projectManager._ref`,
      { projectId },
    )
    if (existingPmStaffId && existingPmStaffId !== member.staffId) {
      return NextResponse.json(
        { error: 'This project already has a project manager' },
        { status: 409 },
      )
    }
    await deactivateProjectMembersExcept(projectId, role, member.staffId)
    await writeClient
      .patch(projectId)
      .set({ projectManager: ref(member.staffId) })
      .commit()
  }

  if (role === 'deputy_project_manager') {
    const existingDpmStaffId = await client.fetch<string | null>(
      /* groq */ `*[_type == "project" && _id == $projectId][0].deputyProjectManager._ref`,
      { projectId },
    )
    if (existingDpmStaffId && existingDpmStaffId !== member.staffId) {
      return NextResponse.json(
        { error: 'This project already has a deputy project manager' },
        { status: 409 },
      )
    }
    await deactivateProjectMembersExcept(projectId, role, member.staffId)
    await writeClient
      .patch(projectId)
      .set({ deputyProjectManager: ref(member.staffId) })
      .commit()
  }

  if (role === 'workstream_lead' && workstreamId) {
    await deactivateProjectMembersExcept(
      projectId,
      role,
      member.staffId,
      workstreamId,
    )
    await writeClient
      .patch(workstreamId)
      .set({ workstreamLead: ref(member.staffId) })
      .commit()
  }

  if (
    member.role === 'project_manager' &&
    role !== 'project_manager'
  ) {
    const pmRef = await client.fetch<string | null>(
      /* groq */ `*[_type == "project" && _id == $projectId][0].projectManager._ref`,
      { projectId },
    )
    if (pmRef === member.staffId) {
      await writeClient.patch(projectId).unset(['projectManager']).commit()
    }
  }

  if (
    member.role === 'deputy_project_manager' &&
    role !== 'deputy_project_manager'
  ) {
    const dpmRef = await client.fetch<string | null>(
      /* groq */ `*[_type == "project" && _id == $projectId][0].deputyProjectManager._ref`,
      { projectId },
    )
    if (dpmRef === member.staffId) {
      await writeClient.patch(projectId).unset(['deputyProjectManager']).commit()
    }
  }

  if (
    member.role === 'workstream_lead' &&
    role !== 'workstream_lead' &&
    member.workstreamId
  ) {
    const leadRef = await client.fetch<string | null>(
      /* groq */ `*[_type == "section" && _id == $workstreamId][0].workstreamLead._ref`,
      { workstreamId: member.workstreamId },
    )
    if (leadRef === member.staffId) {
      await writeClient
        .patch(member.workstreamId)
        .unset(['workstreamLead'])
        .commit()
    }
  }

  const patch = writeClient.patch(memberId).set({ role })

  if (projectRoleRequiresWorkstream(role) && workstreamId) {
    patch.set({ workstream: ref(workstreamId) })
  } else {
    patch.unset(['workstream'])
  }

  await patch.commit()

  return null
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; memberId: string }> },
) {
  const authResult = await assertAuth()
  if (authResult instanceof NextResponse) return authResult

  const { id: projectId, memberId } = await params
  if (!(await canManageProjectRoster(projectId))) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
  }

  const member = await getProjectMember(projectId, memberId)
  if (!member?.staffId) {
    return NextResponse.json({ error: 'Member not found' }, { status: 404 })
  }

  const body = await req.json().catch(() => ({}))
  const nextStatus =
    body.status === 'active' || body.status === 'inactive'
      ? body.status
      : undefined
  const nextRole = parseProjectRole(body.role)
  const workstreamId =
    typeof body.workstreamId === 'string' ? body.workstreamId.trim() : ''

  const isStatusOnly =
    nextStatus != null && nextRole == null && body.workstreamId === undefined
  const isEdit =
    nextRole != null || body.workstreamId !== undefined

  if (!isStatusOnly && !isEdit) {
    return NextResponse.json({ error: 'No changes specified' }, { status: 400 })
  }

  if (isEdit) {
    const role = nextRole ?? member.role
    if (!nextRole && body.workstreamId !== undefined) {
      if (!projectRoleRequiresWorkstream(member.role)) {
        return NextResponse.json(
          { error: 'Workstream cannot be set for this role' },
          { status: 400 },
        )
      }
    }

    if (projectRoleRequiresWorkstream(role)) {
      const wsId = workstreamId || member.workstreamId || ''
      if (!wsId) {
        return NextResponse.json(
          { error: 'workstreamId is required for this role' },
          { status: 400 },
        )
      }

      const roleResponse = await applyRoleChange(
        projectId,
        memberId,
        member,
        role,
        wsId,
      )
      if (roleResponse) return roleResponse

      return NextResponse.json({ ok: true })
    }

    const roleResponse = await applyRoleChange(
      projectId,
      memberId,
      member,
      role,
      '',
    )
    if (roleResponse) return roleResponse

    return NextResponse.json({ ok: true })
  }

  if (nextStatus === 'inactive') {
    if (member.status === 'inactive') {
      return NextResponse.json({ ok: true })
    }
    await writeClient.patch(memberId).set({ status: 'inactive' }).commit()
    await clearLeadershipRefs(projectId, member)
    return NextResponse.json({ ok: true })
  }

  if (nextStatus === 'active') {
    if (member.status === 'active') {
      return NextResponse.json({ ok: true })
    }

    const conflict = await hasActiveRoleConflict(
      projectId,
      memberId,
      member.role,
      member.workstreamId,
    )
    if (conflict) {
      const label =
        member.role === 'project_manager'
          ? 'project manager'
          : member.role === 'deputy_project_manager'
            ? 'deputy project manager'
            : 'workstream lead'
      return NextResponse.json(
        { error: `Another active ${label} is already assigned` },
        { status: 409 },
      )
    }

    await writeClient.patch(memberId).set({ status: 'active' }).commit()
    await restoreLeadershipRefs(projectId, member)
    try {
      await provisionClerkForProjectStaff(member.staffId)
    } catch (error) {
      console.error('Reactivated member Clerk onboarding failed', error)
      return NextResponse.json(
        {
          error:
            error instanceof Error
              ? error.message
              : 'Member reactivated but Clerk access could not be provisioned',
        },
        { status: 502 },
      )
    }
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; memberId: string }> },
) {
  const authResult = await assertAuth()
  if (authResult instanceof NextResponse) return authResult

  const { id: projectId, memberId } = await params
  if (!(await canManageProjectRoster(projectId))) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
  }

  const member = await getProjectMember(projectId, memberId)
  if (!member?.staffId) {
    return NextResponse.json({ error: 'Member not found' }, { status: 404 })
  }

  await clearLeadershipRefs(projectId, member)
  await writeClient.delete(memberId)

  return NextResponse.json({ ok: true })
}
