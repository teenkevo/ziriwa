import 'server-only'

import { currentUser } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

import { parseAppRole } from '@/lib/app-role'
import { isSuperadmin } from '@/lib/authz/guards.server'
import { buildSectionAccess, type SectionAccess } from '@/lib/section-access'
import { getViewerStaffIdForSection } from '@/lib/get-viewer-staff-for-section'
import { syncDelegationStatuses } from '@/lib/section-delegation.server'
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

  const globalAdmin =
    (await isSuperadmin()) || appRole === 'commissioner_general'

  if (globalAdmin) {
    const viewerStaffId = await getViewerStaffIdForSection(sectionId)
    return buildSectionAccess({
      viewerStaffId,
      sectionManagerId: null,
      supervisorIds: [],
      appRole,
      isGlobalAdmin: true,
    })
  }

  await syncDelegationStatuses(sectionId)
  const date = new Date().toISOString().slice(0, 10)

  const [viewerStaffId, sectionMeta, supervisorIds, delegationActors] =
    await Promise.all([
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
      client.fetch<{ actingRole: string; toStaffId: string }[]>(
        /* groq */ `*[_type == "sectionDelegation"
        && section._ref == $sectionId
        && status in ["scheduled", "active"]
        && startDate <= $date
        && endDate >= $date
      ]{
        actingRole,
        "toStaffId": toStaff._ref
      }`,
        { sectionId, date },
      ),
    ])

  const actingManagerStaffIds = delegationActors
    .filter(d => d.actingRole === 'manager')
    .map(d => d.toStaffId)
  const actingSupervisorStaffIds = delegationActors
    .filter(d => d.actingRole === 'supervisor')
    .map(d => d.toStaffId)

  return buildSectionAccess({
    viewerStaffId,
    sectionManagerId: sectionMeta?.managerId ?? null,
    supervisorIds: supervisorIds ?? [],
    actingManagerStaffIds,
    actingSupervisorStaffIds,
    appRole,
  })
}

export function assertSectionStaffManageAllowed(
  access: SectionAccess,
): NextResponse | null {
  if (access.isGlobalAdmin) return null
  if (!access.canManageSectionStaff) {
    return sectionAccessDenied(
      'Only the section manager can manage section staff',
    )
  }
  return null
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
  if (access.isGlobalAdmin) return null
  if (CONTRACT_MANAGER_OPS.has(op) && !access.canManageContract) {
    return sectionAccessDenied(
      'Only the section manager can change contract objectives, initiatives, and measurable activities',
    )
  }
  return null
}

export function assertSprintCreateAllowed(
  access: SectionAccess,
): NextResponse | null {
  if (access.isGlobalAdmin) return null
  if (!access.canCreateSprints) {
    return sectionAccessDenied('Only supervisors can create weekly sprints')
  }
  return null
}

export function assertSprintReviewAllowed(
  access: SectionAccess,
): NextResponse | null {
  if (access.isGlobalAdmin) return null
  if (!access.canViewSprintInReviewTab) {
    return sectionAccessDenied(
      'Only the section manager or supervisors can review sprints',
    )
  }
  return null
}

/** Manager approves/rejects sprint plan tasks (not officer work submissions). */
export function assertSprintManagerPlanReviewAllowed(
  access: SectionAccess,
): NextResponse | null {
  if (access.isGlobalAdmin) return null
  if (access.isSectionManager) return null
  return sectionAccessDenied(
    'Only the section manager can approve or reject sprint plan tasks',
  )
}

export function assertSprintSupervisorTaskUpdate(
  access: SectionAccess,
): NextResponse | null {
  if (access.isGlobalAdmin) return null
  if (!access.canSuperviseDetailedTasks) {
    return sectionAccessDenied(
      'Only supervisors can change sprint task priority or assignment',
    )
  }
  return null
}
