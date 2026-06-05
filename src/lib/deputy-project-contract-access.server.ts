import 'server-only'

import { NextResponse } from 'next/server'

import { isSuperadmin } from '@/lib/authz/guards.server'
import { getViewerStaffId } from '@/lib/get-viewer-staff.server'
import { getProjectMembershipForViewer } from '@/lib/project-access.server'
import { client } from '@/sanity/lib/client'

export async function getProjectIdFromDeputyContract(
  contractId: string,
): Promise<string | null> {
  return client.fetch<string | null>(
    /* groq */ `*[_type == "deputyProjectContract" && _id == $contractId][0].project._ref`,
    { contractId },
  )
}

export async function resolveDeputyProjectManagerStaffRef(
  projectId: string,
): Promise<string | null> {
  const viewerStaffId = await getViewerStaffId()
  if (!viewerStaffId) return null

  const membership = await getProjectMembershipForViewer(projectId)
  if (membership?.role === 'deputy_project_manager') return viewerStaffId

  return client.fetch<string | null>(
    /* groq */ `*[_type == "project" && _id == $projectId][0].deputyProjectManager._ref`,
    { projectId },
  )
}

export async function canManageDeputyProjectContract(
  projectId: string,
): Promise<boolean> {
  if (await isSuperadmin()) return true
  const membership = await getProjectMembershipForViewer(projectId)
  return membership?.role === 'deputy_project_manager'
}

export function deputyProjectContractAccessDenied(message: string) {
  return NextResponse.json({ error: message }, { status: 403 })
}

export async function assertDeputyProjectContractManageAllowed(
  projectId: string,
): Promise<NextResponse | null> {
  if (await canManageDeputyProjectContract(projectId)) return null
  return deputyProjectContractAccessDenied(
    'Only the deputy project manager can change this contract',
  )
}
