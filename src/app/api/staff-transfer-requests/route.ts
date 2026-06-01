import { NextRequest, NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'
import { client } from '@/sanity/lib/client'
import { writeClient } from '@/sanity/lib/write-client'
import { parseAppRole } from '@/lib/app-role'
import { assertAuth, isSuperadmin } from '@/lib/authz/guards.server'
import {
  assertSectionStaffManageAllowed,
  getSectionAccessForViewer,
} from '@/lib/section-access.server'
import { createNotification } from '@/lib/notifications/create-notification'
import { audit } from '@/lib/audit-log/events'
import {
  canViewerApproveTransferStep,
  getPendingApprovalStep,
  viewerCanSeeTransferInbox,
} from '@/lib/staff-transfer-approval.server'

const APPROVAL_CHAIN = [
  'supervisor',
  'manager',
  'assistant_commissioner',
  'commissioner',
  'commissioner_general',
] as const

export interface PendingTransferRow {
  _id: string
  transferType: string
  reason?: string
  status: string
  createdAt: string
  staff: { _id: string; fullName: string; role?: string } | null
  fromSection: { _id: string; name: string } | null
  toSection: { _id: string; name: string } | null
  toDivision: { _id: string; name: string } | null
  pendingApproverRole: string | null
}

export async function GET() {
  try {
    const authResult = await assertAuth()
    if (authResult instanceof NextResponse) return authResult

    const user = await currentUser()
    const emailRaw =
      user?.primaryEmailAddress?.emailAddress ??
      user?.emailAddresses?.[0]?.emailAddress
    const email = emailRaw?.trim().toLowerCase()
    if (!email) {
      return NextResponse.json({ requests: [], canApprove: false })
    }

    const staff = await client.fetch<{ _id: string; role?: string } | null>(
      `*[_type == "staff" && lower(email) == $email && status == "active"][0]{
        _id,
        role
      }`,
      { email },
    )

    const appRole = parseAppRole(
      (user?.publicMetadata as Record<string, unknown> | undefined)?.appRole,
    )
    const superadmin = await isSuperadmin()

    if (
      !viewerCanSeeTransferInbox({
        viewerStaffRole: staff?.role ?? null,
        appRole,
        isSuperadmin: superadmin,
      })
    ) {
      return NextResponse.json({ requests: [], canApprove: false })
    }

    const raw = await client.fetch<
      (Omit<PendingTransferRow, 'pendingApproverRole'> & {
        approvals?: Array<{ approverRole?: string; decision?: string }>
      })[]
    >(
      /* groq */ `*[_type == "staffTransferRequest" && status == "pending"]
        | order(_createdAt desc) {
        _id,
        transferType,
        reason,
        status,
        "createdAt": _createdAt,
        staff->{ _id, "fullName": coalesce(fullName, firstName + " " + lastName), role },
        fromSection->{ _id, name },
        toSection->{ _id, name },
        toDivision->{ _id, "name": coalesce(acronym, fullName, name) },
        approvals
      }`,
    )

    const requests: PendingTransferRow[] = []
    for (const row of raw) {
      const pending = getPendingApprovalStep(row.approvals ?? [])
      if (!pending) continue

      const canApprove = await canViewerApproveTransferStep({
        pendingApproverRole: pending.approverRole,
        viewerStaffRole: staff?.role ?? null,
        appRole,
      })
      if (!canApprove) continue

      const { approvals: _a, ...rest } = row
      requests.push({
        ...rest,
        pendingApproverRole: pending.approverRole,
      })
    }

    return NextResponse.json({ requests, canApprove: true })
  } catch (error) {
    console.error('GET staff-transfer-requests', error)
    return NextResponse.json(
      { error: 'Failed to load transfer requests' },
      { status: 500 },
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const authResult = await assertAuth()
    if (authResult instanceof NextResponse) return authResult

    const body = await req.json()
    const {
      staffId,
      transferType,
      toSectionId,
      toDivisionId,
      reason,
      fromSectionId,
    } = body

    if (!staffId || !transferType) {
      return NextResponse.json(
        { error: 'staffId and transferType are required' },
        { status: 400 },
      )
    }

    const staff = await writeClient.fetch<{
      _id: string
      role?: string
      sectionId?: string
      divisionId?: string
      reportsToId?: string
    } | null>(
      `*[_type == "staff" && _id == $id][0]{
        _id,
        role,
        "sectionId": section._ref,
        "divisionId": division._ref,
        "reportsToId": reportsTo._ref
      }`,
      { id: staffId },
    )
    if (!staff) {
      return NextResponse.json({ error: 'Staff not found' }, { status: 404 })
    }

    const sectionIdForAuth =
      (typeof fromSectionId === 'string' ? fromSectionId : staff.sectionId) ??
      ''
    if (!sectionIdForAuth) {
      return NextResponse.json(
        { error: 'Staff must belong to a section for transfer requests' },
        { status: 400 },
      )
    }

    const access = await getSectionAccessForViewer(sectionIdForAuth)
    const denied = assertSectionStaffManageAllowed(access)
    if (denied) return denied

    if (transferType === 'section' && !toSectionId) {
      return NextResponse.json({ error: 'toSectionId is required' }, { status: 400 })
    }
    if (transferType === 'division' && !toDivisionId) {
      return NextResponse.json(
        { error: 'toDivisionId is required' },
        { status: 400 },
      )
    }

    const approvals = APPROVAL_CHAIN.map(role => ({
      _key: crypto.randomUUID(),
      _type: 'object' as const,
      approverRole: role,
      decision: 'pending' as const,
    }))

    const doc = await writeClient.create({
      _type: 'staffTransferRequest',
      staff: { _type: 'reference', _ref: staffId },
      transferType,
      status: 'pending',
      reason: typeof reason === 'string' ? reason.trim() : undefined,
      ...(staff.sectionId && {
        fromSection: { _type: 'reference', _ref: staff.sectionId },
      }),
      ...(staff.divisionId && {
        fromDivision: { _type: 'reference', _ref: staff.divisionId },
      }),
      ...(transferType === 'section' &&
        toSectionId && {
          toSection: { _type: 'reference', _ref: toSectionId },
        }),
      ...(transferType === 'division' &&
        toDivisionId && {
          toDivision: { _type: 'reference', _ref: toDivisionId },
        }),
      ...(access.viewerStaffId && {
        requestedBy: { _type: 'reference', _ref: access.viewerStaffId },
      }),
      approvals,
    })

    if (staff.reportsToId) {
      await createNotification({
        recipientStaffId: staff.reportsToId,
        type: 'transfer_pending_approval',
        title: 'Staff transfer awaiting approval',
        body: 'A section or division transfer needs your review in the approval chain.',
        metadata: { transferRequestId: doc._id },
      })
    }

    const staffName = await writeClient.fetch<string | null>(
      `coalesce(*[_id == $staffId][0].fullName, *[_id == $staffId][0].firstName + " " + *[_id == $staffId][0].lastName)`,
      { staffId },
    )
    audit.staffTransferRequest.created(
      doc._id,
      staffName ?? staffId,
      { transferType, toSectionId, toDivisionId, reason },
    )

    return NextResponse.json({ id: doc._id }, { status: 201 })
  } catch (error) {
    console.error('POST staff-transfer-requests', error)
    return NextResponse.json(
      { error: 'Failed to create transfer request' },
      { status: 500 },
    )
  }
}
