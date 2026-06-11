import 'server-only'

import { currentUser } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

import { canUseSuperadminPowers } from '@/lib/impersonation/viewer-context.server'
import { getAppRole } from '@/lib/clerk-app-role.server'
import { getViewerStaffIdForSection } from '@/lib/get-viewer-staff-for-section'
import { getActiveDelegationAsDelegatee } from '@/lib/section-delegation.server'
import { client } from '@/sanity/lib/client'

export async function getSectionIdFromOfficerContract(
  contractId: string,
): Promise<string | null> {
  return client.fetch<string | null>(
    /* groq */ `*[_type == "officerContract" && _id == $contractId][0].section._ref`,
    { contractId },
  )
}

export async function getOfficerStaffIdFromContract(
  contractId: string,
): Promise<string | null> {
  return client.fetch<string | null>(
    /* groq */ `*[_type == "officerContract" && _id == $contractId][0].officer._ref`,
    { contractId },
  )
}

export async function canManageOfficerContractForStaff(
  sectionId: string,
  officerStaffId: string,
): Promise<boolean> {
  const appRole = await getAppRole()
  if ((await canUseSuperadminPowers()) || appRole === 'commissioner_general') return true

  const viewerStaffId = await getViewerStaffIdForSection(sectionId)
  if (!viewerStaffId) return false

  if (viewerStaffId === officerStaffId) {
    const isOfficer = await client.fetch<boolean>(
      /* groq */ `*[_type == "staff" && _id == $id && role == "officer"][0]._id != null`,
      { id: viewerStaffId },
    )
    if (isOfficer) return true
    return client.fetch<boolean>(
      /* groq */ `
        count(
          *[
            _type == "projectMember"
            && status == "active"
            && role == "workstream_member"
            && workstream._ref == $sectionId
            && staff._ref == $viewerStaffId
          ][0]
        ) > 0
      `,
      { sectionId, viewerStaffId },
    )
  }

  const acting = await getActiveDelegationAsDelegatee(viewerStaffId, sectionId)
  return (
    acting?.actingRole === 'officer' && acting.fromStaffId === officerStaffId
  )
}

export async function resolveOfficerStaffRefForSection(
  sectionId: string,
): Promise<string | null> {
  const viewerStaffId = await getViewerStaffIdForSection(sectionId)
  if (!viewerStaffId) return null

  const isOfficer = await client.fetch<boolean>(
    /* groq */ `*[_type == "staff" && _id == $id && role == "officer"][0]._id != null`,
    { id: viewerStaffId },
  )
  if (isOfficer) return viewerStaffId

  const isWorkstreamMember = await client.fetch<boolean>(
    /* groq */ `
      count(
        *[
          _type == "projectMember"
          && status == "active"
          && role == "workstream_member"
          && workstream._ref == $sectionId
          && staff._ref == $viewerStaffId
        ][0]
      ) > 0
    `,
    { sectionId, viewerStaffId },
  )
  if (isWorkstreamMember) return viewerStaffId

  const acting = await getActiveDelegationAsDelegatee(viewerStaffId, sectionId)
  if (acting?.actingRole === 'officer') return acting.fromStaffId

  return null
}

export async function canManageOfficerContract(
  sectionId: string,
  officerStaffId?: string,
): Promise<boolean> {
  const user = await currentUser()
  if (!user) return false

  if (officerStaffId) {
    return canManageOfficerContractForStaff(sectionId, officerStaffId)
  }

  return Boolean(await resolveOfficerStaffRefForSection(sectionId))
}

export function officerContractAccessDenied(message: string) {
  return NextResponse.json({ error: message }, { status: 403 })
}

export async function assertOfficerContractManageAllowed(
  sectionId: string,
  officerStaffId?: string,
): Promise<NextResponse | null> {
  if (await canManageOfficerContract(sectionId, officerStaffId)) return null
  return officerContractAccessDenied(
    'Only the section officer can change this contract',
  )
}
