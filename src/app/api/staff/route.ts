import { NextRequest, NextResponse } from 'next/server'
import {
  formatClerkApiError,
  inviteOrAssignClerkAppRole,
  staffRoleToAppRole,
  shouldInviteAppRole,
} from '@/lib/admin/onboard-staff-clerk'
import { isClerkAPIResponseError } from '@clerk/nextjs/errors'
import { assertAuth, assertPermission } from '@/lib/authz/guards.server'
import { writeClient } from '@/sanity/lib/write-client'
import {
  isAllowedStaffEmail,
  staffEmailRequirementMessage,
} from '@/lib/staff-email-policy'
import { STAFF_ROLE_OPTIONS } from '@/lib/staff-roles'

const VALID_ROLES = new Set(STAFF_ROLE_OPTIONS.map(r => r.value))

function ref(id: string) {
  return { _type: 'reference' as const, _ref: id }
}

export async function POST(req: NextRequest) {
  try {
    const authResult = await assertAuth()
    if (authResult instanceof NextResponse) return authResult
    const denied = await assertPermission(
      'staff',
      'create',
      'You do not have permission to create staff',
    )
    if (denied) return denied

    const body = await req.json()
    const {
      firstName,
      lastName,
      idNumber,
      email,
      role,
      phone,
      sectionId,
      departmentId: rawDepartmentId,
      divisionId: rawDivisionId,
      reportsToId: rawReportsToId,
    } = body

    let departmentId =
      typeof rawDepartmentId === 'string' ? rawDepartmentId.trim() : undefined
    let divisionId =
      typeof rawDivisionId === 'string' ? rawDivisionId.trim() : undefined
    let reportsToId =
      typeof rawReportsToId === 'string' ? rawReportsToId.trim() : undefined

    if (!firstName || typeof firstName !== 'string') {
      return NextResponse.json(
        { error: 'First name is required' },
        { status: 400 },
      )
    }
    if (!lastName || typeof lastName !== 'string') {
      return NextResponse.json(
        { error: 'Last name is required' },
        { status: 400 },
      )
    }
    if (!idNumber || typeof idNumber !== 'string') {
      return NextResponse.json(
        { error: 'ID number is required' },
        { status: 400 },
      )
    }
    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 },
      )
    }

    const emailLower = email.trim().toLowerCase()
    if (!isAllowedStaffEmail(emailLower)) {
      return NextResponse.json(
        { error: staffEmailRequirementMessage() },
        { status: 400 },
      )
    }

    if (!role || !VALID_ROLES.has(role)) {
      return NextResponse.json(
        { error: 'Valid role is required' },
        { status: 400 },
      )
    }

    const fullName = `${firstName.trim()} ${lastName.trim()}`

    const existingStaff = await writeClient.fetch<{ _id: string } | null>(
      `*[_type == "staff" && lower(email) == $email][0]{ _id }`,
      { email: emailLower },
    )
    if (existingStaff?._id) {
      return NextResponse.json(
        { error: 'A staff member with this email already exists' },
        { status: 409 },
      )
    }

    let sectionRef: string | undefined
    let divisionRef: string | undefined
    let departmentRef: string | undefined

    if (role === 'officer' || role === 'supervisor') {
      if (!sectionId || typeof sectionId !== 'string') {
        return NextResponse.json(
          { error: 'Section is required for this role' },
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
      sectionRef = chain._id
      divisionRef = chain.division._id
      departmentRef = chain.division.department._id
    } else if (role === 'manager') {
      if (sectionId && typeof sectionId === 'string') {
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
        sectionRef = chain._id
        divisionRef = chain.division._id
        departmentRef = chain.division.department._id
      } else if (divisionId) {
        const div = await writeClient.fetch<{
          _id: string
          department: { _id: string } | null
        } | null>(
          `*[_id == $divisionId][0]{ _id, department->{ _id } }`,
          { divisionId },
        )
        if (!div?.department?._id) {
          return NextResponse.json(
            { error: 'Division must belong to a department' },
            { status: 400 },
          )
        }
        divisionRef = div._id
        departmentRef = div.department._id
      } else {
        return NextResponse.json(
          { error: 'Division (or section) is required for manager' },
          { status: 400 },
        )
      }
    } else if (role === 'assistant_commissioner') {
      if (divisionId) {
        const div = await writeClient.fetch<{
          _id: string
          department: { _id: string } | null
        } | null>(
          `*[_id == $divisionId][0]{ _id, department->{ _id } }`,
          { divisionId },
        )
        if (!div?.department?._id) {
          return NextResponse.json(
            { error: 'Division must belong to a department' },
            { status: 400 },
          )
        }
        divisionRef = div._id
        departmentRef = div.department._id
      } else if (departmentId) {
        departmentRef = departmentId
      } else {
        return NextResponse.json(
          {
            error:
              'Department or division is required for assistant commissioner',
          },
          { status: 400 },
        )
      }

      if (departmentRef && !reportsToId) {
        const dept = await writeClient.fetch<{
          commissioner: { _id: string } | null
        } | null>(
          `*[_id == $id][0]{ commissioner->{ _id } }`,
          { id: departmentRef },
        )
        if (dept?.commissioner?._id) {
          reportsToId = dept.commissioner._id
        }
      }
    } else if (role === 'commissioner') {
      if (departmentId) {
        departmentRef = departmentId
      }
    }

    const result = await writeClient.create({
      _type: 'staff',
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      fullName,
      idNumber: idNumber.trim(),
      email: emailLower,
      role,
      status: 'active' as const,
      ...(phone && { phone: String(phone).trim() }),
      ...(departmentRef && { department: ref(departmentRef) }),
      ...(divisionRef && { division: ref(divisionRef) }),
      ...(sectionRef && { section: ref(sectionRef) }),
      ...(reportsToId && { reportsTo: ref(reportsToId) }),
    })

    if (role === 'commissioner' && departmentRef) {
      await writeClient
        .patch(departmentRef)
        .set({ commissioner: ref(result._id) })
        .commit()
    }

    if (role === 'assistant_commissioner' && divisionRef) {
      await writeClient
        .patch(divisionRef)
        .set({ assistantCommissioner: ref(result._id) })
        .commit()
    }

    const appRole = staffRoleToAppRole(role)
    let invited = false
    let inviteError: string | undefined
    if (shouldInviteAppRole(appRole)) {
      try {
        const clerkResult = await inviteOrAssignClerkAppRole(
          emailLower,
          appRole,
        )
        invited = clerkResult.invited
      } catch (inviteErr) {
        inviteError = formatClerkApiError(inviteErr)
        console.error('Staff created but Clerk invite failed', {
          email: emailLower,
          inviteError,
          error: inviteErr,
        })
      }
    }

    return NextResponse.json(
      {
        id: result._id,
        fullName,
        role,
        invited,
        ...(inviteError && { inviteError }),
      },
      { status: 201 },
    )
  } catch (error) {
    const message = formatClerkApiError(error)
    console.error('Error creating staff', message, error)
    const status =
      isClerkAPIResponseError(error) && error.status >= 400 && error.status < 500
        ? error.status
        : 500
    return NextResponse.json(
      { error: message || 'Failed to create staff' },
      { status },
    )
  }
}
