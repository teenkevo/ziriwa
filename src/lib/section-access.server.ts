import 'server-only'

import { currentUser } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

import { parseAppRole } from '@/lib/app-role'
import {
  buildSectionAccess,
  type SectionAccess,
} from '@/lib/section-access'
import { getViewerStaffIdForSection } from '@/lib/get-viewer-staff-for-section'
import { client } from '@/sanity/lib/client'

export async function getSectionAccessForViewer(
  sectionId: string,
): Promise<SectionAccess> {
  const user = await currentUser()
  const emailRaw =
    user?.primaryEmailAddress?.emailAddress ??
    user?.emailAddresses?.[0]?.emailAddress
  const appRole = parseAppRole(
    (user?.publicMetadata as Record<string, unknown> | undefined)?.appRole,
  )

  const [viewerStaffId, sectionMeta, supervisorIds] = await Promise.all([
    getViewerStaffIdForSection(sectionId),
    client.fetch<{ managerId: string | null } | null>(
      /* groq */ `*[_type == "section" && _id == $sectionId][0]{
        "managerId": manager._ref
      }`,
      { sectionId },
    ),
    client.fetch<string[]>(
      /* groq */ `*[_type == "staff" && role == "supervisor" && status == "active" && section._ref == $sectionId]._id`,
      { sectionId },
    ),
  ])

  return buildSectionAccess({
    viewerStaffId,
    sectionManagerId: sectionMeta?.managerId ?? null,
    supervisorIds: supervisorIds ?? [],
    appRole,
  })
}

export async function getSectionIdFromContract(
  contractId: string,
): Promise<string | null> {
  return client.fetch<string | null>(
    /* groq */ `*[_type == "sectionContract" && _id == $contractId][0].section._ref`,
    { contractId },
  )
}

export async function getSectionIdFromWeeklySprint(
  sprintId: string,
): Promise<string | null> {
  return client.fetch<string | null>(
    /* groq */ `*[_type == "weeklySprint" && _id == $sprintId][0].section._ref`,
    { sprintId },
  )
}

export function sectionAccessDenied(message: string) {
  return NextResponse.json({ error: message }, { status: 403 })
}

const CONTRACT_MANAGER_OPS = new Set([
  'addObjective',
  'updateObjective',
  'deleteObjective',
  'addInitiative',
  'updateInitiative',
  'deleteInitiative',
  'addMeasurableActivity',
  'updateActivity',
])

export function assertContractOpAllowed(
  op: string,
  access: SectionAccess,
): NextResponse | null {
  if (CONTRACT_MANAGER_OPS.has(op) && !access.canManageContract) {
    return sectionAccessDenied(
      'Only the section manager can change contract objectives, initiatives, and measurable activities',
    )
  }
  return null
}

export function assertSprintCreateAllowed(access: SectionAccess): NextResponse | null {
  if (!access.canCreateSprints) {
    return sectionAccessDenied('Only supervisors can create weekly sprints')
  }
  return null
}

export function assertSprintReviewAllowed(
  access: SectionAccess,
): NextResponse | null {
  if (!access.canViewSprintInReviewTab) {
    return sectionAccessDenied(
      'Only the section manager or supervisors can review sprints',
    )
  }
  return null
}

export function assertSprintSupervisorTaskUpdate(
  access: SectionAccess,
): NextResponse | null {
  if (!access.canSuperviseDetailedTasks) {
    return sectionAccessDenied(
      'Only supervisors can change sprint task priority or assignment',
    )
  }
  return null
}
