import 'server-only'

import { currentUser } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

import { isSuperadmin } from '@/lib/authz/guards.server'
import { getViewerStaffId } from '@/lib/get-viewer-staff.server'
import { getProjectMembershipForViewer } from '@/lib/project-access.server'
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

export async function getProjectIdFromContract(
  contractId: string,
): Promise<string | null> {
  return client.fetch<string | null>(
    /* groq */ `*[_type == "projectContract" && _id == $contractId][0].project._ref`,
    { contractId },
  )
}

export async function resolveProjectManagerStaffRef(
  projectId: string,
): Promise<string | null> {
  const viewerStaffId = await getViewerStaffId()
  if (!viewerStaffId) return null

  const membership = await getProjectMembershipForViewer(projectId)
  if (membership?.role === 'project_manager') return viewerStaffId

  return client.fetch<string | null>(
    /* groq */ `*[_type == "project" && _id == $projectId][0].projectManager._ref`,
    { projectId },
  )
}

export async function canManageProjectContract(
  projectId: string,
): Promise<boolean> {
  if (await isSuperadmin()) return true

  const membership = await getProjectMembershipForViewer(projectId)
  if (membership?.role === 'project_manager') return true

  const user = await currentUser()
  const email = getViewerEmail(user)
  if (!email) return false

  return client.fetch<boolean>(
    /* groq */ `
      count(
        *[
          _type == "project"
          && _id == $projectId
          && (
            lower(projectManager->email) == $email
            || projectManager._ref == *[
              _type == "staff"
              && lower(email) == $email
              && coalesce(status, "active") != "inactive"
            ][0]._id
          )
        ][0]
      ) > 0
    `,
    { projectId, email },
  )
}

export function projectContractAccessDenied(message: string) {
  return NextResponse.json({ error: message }, { status: 403 })
}

export async function assertProjectContractManageAllowed(
  projectId: string,
): Promise<NextResponse | null> {
  if (await canManageProjectContract(projectId)) return null
  return projectContractAccessDenied(
    'Only the project manager can change this contract',
  )
}
