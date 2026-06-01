import 'server-only'

import { currentUser } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

import { isSuperadmin } from '@/lib/authz/guards.server'
import { getAppRole } from '@/lib/clerk-app-role.server'
import { getViewerStaffId } from '@/lib/get-viewer-staff.server'
import { getActiveOrgDelegationAsDelegatee } from '@/lib/org-role-delegation.server'
import { client } from '@/sanity/lib/client'

function getViewerEmail(user: Awaited<ReturnType<typeof currentUser>>) {
  return (
    user?.primaryEmailAddress?.emailAddress ??
    user?.emailAddresses?.[0]?.emailAddress ??
    ''
  )
    .trim()
    .toLowerCase()
}

export async function getDepartmentIdFromContract(
  contractId: string,
): Promise<string | null> {
  return client.fetch<string | null>(
    /* groq */ `*[_type == "departmentContract" && _id == $contractId][0].department._ref`,
    { contractId },
  )
}

/** Staff document to attach as `commissioner` on a new department contract (onboarding). */
export async function resolveCommissionerStaffRefForDepartment(
  departmentId: string,
): Promise<string | null> {
  const viewerStaffId = await getViewerStaffId()
  if (!viewerStaffId) return null

  const acting = await getActiveOrgDelegationAsDelegatee(viewerStaffId, {
    actingRole: 'commissioner',
    departmentId,
  })
  if (acting) return acting.fromStaffId

  return client.fetch<string | null>(
    /* groq */ `
      coalesce(
        *[
          _type == "staff"
          && _id == $viewerStaffId
          && coalesce(status, "active") != "inactive"
          && role == "commissioner"
          && department._ref == $departmentId
        ][0]._id,
        *[_type == "department" && _id == $departmentId][0].commissioner._ref
      )
    `,
    { viewerStaffId, departmentId },
  )
}

export async function canManageDepartmentContract(
  departmentId: string,
): Promise<boolean> {
  const user = await currentUser()
  if (!user) return false

  const appRole = await getAppRole()
  if ((await isSuperadmin()) || appRole === 'commissioner_general') return true

  const email = getViewerEmail(user)
  if (!email) return false

  /** Treat missing commissioner status as active (legacy / incomplete Sanity data). */
  const commissionerActive =
    '!defined(commissioner->status) || commissioner->status == "active"'

  const allowed = await client.fetch<boolean>(
    /* groq */ `
      count(
        *[
          _type == "department"
          && _id == $departmentId
          && (
            (
              (${commissionerActive})
              && (
                lower(commissioner->email) == $email
                || commissioner._ref == *[
                  _type == "staff"
                  && lower(email) == $email
                  && coalesce(status, "active") != "inactive"
                ][0]._id
              )
            )
            || count(
              *[
                _type == "staff"
                && lower(email) == $email
                && coalesce(status, "active") != "inactive"
                && role == "commissioner"
                && department._ref == $departmentId
              ]
            ) > 0
          )
        ][0]
      ) > 0
    `,
    { departmentId, email },
  )

  if (allowed) return true

  // Clerk or Sanity says commissioner: allow if this viewer is the department's commissioner.
  if (appRole === 'commissioner') {
    const resolved = await resolveCommissionerStaffRefForDepartment(departmentId)
    if (resolved) return true
  }

  const viewerStaffId = await getViewerStaffId()
  if (viewerStaffId) {
    const acting = await getActiveOrgDelegationAsDelegatee(viewerStaffId, {
      actingRole: 'commissioner',
      departmentId,
    })
    if (acting) return true
  }

  if (appRole === 'commissioner') {
    const deptCommissionerOk = await client.fetch<boolean>(
      /* groq */ `
        count(
          *[
            _type == "department"
            && _id == $departmentId
            && (${commissionerActive})
            && (
              lower(commissioner->email) == $email
              || commissioner._ref == *[
                _type == "staff"
                && lower(email) == $email
                && coalesce(status, "active") != "inactive"
              ][0]._id
            )
          ][0]
        ) > 0
      `,
      { departmentId, email },
    )
    if (deptCommissionerOk) return true
  }

  return false
}

export function departmentContractAccessDenied(message: string) {
  return NextResponse.json({ error: message }, { status: 403 })
}

export async function assertDepartmentContractManageAllowed(
  departmentId: string,
): Promise<NextResponse | null> {
  if (await canManageDepartmentContract(departmentId)) return null
  return departmentContractAccessDenied(
    'Only the department commissioner can change this contract',
  )
}
