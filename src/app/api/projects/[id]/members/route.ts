import { NextRequest, NextResponse } from 'next/server'

import { provisionClerkForProjectStaff } from '@/lib/project-member-clerk.server'
import { assertAuth } from '@/lib/authz/guards.server'
import {
  canManageProjectRoster,
  canManageWorkstreamRoster,
} from '@/lib/project-onboarding-auth.server'
import {
  parseProjectRole,
  projectRoleRequiresWorkstream,
  type ProjectRole,
} from '@/lib/project-role'
import {
  isAllowedStaffEmail,
  staffEmailRequirementMessage,
} from '@/lib/staff-email-policy'
import {
  getProjectMemberEmailConflict,
  getWorkstreamMemberEmailConflict,
  projectMemberEmailConflictError,
  workstreamMemberEmailConflictError,
} from '@/lib/project-member-email.server'
import { writeClient } from '@/sanity/lib/write-client'
import { client } from '@/sanity/lib/client'

function ref(id: string) {
  return { _type: 'reference' as const, _ref: id }
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

  for (const memberId of memberIds) {
    await writeClient.patch(memberId).set({ status: 'inactive' }).commit()
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await assertAuth()
  if (authResult instanceof NextResponse) return authResult

  const { id: projectId } = await params
  const body = await req.json().catch(() => ({}))

  const role = parseProjectRole(body.role)
  const workstreamId =
    typeof body.workstreamId === 'string' ? body.workstreamId.trim() : ''
  const firstName = typeof body.firstName === 'string' ? body.firstName.trim() : ''
  const lastName = typeof body.lastName === 'string' ? body.lastName.trim() : ''
  const idNumber = typeof body.idNumber === 'string' ? body.idNumber.trim() : ''
  const email =
    typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  const existingStaffId =
    typeof body.staffId === 'string' ? body.staffId.trim() : ''
  const phone = typeof body.phone === 'string' ? body.phone.trim() : ''
  const pendingWorkstreamLead = body.pendingWorkstreamLead === true

  if (!role) {
    return NextResponse.json({ error: 'Invalid project role' }, { status: 400 })
  }

  if (projectRoleRequiresWorkstream(role) && !workstreamId) {
    if (!(role === 'workstream_lead' && pendingWorkstreamLead)) {
      return NextResponse.json(
        { error: 'workstreamId is required for this role' },
        { status: 400 },
      )
    }
  }

  if (role === 'workstream_member') {
    const allowed = await canManageWorkstreamRoster(projectId, workstreamId)
    if (!allowed) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }
  } else {
    const allowed = await canManageProjectRoster(projectId)
    if (!allowed) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }
    if (role === 'workstream_lead' && workstreamId) {
      const existingLead = await client.fetch<string | null>(
        /* groq */ `
          *[_type == "projectMember"
            && project._ref == $projectId
            && role == "workstream_lead"
            && status == "active"
            && workstream._ref == $workstreamId
          ][0]._id
        `,
        { projectId, workstreamId },
      )
      if (existingLead) {
        return NextResponse.json(
          { error: 'This workstream already has a lead' },
          { status: 409 },
        )
      }
    }
  }

  let staffId = existingStaffId

  if (staffId) {
    const membershipConflict = await getProjectMemberEmailConflict(projectId, {
      staffId,
    })
    if (membershipConflict) {
      return NextResponse.json(
        { error: projectMemberEmailConflictError(membershipConflict) },
        { status: 409 },
      )
    }
  }

  if (!staffId) {
    if (!firstName || !lastName || !idNumber || !email) {
      return NextResponse.json(
        { error: 'firstName, lastName, idNumber, and email are required' },
        { status: 400 },
      )
    }
    if (!isAllowedStaffEmail(email)) {
      return NextResponse.json(
        { error: staffEmailRequirementMessage() },
        { status: 400 },
      )
    }

    if (role === 'workstream_member' && workstreamId) {
      const workstreamConflict = await getWorkstreamMemberEmailConflict(
        projectId,
        workstreamId,
        email,
      )
      if (workstreamConflict) {
        return NextResponse.json(
          { error: workstreamMemberEmailConflictError(workstreamConflict) },
          { status: 409 },
        )
      }
    }

    const membershipConflict = await getProjectMemberEmailConflict(projectId, {
      email,
    })
    if (membershipConflict) {
      return NextResponse.json(
        { error: projectMemberEmailConflictError(membershipConflict) },
        { status: 409 },
      )
    }

    const existing = await client.fetch<string | null>(
      /* groq */ `*[_type == "staff" && lower(email) == $email][0]._id`,
      { email },
    )
    if (existing) {
      staffId = existing
    } else {
      const created = await writeClient.create({
        _type: 'staff',
        firstName,
        lastName,
        idNumber,
        email,
        // Sanity requires a mainstream role field; project authority lives on projectMember.
        role: 'officer',
        status: 'active',
        ...(phone ? { phone } : {}),
      })
      staffId = created._id
    }
  }

  let clerkResult: Awaited<ReturnType<typeof provisionClerkForProjectStaff>> = {
    invited: false,
  }
  try {
    clerkResult = await provisionClerkForProjectStaff(staffId, email)
  } catch (error) {
    console.error('Project member Clerk onboarding failed', error)
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to provision Clerk access for this member',
      },
      { status: 502 },
    )
  }

  if (role === 'project_manager') {
    const existingPmStaffId = await client.fetch<string | null>(
      /* groq */ `
        *[_type == "project" && _id == $projectId][0].projectManager._ref
      `,
      { projectId },
    )
    if (existingPmStaffId && existingPmStaffId !== staffId) {
      return NextResponse.json(
        { error: 'This project already has a project manager' },
        { status: 409 },
      )
    }
    await deactivateProjectMembersExcept(projectId, role, staffId)
    await writeClient.patch(projectId).set({ projectManager: ref(staffId) }).commit()
  }

  if (role === 'deputy_project_manager') {
    const existingDpmStaffId = await client.fetch<string | null>(
      /* groq */ `
        *[_type == "project" && _id == $projectId][0].deputyProjectManager._ref
      `,
      { projectId },
    )
    if (existingDpmStaffId && existingDpmStaffId !== staffId) {
      return NextResponse.json(
        { error: 'This project already has a deputy project manager' },
        { status: 409 },
      )
    }
    await deactivateProjectMembersExcept(projectId, role, staffId)
    await writeClient
      .patch(projectId)
      .set({ deputyProjectManager: ref(staffId) })
      .commit()
  }

  if (role === 'workstream_lead' && workstreamId) {
    await deactivateProjectMembersExcept(
      projectId,
      role,
      staffId,
      workstreamId,
    )
    await writeClient
      .patch(workstreamId)
      .set({ workstreamLead: ref(staffId) })
      .commit()
  }

  if (pendingWorkstreamLead && role === 'workstream_lead') {
    let memberFullName = `${firstName} ${lastName}`.trim()
    if (existingStaffId || !memberFullName) {
      memberFullName =
        (await client.fetch<string | null>(
          /* groq */ `*[_type == "staff" && _id == $staffId][0]{
            "name": coalesce(
              fullName,
              nullIf(trim(coalesce(firstName, "") + " " + coalesce(lastName, "")), "")
            )
          }.name`,
          { staffId },
        )) ?? 'Unknown'
    }

    return NextResponse.json({
      staffId,
      fullName: memberFullName,
      pending: true,
      invited: clerkResult.invited,
      resent: clerkResult.resent ?? false,
      existingClerkUser: clerkResult.existingClerkUser ?? false,
    })
  }

  await writeClient.create({
    _type: 'projectMember',
    project: ref(projectId),
    staff: ref(staffId),
    role,
    ...(workstreamId ? { workstream: ref(workstreamId) } : {}),
    status: 'active',
  })

  let memberFullName = `${firstName} ${lastName}`.trim()
  if (existingStaffId || !memberFullName) {
    memberFullName =
      (await client.fetch<string | null>(
        /* groq */ `*[_type == "staff" && _id == $staffId][0]{
          "name": coalesce(
            fullName,
            nullIf(trim(coalesce(firstName, "") + " " + coalesce(lastName, "")), "")
          )
        }.name`,
        { staffId },
      )) ?? 'Unknown'
  }

  return NextResponse.json({
    staffId,
    fullName: memberFullName,
    invited: clerkResult.invited,
    resent: clerkResult.resent ?? false,
    existingClerkUser: clerkResult.existingClerkUser ?? false,
  })
}
