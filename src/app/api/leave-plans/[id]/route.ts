import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { getViewerStaffId } from '@/lib/get-viewer-staff.server'
import { getCurrentFinancialYear } from '@/lib/financial-year'
import {
  CONFIRMED_LEAVE_LOCKED_MESSAGE,
  outsideFinancialYearMessage,
  OWN_LEAVE_TAKEN_MESSAGE,
  validateLeaveRange,
} from '@/lib/leave/dates'
import {
  annualLeaveOverEntitlement,
  deleteLeavePlan,
  getLeavePlan,
  listLeaveEntitlements,
  reliefStaffError,
  staffLeaveOverlaps,
  updateLeavePlan,
} from '@/lib/leave/leave-plans.server'

const patchSchema = z
  .object({
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    status: z.enum(['planned', 'confirmed']).optional(),
    kind: z
      .enum(['annual', 'sick', 'study', 'compassionate', 'unpaid', 'other'])
      .optional(),
    note: z.string().trim().max(280).optional(),
    reliefStaffId: z.string().trim().min(1).optional(),
  })
  .refine(value => Object.keys(value).length > 0, {
    message: 'Nothing to update',
  })

interface RouteContext {
  params: Promise<{ id: string }>
}

function isPlanId(id: string): boolean {
  return /^[A-Za-z0-9._-]+$/.test(id) && !id.startsWith('drafts.')
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const staffId = await getViewerStaffId()
    if (!staffId) {
      return NextResponse.json({ error: 'Staff profile required' }, { status: 401 })
    }

    const { id } = await context.params
    if (!isPlanId(id)) {
      return NextResponse.json({ error: 'Leave plan not found' }, { status: 404 })
    }

    const existing = await getLeavePlan(id)
    if (!existing || existing.staffId !== staffId) {
      return NextResponse.json(
        { error: 'You can only change your own leave' },
        { status: existing ? 403 : 404 },
      )
    }
    if (existing.status === 'confirmed') {
      return NextResponse.json(
        { error: CONFIRMED_LEAVE_LOCKED_MESSAGE },
        { status: 409 },
      )
    }

    const body = patchSchema.safeParse(await request.json())
    if (!body.success) {
      return NextResponse.json({ error: 'Check the leave details' }, { status: 400 })
    }

    const nextStatus = body.data.status ?? existing.status
    const nextRelief = body.data.reliefStaffId ?? existing.reliefStaffId
    if (nextStatus === 'confirmed' && !nextRelief) {
      return NextResponse.json(
        { error: 'Choose a relief person before confirming this leave.' },
        { status: 400 },
      )
    }

    const startDate = body.data.startDate ?? existing.startDate
    const endDate = body.data.endDate ?? existing.endDate
    const rangeError = validateLeaveRange(startDate, endDate)
    if (rangeError) {
      return NextResponse.json({ error: rangeError }, { status: 400 })
    }
    const yearError = outsideFinancialYearMessage(
      startDate,
      endDate,
      getCurrentFinancialYear(),
    )
    if (yearError) {
      return NextResponse.json({ error: yearError }, { status: 400 })
    }

    if (nextRelief) {
      const reliefError = await reliefStaffError({
        staffId,
        reliefStaffId: nextRelief,
        startDate,
        endDate,
      })
      if (reliefError) {
        return NextResponse.json({ error: reliefError }, { status: 400 })
      }
    }

    const overlaps = await staffLeaveOverlaps({
      staffId,
      startDate,
      endDate,
      exceptId: id,
    })
    if (overlaps) {
      return NextResponse.json({ error: OWN_LEAVE_TAKEN_MESSAGE }, { status: 409 })
    }

    const nextKind = body.data.kind ?? existing.kind
    const entitlementError = await annualLeaveOverEntitlement({
      staffId,
      startDate,
      endDate,
      kind: nextKind,
      exceptId: id,
    })
    if (entitlementError) {
      return NextResponse.json({ error: entitlementError }, { status: 409 })
    }

    const plan = await updateLeavePlan(id, {
      ...body.data,
      startDate,
      endDate,
    })
    if (!plan) {
      return NextResponse.json({ error: 'Leave plan not found' }, { status: 404 })
    }
    const entitlements = await listLeaveEntitlements(
      staffId,
      plan.startDate,
      plan.endDate,
    )
    return NextResponse.json({ plan, entitlements })
  } catch (error) {
    console.error('PATCH leave-plans', error)
    return NextResponse.json({ error: 'Failed to update leave plan' }, { status: 500 })
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const staffId = await getViewerStaffId()
    if (!staffId) {
      return NextResponse.json({ error: 'Staff profile required' }, { status: 401 })
    }

    const { id } = await context.params
    if (!isPlanId(id)) {
      return NextResponse.json({ error: 'Leave plan not found' }, { status: 404 })
    }

    const existing = await getLeavePlan(id)
    if (!existing || existing.staffId !== staffId) {
      return NextResponse.json(
        { error: 'You can only remove your own leave' },
        { status: existing ? 403 : 404 },
      )
    }
    if (existing.status === 'confirmed') {
      return NextResponse.json(
        { error: CONFIRMED_LEAVE_LOCKED_MESSAGE },
        { status: 409 },
      )
    }

    await deleteLeavePlan(id)
    const entitlements = await listLeaveEntitlements(
      staffId,
      existing.startDate,
      existing.endDate,
    )
    return NextResponse.json({ ok: true, entitlements })
  } catch (error) {
    console.error('DELETE leave-plans', error)
    return NextResponse.json({ error: 'Failed to remove leave plan' }, { status: 500 })
  }
}
