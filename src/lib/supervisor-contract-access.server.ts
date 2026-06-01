import 'server-only'

import { NextResponse } from 'next/server'

import { isSuperadmin } from '@/lib/authz/guards.server'
import { getAppRole } from '@/lib/clerk-app-role.server'
import { getViewerStaffIdForSection } from '@/lib/get-viewer-staff-for-section'
import { getActiveDelegationAsDelegatee } from '@/lib/section-delegation.server'
import { client } from '@/sanity/lib/client'

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
  const viewerStaffId = await getViewerStaffIdForSection(sectionId)
  if (!viewerStaffId) return null

  const isSupervisor = await client.fetch<boolean>(
    /* groq */ `*[_type == "staff" && _id == $id && role == "supervisor"][0]._id != null`,
    { id: viewerStaffId },
  )
  if (isSupervisor) return viewerStaffId

  const acting = await getActiveDelegationAsDelegatee(viewerStaffId, sectionId)
  if (acting?.actingRole === 'supervisor') return acting.fromStaffId

  const appRole = await getAppRole()
  if (appRole === 'supervisor') return viewerStaffId

  return null
}

export async function canManageSupervisorContract(
  sectionId: string,
): Promise<boolean> {
  const appRole = await getAppRole()
  if ((await isSuperadmin()) || appRole === 'commissioner_general') return true

  return Boolean(await resolveSupervisorStaffRefForSection(sectionId))
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
