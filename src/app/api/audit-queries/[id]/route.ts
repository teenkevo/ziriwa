import { NextRequest, NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'

import { getAppRole } from '@/lib/clerk-app-role.server'
import { isSuperadmin } from '@/lib/authz/guards.server'
import { canManageDepartmentContract } from '@/lib/department-contract-access.server'
import {
  isDivisionInDepartment,
} from '@/lib/board-actions-commissioner.server'
import { handleOrgWorkItemWorkflowAction } from '@/lib/org-work-item/handlers.server'
import { notifyOrgWorkItemCascadeEmail } from '@/lib/org-work-item/notify-org-work-item-email.server'
import { client } from '@/sanity/lib/client'
import { writeClient } from '@/sanity/lib/write-client'

async function getViewerEmail() {
  const user = await currentUser()
  return (
    user?.primaryEmailAddress?.emailAddress ??
    user?.emailAddresses?.[0]?.emailAddress ??
    ''
  )
    .trim()
    .toLowerCase()
}

async function getAuditQueryDepartmentId(id: string) {
  return client.fetch<string | null>(
    /* groq */ `*[_type == "auditQuery" && _id == $id][0].department._ref`,
    { id },
  )
}

async function delegateAuditQuery(id: string, sectionId: string, email: string) {
  const role = await getAppRole()
  if (role !== 'assistant_commissioner' && !(await isSuperadmin())) {
    return NextResponse.json(
      { error: 'Only assistant commissioners can delegate audit queries' },
      { status: 403 },
    )
  }

  const viewerStaffId = await client.fetch<string | null>(
    /* groq */ `*[_type == "staff" && lower(email) == $email && status == "active"][0]._id`,
    { email },
  )

  const actionMeta = await client.fetch<{ divisionId: string | null } | null>(
    /* groq */ `*[_type == "auditQuery" && _id == $id][0]{ "divisionId": division._ref }`,
    { id },
  )
  if (!actionMeta) {
    return NextResponse.json({ error: 'Audit query not found' }, { status: 404 })
  }
  if (!actionMeta.divisionId) {
    return NextResponse.json(
      { error: 'Commissioner-level queries cannot be delegated to a section' },
      { status: 400 },
    )
  }

  const canDelegate = await client.fetch<boolean>(
    /* groq */ `
      count(
        *[
          _type == "division"
          && _id == $divisionId
          && (
            lower(assistantCommissioner->email) == $email
            || assistantCommissioner._ref == *[_type == "staff" && lower(email) == $email && status == "active"][0]._id
          )
        ][0]
      ) > 0
    `,
    { divisionId: actionMeta.divisionId, email },
  )
  if (!canDelegate && !(await isSuperadmin())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const sectionValid = await client.fetch<boolean>(
    /* groq */ `count(*[_type == "section" && _id == $sectionId && division._ref == $divisionId]) > 0`,
    { sectionId, divisionId: actionMeta.divisionId },
  )
  if (!sectionValid) {
    return NextResponse.json({ error: 'Invalid section' }, { status: 400 })
  }

  await writeClient
    .patch(id)
    .set({
      section: { _type: 'reference', _ref: sectionId },
      delegatedBy: viewerStaffId
        ? { _type: 'reference', _ref: viewerStaffId }
        : undefined,
      status: 'delegated_to_section',
      updatedAt: new Date().toISOString(),
    })
    .unset(['supervisor', 'assignee', 'response', 'responseSubmittedAt', 'rejectionFeedback'])
    .commit()

  notifyOrgWorkItemCascadeEmail({
    docType: 'auditQuery',
    itemId: id,
    cascadeRole: 'assistant_commissioner',
  })

  return NextResponse.json({ ok: true })
}

const STATUSES = [
  'at_commissioner',
  'assigned_to_division',
  'delegated_to_section',
  'assigned_to_supervisor',
  'assigned_to_officer',
  'pending_supervisor_approval',
  'pending_manager_approval',
  'pending_ac_approval',
  'pending_commissioner_approval',
  'completed',
] as const

async function updateAuditQuery(
  id: string,
  body: {
    title?: string
    description?: string
    dueDate?: string
    divisionId?: string | null
    status?: string
  },
) {
  const role = await getAppRole()
  if (role !== 'commissioner' && !(await isSuperadmin())) {
    return NextResponse.json(
      { error: 'Only commissioners can update audit queries' },
      { status: 403 },
    )
  }

  const existing = await client.fetch<{
    status?: string
    departmentId?: string
    divisionId?: string
  } | null>(
    /* groq */ `*[_type == "auditQuery" && _id == $id][0]{
      status,
      "departmentId": department._ref,
      "divisionId": division._ref
    }`,
    { id },
  )
  if (!existing?.departmentId) {
    return NextResponse.json({ error: 'Audit query not found' }, { status: 404 })
  }
  if (!(await canManageDepartmentContract(existing.departmentId))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const patch = writeClient.patch(id)
  const setFields: Record<string, unknown> = {
    updatedAt: new Date().toISOString(),
  }
  const unsetFields: string[] = []

  if (body.title !== undefined) {
    const trimmed = body.title.trim()
    if (!trimmed) {
      return NextResponse.json({ error: 'title cannot be empty' }, { status: 400 })
    }
    setFields.title = trimmed
  }
  if (body.description !== undefined) setFields.description = body.description.trim()
  if (body.dueDate !== undefined) {
    if (!body.dueDate) {
      return NextResponse.json({ error: 'dueDate is required' }, { status: 400 })
    }
    setFields.dueDate = body.dueDate
  }
  if (body.status !== undefined) {
    if (!STATUSES.includes(body.status as (typeof STATUSES)[number])) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }
    setFields.status = body.status
  }
  if (body.divisionId !== undefined) {
    const trimmedDivisionId =
      body.divisionId === null ? '' : String(body.divisionId).trim()
    if (trimmedDivisionId) {
      const divisionValid = await isDivisionInDepartment(
        trimmedDivisionId,
        existing.departmentId,
      )
      if (!divisionValid) {
        return NextResponse.json({ error: 'Invalid division' }, { status: 400 })
      }
      const divisionChanged = existing.divisionId !== trimmedDivisionId
      setFields.division = { _type: 'reference', _ref: trimmedDivisionId }
      if (divisionChanged) {
        unsetFields.push('section', 'delegatedBy', 'supervisor', 'assignee')
        setFields.status = 'assigned_to_division'
      } else if (existing.status === 'at_commissioner') {
        setFields.status = 'assigned_to_division'
      }
    } else {
      unsetFields.push('division', 'section', 'delegatedBy', 'supervisor', 'assignee')
      setFields.status = 'at_commissioner'
    }
  }

  if (unsetFields.length > 0) patch.unset(unsetFields)
  patch.set(setFields)
  await patch.commit()
  return NextResponse.json({ ok: true })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const body = (await req.json()) as Record<string, unknown>

    if (body.action) {
      return handleOrgWorkItemWorkflowAction({
        docType: 'auditQuery',
        id,
        body,
      })
    }

    if (typeof body.sectionId === 'string' && body.sectionId.trim()) {
      const email = await getViewerEmail()
      return delegateAuditQuery(id, body.sectionId.trim(), email)
    }

    if (
      body.title === undefined &&
      body.description === undefined &&
      body.dueDate === undefined &&
      body.divisionId === undefined &&
      body.status === undefined
    ) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    return updateAuditQuery(id, body as Parameters<typeof updateAuditQuery>[1])
  } catch (error) {
    console.error('Failed to update audit query', error)
    return NextResponse.json({ error: 'Failed to update audit query' }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const role = await getAppRole()
    if (role !== 'commissioner' && !(await isSuperadmin())) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const departmentId = await getAuditQueryDepartmentId(id)
    if (!departmentId) {
      return NextResponse.json({ error: 'Audit query not found' }, { status: 404 })
    }
    if (!(await canManageDepartmentContract(departmentId))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await writeClient.delete(id)
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Failed to delete audit query', error)
    return NextResponse.json({ error: 'Failed to delete audit query' }, { status: 500 })
  }
}
