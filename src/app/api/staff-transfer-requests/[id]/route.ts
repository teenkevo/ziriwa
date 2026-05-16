import { NextRequest, NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'
import { client } from '@/sanity/lib/client'
import { writeClient } from '@/sanity/lib/write-client'
import { parseAppRole } from '@/lib/app-role'
import { assertAuth } from '@/lib/authz/guards.server'
import { createNotification } from '@/lib/notifications/create-notification'
import {
  canViewerApproveTransferStep,
  getPendingApprovalStep,
} from '@/lib/staff-transfer-approval.server'
import { getViewerStaffIdForSection } from '@/lib/get-viewer-staff-for-section'

const ROLE_TO_STAFF_QUERY: Record<string, string> = {
  supervisor: /* groq */ `*[_type == "staff" && role == "supervisor" && status == "active" && section._ref == $sectionId]._id`,
  manager: /* groq */ `*[_type == "section" && _id == $sectionId][0].manager._ref`,
  assistant_commissioner: /* groq */ `*[_type == "staff" && role == "assistant_commissioner" && status == "active"][0]._id`,
  commissioner: /* groq */ `*[_type == "staff" && role == "commissioner" && status == "active"][0]._id`,
  commissioner_general: /* groq */ `*[_type == "staff" && role == "commissioner_general" && status == "active"][0]._id`,
}

async function notifyNextApprover(
  pendingRole: string,
  fromSectionId: string | undefined,
  staffName: string,
) {
  let recipientId: string | null = null

  if (pendingRole === 'supervisor' || pendingRole === 'manager') {
    if (!fromSectionId) return
    if (pendingRole === 'manager') {
      recipientId = await client.fetch<string | null>(ROLE_TO_STAFF_QUERY.manager, {
        sectionId: fromSectionId,
      })
    } else {
      const ids = await client.fetch<string[]>(
        ROLE_TO_STAFF_QUERY.supervisor,
        { sectionId: fromSectionId },
      )
      recipientId = ids[0] ?? null
    }
  } else if (ROLE_TO_STAFF_QUERY[pendingRole]) {
    recipientId = await client.fetch<string | null>(
      ROLE_TO_STAFF_QUERY[pendingRole],
      { sectionId: fromSectionId ?? '' },
    )
  }

  if (!recipientId) return

  await createNotification({
    recipientStaffId: recipientId,
    type: 'transfer_pending_approval',
    title: 'Staff transfer awaiting approval',
    body: `${staffName}: a transfer needs your review at the ${pendingRole.replace(/_/g, ' ')} step.`,
    metadata: { approverRole: pendingRole },
  })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authResult = await assertAuth()
    if (authResult instanceof NextResponse) return authResult

    const user = await currentUser()
    const emailRaw =
      user?.primaryEmailAddress?.emailAddress ??
      user?.emailAddresses?.[0]?.emailAddress
    const email = emailRaw?.trim().toLowerCase()

    const viewerStaff = email
      ? await client.fetch<{ _id: string; role?: string } | null>(
          `*[_type == "staff" && lower(email) == $email && status == "active"][0]{
            _id,
            role
          }`,
          { email },
        )
      : null

    const appRole = parseAppRole(
      (user?.publicMetadata as Record<string, unknown> | undefined)?.appRole,
    )

    const { id } = await params
    const body = await req.json()
    const { decision, comment } = body

    if (decision !== 'approved' && decision !== 'rejected') {
      return NextResponse.json({ error: 'Invalid decision' }, { status: 400 })
    }

    const doc = await writeClient.getDocument(id)
    if (!doc || doc._type !== 'staffTransferRequest') {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 })
    }

    if (doc.status !== 'pending') {
      return NextResponse.json(
        { error: 'Request is no longer pending' },
        { status: 400 },
      )
    }

    const approvals = (doc.approvals as Array<Record<string, unknown>>) ?? []
    const pending = getPendingApprovalStep(
      approvals as Parameters<typeof getPendingApprovalStep>[0],
    )
    if (!pending) {
      return NextResponse.json({ error: 'No pending approval step' }, { status: 400 })
    }

    const mayApprove = await canViewerApproveTransferStep({
      pendingApproverRole: pending.approverRole,
      viewerStaffRole: viewerStaff?.role ?? null,
      appRole,
    })
    if (!mayApprove) {
      return NextResponse.json(
        { error: 'You are not authorized to approve this step' },
        { status: 403 },
      )
    }

    const approverStaffId =
      viewerStaff?._id ??
      (await getViewerStaffIdForSection(
        (doc.fromSection as { _ref?: string } | undefined)?._ref ?? '',
      ))

    const updatedApprovals = approvals.map((a, i) => {
      if (i !== pending.index) return a
      return {
        ...a,
        decision,
        comment: typeof comment === 'string' ? comment.trim() : undefined,
        decidedAt: new Date().toISOString(),
        ...(approverStaffId && {
          approver: { _type: 'reference', _ref: approverStaffId },
        }),
      }
    })

    const staffRef = doc.staff as { _ref?: string } | undefined
    const staffName = staffRef?._ref
      ? await client.fetch<string | null>(
          `*[_id == $id][0].coalesce(fullName, firstName + " " + lastName)`,
          { id: staffRef._ref },
        )
      : null
    const fromSectionRef = doc.fromSection as { _ref?: string } | undefined

    if (decision === 'rejected') {
      await writeClient
        .patch(id)
        .set({ status: 'rejected', approvals: updatedApprovals })
        .commit()

      if (staffRef?._ref) {
        await createNotification({
          recipientStaffId: staffRef._ref,
          type: 'transfer_rejected',
          title: 'Transfer request rejected',
          body: comment?.trim() || 'Your transfer request was not approved.',
        })
      }
      return NextResponse.json({ success: true, status: 'rejected' })
    }

    const allApproved = updatedApprovals.every(a => a.decision === 'approved')
    const nextPending = getPendingApprovalStep(
      updatedApprovals as Parameters<typeof getPendingApprovalStep>[0],
    )

    if (!allApproved && nextPending) {
      await writeClient.patch(id).set({ approvals: updatedApprovals }).commit()
      await notifyNextApprover(
        nextPending.approverRole,
        fromSectionRef?._ref,
        staffName ?? 'Staff member',
      )
      return NextResponse.json({ success: true, status: 'pending' })
    }

    const toSectionRef = doc.toSection as { _ref?: string } | undefined
    const toDivisionRef = doc.toDivision as { _ref?: string } | undefined

    if (staffRef?._ref) {
      const staffPatch = writeClient.patch(staffRef._ref)
      if (toSectionRef?._ref) {
        const chain = await writeClient.fetch<{
          divisionId?: string
          departmentId?: string
        } | null>(
          `*[_id == $sectionId][0]{
            "divisionId": division._ref,
            "departmentId": division->department._ref
          }`,
          { sectionId: toSectionRef._ref },
        )
        staffPatch.set({
          section: { _type: 'reference', _ref: toSectionRef._ref },
          ...(chain?.divisionId && {
            division: { _type: 'reference', _ref: chain.divisionId },
          }),
          ...(chain?.departmentId && {
            department: { _type: 'reference', _ref: chain.departmentId },
          }),
        })
      }
      if (toDivisionRef?._ref) {
        const chain = await writeClient.fetch<{ departmentId?: string } | null>(
          `*[_id == $divisionId][0]{ "departmentId": department._ref }`,
          { divisionId: toDivisionRef._ref },
        )
        staffPatch.set({
          division: { _type: 'reference', _ref: toDivisionRef._ref },
          section: null,
          ...(chain?.departmentId && {
            department: { _type: 'reference', _ref: chain.departmentId },
          }),
        })
      }
      await staffPatch.commit()
    }

    await writeClient
      .patch(id)
      .set({ status: 'approved', approvals: updatedApprovals })
      .commit()

    if (staffRef?._ref) {
      await createNotification({
        recipientStaffId: staffRef._ref,
        type: 'transfer_approved',
        title: 'Transfer request approved',
        body: 'Your section/division transfer has been approved and applied.',
      })
    }

    return NextResponse.json({ success: true, status: 'approved' })
  } catch (error) {
    console.error('PATCH staff-transfer-request', error)
    return NextResponse.json(
      { error: 'Failed to update transfer request' },
      { status: 500 },
    )
  }
}
