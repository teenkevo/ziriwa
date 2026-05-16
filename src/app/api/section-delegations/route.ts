import { NextRequest, NextResponse } from 'next/server'
import { writeClient } from '@/sanity/lib/write-client'
import { assertAuth } from '@/lib/authz/guards.server'
import {
  assertSectionStaffManageAllowed,
  getSectionAccessForViewer,
} from '@/lib/section-access.server'
import { createNotification } from '@/lib/notifications/create-notification'
import { syncDelegationStatuses } from '@/lib/section-delegation.server'

export async function POST(req: NextRequest) {
  try {
    const authResult = await assertAuth()
    if (authResult instanceof NextResponse) return authResult

    const body = await req.json()
    const { sectionId, fromStaffId, toStaffId, actingRole, startDate, endDate, note } =
      body

    if (
      !sectionId ||
      !fromStaffId ||
      !toStaffId ||
      !actingRole ||
      !startDate ||
      !endDate
    ) {
      return NextResponse.json(
        {
          error:
            'sectionId, fromStaffId, toStaffId, actingRole, startDate, and endDate are required',
        },
        { status: 400 },
      )
    }

    if (actingRole !== 'manager' && actingRole !== 'supervisor') {
      return NextResponse.json({ error: 'Invalid acting role' }, { status: 400 })
    }

    if (endDate < startDate) {
      return NextResponse.json(
        { error: 'End date must be on or after start date' },
        { status: 400 },
      )
    }

    const access = await getSectionAccessForViewer(sectionId)
    const denied = assertSectionStaffManageAllowed(access)
    if (denied) return denied

    const [fromStaff, toStaff] = await Promise.all([
      writeClient.fetch<{ _id: string; role?: string; sectionId?: string } | null>(
        `*[_type == "staff" && _id == $id][0]{ _id, role, "sectionId": section._ref }`,
        { id: fromStaffId },
      ),
      writeClient.fetch<{ _id: string; role?: string; sectionId?: string; fullName?: string } | null>(
        `*[_type == "staff" && _id == $id][0]{
          _id,
          role,
          "sectionId": section._ref,
          "fullName": coalesce(fullName, firstName + " " + lastName)
        }`,
        { id: toStaffId },
      ),
    ])

    if (!fromStaff?.sectionId || fromStaff.sectionId !== sectionId) {
      return NextResponse.json(
        { error: 'Absent staff must belong to this section' },
        { status: 400 },
      )
    }
    if (!toStaff?.sectionId || toStaff.sectionId !== sectionId) {
      return NextResponse.json(
        { error: 'Acting staff must belong to this section' },
        { status: 400 },
      )
    }

    if (fromStaff.role !== actingRole) {
      return NextResponse.json(
        { error: `Absent staff must hold the ${actingRole} role` },
        { status: 400 },
      )
    }

    const date = new Date().toISOString().slice(0, 10)
    let status = 'scheduled'
    if (endDate < date) status = 'completed'
    else if (startDate <= date) status = 'active'

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
      ...(access.viewerStaffId && {
        createdBy: { _type: 'reference', _ref: access.viewerStaffId },
      }),
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
      href: `/sections`,
      metadata: { delegationId: doc._id, sectionId },
    })

    return NextResponse.json({ id: doc._id, status }, { status: 201 })
  } catch (error) {
    console.error('POST section-delegations', error)
    return NextResponse.json(
      { error: 'Failed to create delegation' },
      { status: 500 },
    )
  }
}
