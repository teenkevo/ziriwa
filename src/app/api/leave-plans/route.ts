import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { getViewerStaffId } from '@/lib/get-viewer-staff.server'
import { getCurrentFinancialYear } from '@/lib/financial-year'
import {
  isDateKey,
  outsideFinancialYearMessage,
  OWN_LEAVE_TAKEN_MESSAGE,
  validateLeaveRange,
  visibleMonthBounds,
} from '@/lib/leave/dates'
import {
  annualLeaveOverEntitlement,
  createLeavePlan,
  listLeaveEntitlements,
  listLeavePlans,
  reliefStaffError,
  staffLeaveOverlaps,
} from '@/lib/leave/leave-plans.server'

const createSchema = z.object({
  startDate: z.string(),
  endDate: z.string(),
  status: z.enum(['planned', 'confirmed']).default('planned'),
  kind: z
    .enum(['annual', 'sick', 'study', 'compassionate', 'unpaid', 'other'])
    .default('annual'),
  reliefStaffId: z.string().trim().min(1),
  note: z.string().trim().max(280).optional(),
})

export async function GET(request: NextRequest) {
  try {
    const staffId = await getViewerStaffId()
    if (!staffId) {
      return NextResponse.json({ error: 'Staff profile required' }, { status: 401 })
    }

    const params = request.nextUrl.searchParams
    const fallback = visibleMonthBounds(new Date())
    const from = params.get('from') ?? fallback.from
    const to = params.get('to') ?? fallback.to
    if (!isDateKey(from) || !isDateKey(to) || from > to) {
      return NextResponse.json({ error: 'Invalid date range' }, { status: 400 })
    }

    const [plans, entitlements] = await Promise.all([
      listLeavePlans(from, to),
      listLeaveEntitlements(staffId, from, to),
    ])
    return NextResponse.json({ plans, entitlements })
  } catch (error) {
    console.error('GET leave-plans', error)
    return NextResponse.json({ error: 'Failed to load leave plans' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const staffId = await getViewerStaffId()
    if (!staffId) {
      return NextResponse.json({ error: 'Staff profile required' }, { status: 401 })
    }

    const body = createSchema.safeParse(await request.json())
    if (!body.success) {
      return NextResponse.json({ error: 'Check the leave details' }, { status: 400 })
    }

    const rangeError = validateLeaveRange(body.data.startDate, body.data.endDate)
    if (rangeError) {
      return NextResponse.json({ error: rangeError }, { status: 400 })
    }
    const yearError = outsideFinancialYearMessage(
      body.data.startDate,
      body.data.endDate,
      getCurrentFinancialYear(),
    )
    if (yearError) {
      return NextResponse.json({ error: yearError }, { status: 400 })
    }

    const reliefError = await reliefStaffError({
      staffId,
      reliefStaffId: body.data.reliefStaffId,
      startDate: body.data.startDate,
      endDate: body.data.endDate,
    })
    if (reliefError) {
      return NextResponse.json({ error: reliefError }, { status: 400 })
    }

    const overlaps = await staffLeaveOverlaps({
      staffId,
      startDate: body.data.startDate,
      endDate: body.data.endDate,
    })
    if (overlaps) {
      return NextResponse.json({ error: OWN_LEAVE_TAKEN_MESSAGE }, { status: 409 })
    }

    const entitlementError = await annualLeaveOverEntitlement({
      staffId,
      startDate: body.data.startDate,
      endDate: body.data.endDate,
      kind: body.data.kind,
    })
    if (entitlementError) {
      return NextResponse.json({ error: entitlementError }, { status: 409 })
    }

    const plan = await createLeavePlan({
      staffId,
      reliefStaffId: body.data.reliefStaffId,
      startDate: body.data.startDate,
      endDate: body.data.endDate,
      status: body.data.status,
      kind: body.data.kind,
      note: body.data.note ?? '',
    })
    const entitlements = await listLeaveEntitlements(
      staffId,
      plan.startDate,
      plan.endDate,
    )
    return NextResponse.json({ plan, entitlements }, { status: 201 })
  } catch (error) {
    console.error('POST leave-plans', error)
    return NextResponse.json({ error: 'Failed to save leave plan' }, { status: 500 })
  }
}
