import 'server-only'

import { currentUser } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

import { parseAppRole } from '@/lib/app-role'
import { isSuperadmin } from '@/lib/authz/guards.server'
import {
  buildSectionAccessForWorkContext,
  type SectionAccess,
  type WorkContextMode,
} from '@/lib/section-access'
import { getViewerStaffIdForSection } from '@/lib/get-viewer-staff-for-section'
import {
  getActiveDelegationAsDelegatee,
  getOutgoingActiveDelegation,
  syncDelegationStatuses,
} from '@/lib/section-delegation.server'
import { client } from '@/sanity/lib/client'

export async function getSectionAccessForViewer(
  sectionId: string,
  workContext: WorkContextMode = 'own',
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
    return buildSectionAccessForWorkContext(
      {
        viewerStaffId,
        sectionManagerId: null,
        supervisorIds: [],
        officerIds: [],
        appRole,
        isGlobalAdmin: true,
      },
      workContext,
    )
  }

  await syncDelegationStatuses(sectionId)

  const [viewerStaffId, sectionMeta, supervisorIds, officerIds] =
    await Promise.all([
      getViewerStaffIdForSection(sectionId),
      client.fetch<{ managerId: string | null } | null>(
        /* groq */ `*[_type == "section" && _id == $sectionId][0]{
        "managerId": manager._ref
      }`,
        { sectionId },
      ),
      client.fetch<string[]>(
        /* groq */ `*[_type == "staff" && role == "supervisor" && coalesce(status, "active") != "inactive" && section._ref == $sectionId]._id`,
        { sectionId },
      ),
      client.fetch<string[]>(
        /* groq */ `*[_type == "staff" && role == "officer" && coalesce(status, "active") != "inactive" && section._ref == $sectionId]._id`,
        { sectionId },
      ),
    ])

  const [assignmentAsDelegatee, assignmentAsAbsent] = viewerStaffId
    ? await Promise.all([
        getActiveDelegationAsDelegatee(viewerStaffId, sectionId),
        getOutgoingActiveDelegation(viewerStaffId, sectionId),
      ])
    : [null, null]

  return buildSectionAccessForWorkContext(
    {
      viewerStaffId,
      sectionManagerId: sectionMeta?.managerId ?? null,
      supervisorIds: supervisorIds ?? [],
      officerIds: officerIds ?? [],
      appRole,
      delegation: {
        assignmentAsDelegatee,
        assignmentAsAbsent,
      },
    },
    workContext,
  )
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

export function assertContractOnboardAllowed(
  access: SectionAccess,
): NextResponse | null {
  if (access.isGlobalAdmin) return null
  if (!access.canOnboardContract) {
    return sectionAccessDenied(
      'Only the section manager can onboard the section contract',
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
