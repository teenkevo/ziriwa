import { NextRequest, NextResponse } from 'next/server'
import { writeClient } from '@/sanity/lib/write-client'
import { assertAuth } from '@/lib/authz/guards.server'
import { getViewerStaffId } from '@/lib/get-viewer-staff.server'
import {
  canStaffReceiveOrgDelegation,
  computeDelegationStatus,
  DELEGATION_MAX_DAYS,
  isDelegationWithinMaxDays,
  isOrgActingRole,
  staffRoleMatchesOrgActingRole,
} from '@/lib/role-delegation'
import {
  findOverlappingDelegationAsAbsentAnyScope,
  findOverlappingDelegationAsDelegateeAnyScope,
  hasActiveDelegationAsDelegateeAnyScope,
} from '@/lib/delegation-overlap.server'
import { syncOrgDelegationStatuses } from '@/lib/org-role-delegation.server'
import { createNotification } from '@/lib/notifications/create-notification'
import { audit } from '@/lib/audit-log/events'

export async function POST(req: NextRequest) {
  try {
    const authResult = await assertAuth()
    if (authResult instanceof NextResponse) return authResult

    const body = await req.json()
    const { scope, divisionId, departmentId, toStaffId, startDate, endDate, note } =
      body

    if (
      !scope ||
      (scope !== 'division' && scope !== 'department') ||
      !toStaffId ||
      !startDate ||
      !endDate
    ) {
      return NextResponse.json(
        {
          error:
            'scope, toStaffId, startDate, and endDate are required (scope: division | department)',
        },
        { status: 400 },
      )
    }

    if (scope === 'division' && !divisionId) {
      return NextResponse.json(
        { error: 'divisionId is required for division scope' },
        { status: 400 },
      )
    }
    if (scope === 'department' && !departmentId) {
      return NextResponse.json(
        { error: 'departmentId is required for department scope' },
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

    const viewerStaffId = await getViewerStaffId()
    if (!viewerStaffId) {
      return NextResponse.json({ error: 'Staff record not found' }, { status: 403 })
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

    const fromStaff = await writeClient.fetch<{
      _id: string
      role?: string
    } | null>(`*[_type == "staff" && _id == $id][0]{ _id, role }`, {
      id: fromStaffId,
    })

    const actingRole = fromStaff?.role
    if (!isOrgActingRole(actingRole)) {
      return NextResponse.json(
        {
          error:
            'Only assistant commissioners and commissioners can create organisation delegations',
        },
        { status: 400 },
      )
    }

    if (!staffRoleMatchesOrgActingRole(fromStaff?.role, actingRole)) {
      return NextResponse.json({ error: 'Invalid acting role' }, { status: 400 })
    }

    if (scope === 'division' && actingRole !== 'assistant_commissioner') {
      return NextResponse.json(
        { error: 'Division delegations require an assistant commissioner' },
        { status: 400 },
      )
    }
    if (scope === 'department' && actingRole !== 'commissioner') {
      return NextResponse.json(
        { error: 'Department delegations require a commissioner' },
        { status: 400 },
      )
    }

    const toStaff = await writeClient.fetch<{
      _id: string
      role?: string
      fullName?: string
      status?: string
    } | null>(
      `*[_type == "staff" && _id == $id][0]{
        _id,
        role,
        status,
        "fullName": coalesce(fullName, firstName + " " + lastName)
      }`,
      { id: toStaffId },
    )

    if (!toStaff || toStaff.status !== 'active') {
      return NextResponse.json(
        { error: 'Acting staff must be active' },
        { status: 400 },
      )
    }

    if (!canStaffReceiveOrgDelegation(toStaff.role, actingRole)) {
      return NextResponse.json(
        { error: `Selected staff cannot act as ${actingRole}` },
        { status: 400 },
      )
    }

    if (scope === 'division') {
      const validFrom = await writeClient.fetch<boolean>(
        /* groq */ `
          count(
            *[
              _type == "division"
              && _id == $divisionId
              && (
                assistantCommissioner._ref == $fromStaffId
                || *[
                  _type == "staff"
                  && _id == $fromStaffId
                  && role == "assistant_commissioner"
                  && division._ref == $divisionId
                ][0]._id != null
              )
            ][0]
          ) > 0
        `,
        { divisionId, fromStaffId },
      )
      if (!validFrom) {
        return NextResponse.json(
          { error: 'You are not the assistant commissioner for this division' },
          { status: 403 },
        )
      }

      const validTo = await writeClient.fetch<boolean>(
        /* groq */ `
          count(
            *[
              _type == "staff"
              && _id == $toStaffId
              && role == "manager"
              && section._ref in *[_type == "section" && division._ref == $divisionId]._id
            ][0]
          ) > 0
        `,
        { toStaffId, divisionId },
      )
      if (!validTo) {
        return NextResponse.json(
          { error: 'Acting staff must be a section manager in this division' },
          { status: 400 },
        )
      }
    }

    if (scope === 'department') {
      const validFrom = await writeClient.fetch<boolean>(
        /* groq */ `
          count(
            *[
              _type == "department"
              && _id == $departmentId
              && (
                commissioner._ref == $fromStaffId
                || *[
                  _type == "staff"
                  && _id == $fromStaffId
                  && role == "commissioner"
                  && department._ref == $departmentId
                ][0]._id != null
              )
            ][0]
          ) > 0
        `,
        { departmentId, fromStaffId },
      )
      if (!validFrom) {
        return NextResponse.json(
          { error: 'You are not the commissioner for this department' },
          { status: 403 },
        )
      }

      const validTo = await writeClient.fetch<boolean>(
        /* groq */ `
          count(
            *[
              _type == "staff"
              && _id == $toStaffId
              && role == "assistant_commissioner"
              && division._ref in *[_type == "division" && department._ref == $departmentId]._id
            ][0]
          ) > 0
        `,
        { toStaffId, departmentId },
      )
      if (!validTo) {
        return NextResponse.json(
          {
            error:
              'Acting staff must be an assistant commissioner in this department',
          },
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
      _type: 'orgRoleDelegation',
      scope,
      ...(scope === 'division' && divisionId
        ? { division: { _type: 'reference', _ref: divisionId } }
        : {}),
      ...(scope === 'department' && departmentId
        ? { department: { _type: 'reference', _ref: departmentId } }
        : {}),
      fromStaff: { _type: 'reference', _ref: fromStaffId },
      toStaff: { _type: 'reference', _ref: toStaffId },
      actingRole,
      startDate,
      endDate,
      status,
      note: typeof note === 'string' ? note.trim() : undefined,
      createdBy: { _type: 'reference', _ref: fromStaffId },
    })

    await syncOrgDelegationStatuses(
      scope === 'division'
        ? { divisionId }
        : { departmentId },
    )

    const fromName = await writeClient.fetch<string | null>(
      `*[_id == $id][0].fullName`,
      { id: fromStaffId },
    )

    const actingHref =
      actingRole === 'assistant_commissioner'
        ? '/assistant-commissioner/dashboard?workContext=acting'
        : '/commissioner/dashboard?workContext=acting'

    await createNotification({
      recipientStaffId: toStaffId,
      type: 'delegation_started',
      title: `Acting ${actingRole} from ${startDate} to ${endDate}`,
      body: `You are covering for ${fromName ?? 'a colleague'} while keeping your ${toStaff.role} duties.`,
      href: actingHref,
      metadata: { delegationId: doc._id, scope, divisionId, departmentId },
    })

    audit.sectionDelegation.created(
      doc._id,
      `${toStaff.fullName ?? 'Staff'} acting as ${actingRole}`,
      scope === 'division' ? divisionId : departmentId,
      { fromStaffId, toStaffId, actingRole, startDate, endDate, scope },
    )

    return NextResponse.json({ id: doc._id, status }, { status: 201 })
  } catch (error) {
    console.error('POST org-role-delegations', error)
    return NextResponse.json(
      { error: 'Failed to create delegation' },
      { status: 500 },
    )
  }
}
