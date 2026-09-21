import { NextRequest, NextResponse } from 'next/server'
import { writeClient } from '@/sanity/lib/write-client'
import { assertAuth } from '@/lib/authz/guards.server'
import { getViewerStaffId } from '@/lib/get-viewer-staff.server'
import { getViewerStaffIdForSection } from '@/lib/get-viewer-staff-for-section'
import {
  canStaffReceiveDelegation,
  computeDelegationStatus,
  DELEGATION_MAX_DAYS,
  isDelegationWithinMaxDays,
  isSectionActingRole,
  staffRoleMatchesActingRole,
  type SectionActingRole,
} from '@/lib/role-delegation'
import {
  findOverlappingDelegationAsAbsentAnyScope,
  findOverlappingDelegationAsDelegateeAnyScope,
  hasActiveDelegationAsDelegateeAnyScope,
} from '@/lib/delegation-overlap.server'
import {
  getProjectIdForSection,
  isDeputyProjectManagerOnProject,
  isProjectManagerForProject,
  projectDelegationDenied,
} from '@/lib/project-delegation.server'
import { getActiveOrgDelegationAsDelegatee } from '@/lib/org-role-delegation.server'
import { syncDelegationStatuses } from '@/lib/section-delegation.server'
import { audit } from '@/lib/audit-log/events'

export async function POST(req: NextRequest) {
  try {
    const authResult = await assertAuth()
    if (authResult instanceof NextResponse) return authResult

    const body = await req.json()
    const { sectionId, toStaffId, startDate, endDate, note } = body

    if (!sectionId || !toStaffId || !startDate || !endDate) {
      return NextResponse.json(
        {
          error:
            'sectionId, toStaffId, startDate, and endDate are required',
        },
        { status: 400 },
      )
    }

    if (!isDelegationWithinMaxDays(startDate, endDate)) {
      return NextResponse.json(
        {
          error: `Leave delegation cannot exceed ${DELEGATION_MAX_DAYS} calendar days`,
        },
        { status: 400 },
      )
    }

    const viewerStaffIdForSection = await getViewerStaffIdForSection(sectionId)
    const viewerStaffId =
      viewerStaffIdForSection ?? (await getViewerStaffId())
    if (!viewerStaffId) {
      return NextResponse.json(
        { error: 'You are not assigned to this section' },
        { status: 403 },
      )
    }

    const fromStaffId = viewerStaffId

    if (await hasActiveDelegationAsDelegateeAnyScope(fromStaffId)) {
      return NextResponse.json(
        {
          error:
            'You cannot delegate while you are acting for someone else',
        },
        { status: 403 },
      )
    }

    if (fromStaffId === toStaffId) {
      return NextResponse.json(
        { error: 'You cannot delegate to yourself' },
        { status: 400 },
      )
    }

    const [fromStaff, toStaff, sectionMeta] = await Promise.all([
      writeClient.fetch<{ _id: string; role?: string; sectionId?: string } | null>(
        `*[_type == "staff" && _id == $id][0]{ _id, role, "sectionId": section._ref }`,
        { id: fromStaffId },
      ),
      writeClient.fetch<{
        _id: string
        role?: string
        sectionId?: string
        fullName?: string
        status?: string
      } | null>(
        `*[_type == "staff" && _id == $id][0]{
          _id,
          role,
          status,
          "sectionId": section._ref,
          "fullName": coalesce(fullName, firstName + " " + lastName)
        }`,
        { id: toStaffId },
      ),
      writeClient.fetch<{
        isPlanningSection?: boolean
        divisionId?: string | null
        assistantCommissionerId?: string | null
      } | null>(
        `*[_type == "section" && _id == $sectionId][0]{
          "isPlanningSection": coalesce(isPlanningSection, false),
          "divisionId": division._ref,
          "assistantCommissionerId": division->assistantCommissioner._ref
        }`,
        { sectionId },
      ),
    ])

    if (!fromStaff || !toStaff) {
      return NextResponse.json({ error: 'Staff not found' }, { status: 404 })
    }

    if (toStaff.status !== 'active') {
      return NextResponse.json(
        { error: 'Acting staff must be active' },
        { status: 400 },
      )
    }

    const projectId = await getProjectIdForSection(sectionId)
    const isProjectManagerDelegation =
      projectId &&
      (await isProjectManagerForProject(projectId, fromStaffId))

    let actingRole: SectionActingRole | string | undefined = fromStaff.role
    let isPlanningAcDelegation = false

    if (
      sectionMeta?.isPlanningSection &&
      sectionMeta.divisionId &&
      !isProjectManagerDelegation
    ) {
      const isPermanentAc =
        fromStaffId === sectionMeta.assistantCommissionerId
      const actingAsAc = isPermanentAc
        ? null
        : await getActiveOrgDelegationAsDelegatee(fromStaffId, {
            actingRole: 'assistant_commissioner',
            divisionId: sectionMeta.divisionId,
          })
      if (isPermanentAc || actingAsAc) {
        isPlanningAcDelegation = true
        actingRole = 'manager'
      }
    }

    if (!isSectionActingRole(actingRole)) {
      return NextResponse.json(
        {
          error:
            'Only officers, supervisors, and managers can create section delegations',
        },
        { status: 400 },
      )
    }

    if (isProjectManagerDelegation && projectId) {
      if (actingRole !== 'manager') {
        return NextResponse.json(
          { error: 'Project manager delegation requires a manager staff record' },
          { status: 400 },
        )
      }
      if (!(await isDeputyProjectManagerOnProject(projectId, toStaffId))) {
        return projectDelegationDenied(
          'Project managers can only delegate to the deputy project manager',
        )
      }
    } else if (isPlanningAcDelegation) {
      if (!toStaff?.sectionId || toStaff.sectionId !== sectionId) {
        return NextResponse.json(
          { error: 'Acting staff must belong to this planning section' },
          { status: 400 },
        )
      }
      if (toStaff.role !== 'supervisor') {
        return NextResponse.json(
          {
            error:
              'Assistant Commissioners can only delegate planning contract work to the section supervisor',
          },
          { status: 400 },
        )
      }
    } else {
      if (!fromStaff?.sectionId || fromStaff.sectionId !== sectionId) {
        return NextResponse.json(
          { error: 'You must belong to this section to delegate from it' },
          { status: 400 },
        )
      }
      if (!toStaff?.sectionId || toStaff.sectionId !== sectionId) {
        return NextResponse.json(
          { error: 'Acting staff must belong to this section' },
          { status: 400 },
        )
      }

      if (!staffRoleMatchesActingRole(fromStaff.role, actingRole)) {
        return NextResponse.json(
          { error: `Your staff role must be ${actingRole}` },
          { status: 400 },
        )
      }

      if (!canStaffReceiveDelegation(toStaff.role, actingRole)) {
        return NextResponse.json(
          { error: `Selected staff cannot act as ${actingRole}` },
          { status: 400 },
        )
      }
    }

    const overlapAbsent = await findOverlappingDelegationAsAbsentAnyScope(
      fromStaffId,
      startDate,
      endDate,
    )
    if (overlapAbsent) {
      return NextResponse.json(
        { error: 'You already have a delegation scheduled for this period' },
        { status: 409 },
      )
    }

    const overlapDelegatee = await findOverlappingDelegationAsDelegateeAnyScope(
      toStaffId,
      startDate,
      endDate,
    )
    if (overlapDelegatee) {
      return NextResponse.json(
        {
          error:
            'Selected staff already has an acting assignment in this period',
        },
        { status: 409 },
      )
    }

    const status = computeDelegationStatus(startDate, endDate)

    const doc = await writeClient.create({
      _type: 'sectionDelegation',
      section: { _type: 'reference', _ref: sectionId },
      fromStaff: { _type: 'reference', _ref: fromStaffId },
      toStaff: { _type: 'reference', _ref: toStaffId },
      actingRole,
      startDate,
      endDate,
      status,
      note: typeof note === 'string' ? note.trim() : undefined,
      createdBy: { _type: 'reference', _ref: fromStaffId },
    })

    await syncDelegationStatuses(sectionId)

    audit.sectionDelegation.created(
      doc._id,
      `${toStaff.fullName ?? 'Staff'} acting as ${actingRole}`,
      sectionId,
      { fromStaffId, toStaffId, actingRole, startDate, endDate },
    )

    return NextResponse.json({ id: doc._id, status }, { status: 201 })
  } catch (error) {
    console.error('POST section-delegations', error)
    return NextResponse.json(
      { error: 'Failed to create delegation' },
      { status: 500 },
    )
  }
}
