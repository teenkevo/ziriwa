import { NextRequest, NextResponse } from 'next/server'
import {
  inviteOrAssignClerkAppRole,
  staffRoleToAppRole,
  shouldInviteAppRole,
} from '@/lib/admin/onboard-staff-clerk'
import { assertAuth } from '@/lib/authz/guards.server'
import { audit } from '@/lib/audit-log/events'
import {
  assertSectionStaffManageAllowed,
  getSectionAccessForViewer,
} from '@/lib/section-access.server'
import { writeClient } from '@/sanity/lib/write-client'
import { URA_EMAIL_SUFFIX } from '@/lib/staff-roles'

function ref(id: string) {
  return { _type: 'reference' as const, _ref: id }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authResult = await assertAuth()
    if (authResult instanceof NextResponse) return authResult

    const { id: sectionId } = await params
    const access = await getSectionAccessForViewer(sectionId)
    const denied = assertSectionStaffManageAllowed(access)
    if (denied) return denied

    const body = await req.json()
    const { firstName, lastName, idNumber, email, role, phone } = body

    if (role !== 'supervisor' && role !== 'officer') {
      return NextResponse.json(
        { error: 'Only supervisors and officers can be added here' },
        { status: 400 },
      )
    }

    if (!firstName || !lastName || !idNumber || !email) {
      return NextResponse.json(
        { error: 'firstName, lastName, idNumber, and email are required' },
        { status: 400 },
      )
    }

    const emailLower = String(email).trim().toLowerCase()
    if (!emailLower.endsWith(URA_EMAIL_SUFFIX)) {
      return NextResponse.json(
        { error: 'Email must end with @ura.go.ug' },
        { status: 400 },
      )
    }

    const chain = await writeClient.fetch<{
      _id: string
      division: { _id: string; department: { _id: string } | null } | null
    } | null>(
      `*[_id == $sectionId][0]{
        _id,
        division->{ _id, department->{ _id } }
      }`,
      { sectionId },
    )
    if (!chain?.division?._id || !chain.division.department?._id) {
      return NextResponse.json(
        { error: 'Section must belong to a division with a department' },
        { status: 400 },
      )
    }

    const fullName = `${String(firstName).trim()} ${String(lastName).trim()}`
    const result = await writeClient.create({
      _type: 'staff',
      firstName: String(firstName).trim(),
      lastName: String(lastName).trim(),
      fullName,
      idNumber: String(idNumber).trim(),
      email: emailLower,
      role,
      status: 'active' as const,
      ...(phone && { phone: String(phone).trim() }),
      department: ref(chain.division.department._id),
      division: ref(chain.division._id),
      section: ref(sectionId),
    })

    const appRole = staffRoleToAppRole(role)
    let invited = false
    if (shouldInviteAppRole(appRole)) {
      const clerkResult = await inviteOrAssignClerkAppRole(emailLower, appRole)
      invited = clerkResult.invited
    }

    audit.staff.created(result._id, fullName, {
      role,
      sectionId,
      email: emailLower,
    })

    return NextResponse.json(
      { id: result._id, fullName, role, invited },
      { status: 201 },
    )
  } catch (error) {
    console.error('POST section staff', error)
    return NextResponse.json(
      { error: 'Failed to add staff' },
      { status: 500 },
    )
  }
}
