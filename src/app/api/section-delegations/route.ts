import { NextRequest, NextResponse } from 'next/server'
import { writeClient } from '@/sanity/lib/write-client'
import { assertAuth } from '@/lib/authz/guards.server'
import { getViewerStaffIdForSection } from '@/lib/get-viewer-staff-for-section'
import {
  canStaffReceiveDelegation,
  computeDelegationStatus,
  DELEGATION_MAX_DAYS,
  isDelegationWithinMaxDays,
  isSectionActingRole,
  staffRoleMatchesActingRole,
} from '@/lib/role-delegation'
import {
  findOverlappingDelegationAsAbsentAnyScope,
  findOverlappingDelegationAsDelegateeAnyScope,
  hasActiveDelegationAsDelegateeAnyScope,
} from '@/lib/delegation-overlap.server'
import { syncDelegationStatuses } from '@/lib/section-delegation.server'
import { createNotification } from '@/lib/notifications/create-notification'
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

    const viewerStaffId = await getViewerStaffIdForSection(sectionId)
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

    const [fromStaff, toStaff] = await Promise.all([
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
    ])

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

    if (toStaff.status !== 'active') {
      return NextResponse.json(
        { error: 'Acting staff must be active' },
        { status: 400 },
      )
    }

    const actingRole = fromStaff.role
    if (!isSectionActingRole(actingRole)) {
      return NextResponse.json(
        {
          error:
            'Only officers, supervisors, and managers can create section delegations',
        },
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

    const fromName = await writeClient.fetch<string | null>(
      `*[_id == $id][0].fullName`,
      { id: fromStaffId },
    )

    await createNotification({
      recipientStaffId: toStaffId,
      type: 'delegation_started',
      title: `Acting ${actingRole} from ${startDate} to ${endDate}`,
      body: `You are covering for ${fromName ?? 'a colleague'} while keeping your ${toStaff.role} duties.`,
      href: `/workspace`,
      metadata: { delegationId: doc._id, sectionId },
    })

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
