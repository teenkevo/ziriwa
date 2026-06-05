import 'server-only'

import { NextResponse } from 'next/server'

import { isSuperadmin } from '@/lib/authz/guards.server'
import { getAppRole } from '@/lib/clerk-app-role.server'
import { getViewerStaffIdForSection } from '@/lib/get-viewer-staff-for-section'
import { isSectionInProject } from '@/lib/project-access.server'
import { getProjectWorkstreamSupervisorIds } from '@/lib/project-member-staff.server'
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

  if (await isSectionInProject(sectionId)) {
    const leadIds = await getProjectWorkstreamSupervisorIds(sectionId)
    if (leadIds.includes(viewerStaffId)) return viewerStaffId
  } else {
    const isWorkstreamLead = await client.fetch<boolean>(
      /* groq */ `
        count(
          *[
            _type == "section"
            && _id == $sectionId
            && workstreamLead._ref == $viewerStaffId
          ][0]
        ) > 0
      `,
      { sectionId, viewerStaffId },
    )
    if (isWorkstreamLead) return viewerStaffId
  }

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

export async function supervisorContractAccessDeniedMessage(
  sectionId: string,
): Promise<string> {
  return (await isSectionInProject(sectionId))
    ? 'Only the workstream lead can change this contract'
    : 'Only the section supervisor can change this contract'
}

export async function assertSupervisorContractManageAllowed(
  sectionId: string,
): Promise<NextResponse | null> {
  if (await canManageSupervisorContract(sectionId)) return null
  return supervisorContractAccessDenied(
    await supervisorContractAccessDeniedMessage(sectionId),
  )
}
