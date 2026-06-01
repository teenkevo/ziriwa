import 'server-only'

import { currentUser } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

import { isSuperadmin } from '@/lib/authz/guards.server'
import { getAppRole } from '@/lib/clerk-app-role.server'
import { getActiveDelegationAsDelegatee } from '@/lib/section-delegation.server'
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

export async function getSectionIdFromSupervisorContract(
  contractId: string,
): Promise<string | null> {
  return client.fetch<string | null>(
    /* groq */ `*[_type == "supervisorContract" && _id == $contractId][0].section._ref`,
    { contractId },
  )
}

export async function resolveSupervisorStaffRefForSection(
  sectionId: string,
): Promise<string | null> {
  const user = await currentUser()
  const email = getViewerEmail(user)
  if (!email) return null

  const viewerStaffId = await client.fetch<string | null>(
    /* groq */ `
      *[
        _type == "staff"
        && lower(email) == $email
        && coalesce(status, "active") != "inactive"
        && section._ref == $sectionId
      ][0]._id
    `,
    { email, sectionId },
  )

  if (!viewerStaffId) return null

  const acting = await getActiveDelegationAsDelegatee(viewerStaffId, sectionId)
  if (acting?.actingRole === 'supervisor') {
    return acting.fromStaffId
  }

  const isSupervisor = await client.fetch<boolean>(
    /* groq */ `
      count(
        *[
          _type == "staff"
          && _id == $viewerStaffId
          && role == "supervisor"
        ][0]
      ) > 0
    `,
    { viewerStaffId },
  )

  return isSupervisor ? viewerStaffId : null
}

export async function canManageSupervisorContract(
  sectionId: string,
): Promise<boolean> {
  const user = await currentUser()
  if (!user) return false

  const appRole = await getAppRole()
  if ((await isSuperadmin()) || appRole === 'commissioner_general') return true

  const resolved = await resolveSupervisorStaffRefForSection(sectionId)
  return Boolean(resolved)
}

export function supervisorContractAccessDenied(message: string) {
  return NextResponse.json({ error: message }, { status: 403 })
}

export async function assertSupervisorContractManageAllowed(
  sectionId: string,
): Promise<NextResponse | null> {
  if (await canManageSupervisorContract(sectionId)) return null
  return supervisorContractAccessDenied(
    'Only the section supervisor can change this contract',
  )
}
