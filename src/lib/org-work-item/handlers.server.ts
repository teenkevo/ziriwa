import 'server-only'

import { NextResponse } from 'next/server'

import { getAppRole } from '@/lib/clerk-app-role.server'
import { isSuperadmin } from '@/lib/authz/guards.server'
import { getBoardActionsViewerEmail } from '@/lib/board-actions-commissioner.server'
import {
  orgWorkItemCanApprove,
  orgWorkItemCanCascadeAtStatus,
  orgWorkItemCanSubmitResponse,
  orgWorkItemNextApprovalStatus,
  orgWorkItemRejectStatus,
} from '@/lib/org-work-item/workflow'
import type { OrgWorkItemDocumentType } from '@/lib/org-work-item/types'
import { notifyOrgWorkItemCascadeEmail } from '@/lib/org-work-item/notify-org-work-item-email.server'
import { client } from '@/sanity/lib/client'
import { writeClient } from '@/sanity/lib/write-client'

interface OrgWorkItemMeta {
  status?: string
  departmentId?: string
  divisionId?: string
  sectionId?: string
  supervisorId?: string
  assigneeId?: string
}

async function getViewerContext() {
  const email = await getBoardActionsViewerEmail()
  const appRole = await getAppRole()
  const staff = email
    ? await client.fetch<{
        _id: string
        role?: string
        sectionId?: string
        divisionId?: string
      } | null>(
        /* groq */ `*[_type == "staff" && lower(email) == $email && status == "active"][0]{
          _id,
          role,
          "sectionId": section._ref,
          "divisionId": division._ref
        }`,
        { email },
      )
    : null

  return {
    email,
    appRole,
    staffId: staff?._id ?? null,
    staffRole: staff?.role ?? appRole,
    sectionId: staff?.sectionId ?? null,
    divisionId: staff?.divisionId ?? null,
    isSuperadmin: await isSuperadmin(),
  }
}

async function loadOrgWorkItemMeta(
  docType: OrgWorkItemDocumentType,
  id: string,
): Promise<OrgWorkItemMeta | null> {
  return client.fetch(
    /* groq */ `*[_type == $docType && _id == $id][0]{
      status,
      "departmentId": department._ref,
      "divisionId": division._ref,
      "sectionId": section._ref,
      "supervisorId": supervisor._ref,
      "assigneeId": assignee._ref
    }`,
    { docType, id },
  )
}

async function assertCanAccessItem(
  meta: OrgWorkItemMeta,
  viewer: Awaited<ReturnType<typeof getViewerContext>>,
): Promise<NextResponse | null> {
  if (viewer.isSuperadmin) return null
  const role = viewer.staffRole

  if (role === 'commissioner' || role === 'commissioner_general') {
    const ok = await client.fetch<boolean>(
      /* groq */ `count(*[_type == "department" && _id == $departmentId && (
        commissioner._ref == $staffId || lower(commissioner->email) == $email
      )]) > 0`,
      {
        departmentId: meta.departmentId,
        staffId: viewer.staffId,
        email: viewer.email,
      },
    )
    if (!ok) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    return null
  }

  if (role === 'assistant_commissioner') {
    if (meta.divisionId && meta.divisionId === viewer.divisionId) return null
    const ok = await client.fetch<boolean>(
      /* groq */ `count(*[_type == "division" && _id == $divisionId && (
        assistantCommissioner._ref == $staffId || lower(assistantCommissioner->email) == $email
      )]) > 0`,
      {
        divisionId: meta.divisionId,
        staffId: viewer.staffId,
        email: viewer.email,
      },
    )
    if (!ok) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    return null
  }

  if (role === 'manager') {
    if (!meta.sectionId || !viewer.sectionId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const ok = await client.fetch<boolean>(
      /* groq */ `count(*[_type == "section" && _id == $sectionId && manager._ref == $staffId]) > 0`,
      { sectionId: meta.sectionId, staffId: viewer.staffId },
    )
    if (!ok) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    return null
  }

  if (role === 'supervisor') {
    if (meta.supervisorId === viewer.staffId) return null
    if (meta.sectionId && meta.sectionId === viewer.sectionId) return null
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (role === 'officer') {
    if (meta.assigneeId === viewer.staffId) return null
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}

export async function handleOrgWorkItemWorkflowAction(input: {
  docType: OrgWorkItemDocumentType
  id: string
  body: Record<string, unknown>
}): Promise<NextResponse> {
  const { docType, id, body } = input
  const action = typeof body.action === 'string' ? body.action : ''

  const meta = await loadOrgWorkItemMeta(docType, id)
  if (!meta?.departmentId) {
    return NextResponse.json({ error: 'Item not found' }, { status: 404 })
  }

  const viewer = await getViewerContext()
  const denied = await assertCanAccessItem(meta, viewer)
  if (denied) return denied

  if (action === 'cascade') {
    return cascadeOrgWorkItem(docType, id, meta, viewer, body)
  }
  if (action === 'submit_response') {
    return submitOrgWorkItemResponse(docType, id, meta, viewer, body)
  }
  if (action === 'approve') {
    return approveOrgWorkItem(docType, id, meta, viewer)
  }
  if (action === 'reject') {
    return rejectOrgWorkItem(docType, id, meta, viewer, body)
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}

async function cascadeOrgWorkItem(
  docType: OrgWorkItemDocumentType,
  id: string,
  meta: OrgWorkItemMeta,
  viewer: Awaited<ReturnType<typeof getViewerContext>>,
  body: Record<string, unknown>,
): Promise<NextResponse> {
  const role = viewer.staffRole
  if (!orgWorkItemCanCascadeAtStatus(meta.status, role)) {
    return NextResponse.json(
      { error: 'This item cannot be cascaded at its current status' },
      { status: 400 },
    )
  }

  const patch = writeClient.patch(id).set({
    updatedAt: new Date().toISOString(),
  })
  const unset: string[] = []

  if (role === 'assistant_commissioner') {
    const sectionId =
      typeof body.sectionId === 'string' ? body.sectionId.trim() : ''
    if (!sectionId) {
      return NextResponse.json({ error: 'sectionId is required' }, { status: 400 })
    }
    const valid = await client.fetch<boolean>(
      /* groq */ `count(*[_type == "section" && _id == $sectionId && division._ref == $divisionId]) > 0`,
      { sectionId, divisionId: meta.divisionId },
    )
    if (!valid) {
      return NextResponse.json({ error: 'Invalid section' }, { status: 400 })
    }
    patch.set({
      section: { _type: 'reference', _ref: sectionId },
      delegatedBy: viewer.staffId
        ? { _type: 'reference', _ref: viewer.staffId }
        : undefined,
      status: 'delegated_to_section',
    })
    unset.push('supervisor', 'assignee', 'response', 'responseSubmittedAt', 'rejectionFeedback')
  } else if (role === 'manager') {
    const supervisorId =
      typeof body.supervisorId === 'string' ? body.supervisorId.trim() : ''
    if (!supervisorId) {
      return NextResponse.json(
        { error: 'supervisorId is required' },
        { status: 400 },
      )
    }
    const valid = await client.fetch<boolean>(
      /* groq */ `count(*[_type == "staff" && _id == $supervisorId && role == "supervisor" && section._ref == $sectionId]) > 0`,
      { supervisorId, sectionId: meta.sectionId },
    )
    if (!valid) {
      return NextResponse.json({ error: 'Invalid supervisor' }, { status: 400 })
    }
    patch.set({
      supervisor: { _type: 'reference', _ref: supervisorId },
      cascadedByManager: viewer.staffId
        ? { _type: 'reference', _ref: viewer.staffId }
        : undefined,
      status: 'assigned_to_supervisor',
    })
    unset.push('assignee', 'response', 'responseSubmittedAt', 'rejectionFeedback')
  } else if (role === 'supervisor') {
    const assigneeId =
      typeof body.assigneeId === 'string' ? body.assigneeId.trim() : ''
    if (!assigneeId) {
      return NextResponse.json(
        { error: 'assigneeId is required' },
        { status: 400 },
      )
    }
    const valid = await client.fetch<boolean>(
      /* groq */ `count(*[_type == "staff" && _id == $assigneeId && role == "officer" && section._ref == $sectionId]) > 0`,
      { assigneeId, sectionId: meta.sectionId },
    )
    if (!valid) {
      return NextResponse.json({ error: 'Invalid officer' }, { status: 400 })
    }
    patch.set({
      assignee: { _type: 'reference', _ref: assigneeId },
      cascadedBySupervisor: viewer.staffId
        ? { _type: 'reference', _ref: viewer.staffId }
        : undefined,
      status: 'assigned_to_officer',
    })
    unset.push('response', 'responseSubmittedAt', 'rejectionFeedback')
  } else {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (unset.length > 0) patch.unset(unset)
  await patch.commit()

  notifyOrgWorkItemCascadeEmail({
    docType,
    itemId: id,
    cascadeRole: role ?? '',
  })

  return NextResponse.json({ ok: true })
}

async function submitOrgWorkItemResponse(
  docType: OrgWorkItemDocumentType,
  id: string,
  meta: OrgWorkItemMeta,
  viewer: Awaited<ReturnType<typeof getViewerContext>>,
  body: Record<string, unknown>,
): Promise<NextResponse> {
  if (!orgWorkItemCanSubmitResponse(meta.status, viewer.staffRole)) {
    return NextResponse.json(
      { error: 'You cannot submit a response for this item' },
      { status: 400 },
    )
  }

  const response =
    typeof body.response === 'string' ? body.response.trim() : ''
  if (!response) {
    return NextResponse.json({ error: 'response is required' }, { status: 400 })
  }

  await writeClient
    .patch(id)
    .set({
      response,
      responseSubmittedAt: new Date().toISOString(),
      status: 'pending_supervisor_approval',
      rejectionFeedback: '',
      updatedAt: new Date().toISOString(),
    })
    .commit()

  notifyOrgWorkItemCascadeEmail({
    docType,
    itemId: id,
    event: 'response_submitted',
  })

  return NextResponse.json({ ok: true })
}

async function approveOrgWorkItem(
  docType: OrgWorkItemDocumentType,
  id: string,
  meta: OrgWorkItemMeta,
  viewer: Awaited<ReturnType<typeof getViewerContext>>,
): Promise<NextResponse> {
  if (!orgWorkItemCanApprove(meta.status, viewer.staffRole)) {
    return NextResponse.json(
      { error: 'You cannot approve this item at its current status' },
      { status: 400 },
    )
  }

  const nextStatus = orgWorkItemNextApprovalStatus(meta.status)
  if (!nextStatus) {
    return NextResponse.json({ error: 'Invalid approval state' }, { status: 400 })
  }

  await writeClient
    .patch(id)
    .set({
      status: nextStatus,
      rejectionFeedback: '',
      updatedAt: new Date().toISOString(),
    })
    .commit()

  notifyOrgWorkItemCascadeEmail({
    docType,
    itemId: id,
    event: nextStatus === 'completed' ? 'completed' : 'approved',
    nextStatus,
  })

  return NextResponse.json({ ok: true })
}

async function rejectOrgWorkItem(
  docType: OrgWorkItemDocumentType,
  id: string,
  meta: OrgWorkItemMeta,
  viewer: Awaited<ReturnType<typeof getViewerContext>>,
  body: Record<string, unknown>,
): Promise<NextResponse> {
  if (!orgWorkItemCanApprove(meta.status, viewer.staffRole)) {
    return NextResponse.json(
      { error: 'You cannot reject this item at its current status' },
      { status: 400 },
    )
  }

  const feedback =
    typeof body.feedback === 'string' ? body.feedback.trim() : ''
  if (!feedback) {
    return NextResponse.json({ error: 'feedback is required' }, { status: 400 })
  }

  await writeClient
    .patch(id)
    .set({
      status: orgWorkItemRejectStatus(),
      rejectionFeedback: feedback,
      updatedAt: new Date().toISOString(),
    })
    .commit()

  notifyOrgWorkItemCascadeEmail({
    docType,
    itemId: id,
    event: 'rejected',
    feedback,
  })

  return NextResponse.json({ ok: true })
}
