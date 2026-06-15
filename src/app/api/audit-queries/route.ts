import { NextRequest, NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'

import { getAppRole } from '@/lib/clerk-app-role.server'
import { isSuperadmin } from '@/lib/authz/guards.server'
import { getCommissionerBoardActionsContext } from '@/lib/board-actions-commissioner.server'
import { isDivisionInDepartment } from '@/lib/board-actions-commissioner.server'
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

export async function POST(req: NextRequest) {
  try {
    const role = await getAppRole()
    const email = await getViewerEmail()
    const body = await req.json()
    const { title, description, dueDate, divisionId } = body as {
      title?: string
      description?: string
      dueDate?: string
      divisionId?: string
    }

    if (!title?.trim() || !dueDate) {
      return NextResponse.json(
        { error: 'title and dueDate are required' },
        { status: 400 },
      )
    }

    if (role !== 'commissioner' && !(await isSuperadmin())) {
      return NextResponse.json(
        { error: 'Only commissioners can create audit queries' },
        { status: 403 },
      )
    }

    const commissionerCtx = await getCommissionerBoardActionsContext(email)
    if (!commissionerCtx?.departmentId) {
      return NextResponse.json(
        { error: 'No commissioner department found for your account' },
        { status: 403 },
      )
    }

    const trimmedDivisionId = divisionId?.trim()
    if (trimmedDivisionId) {
      const divisionValid = await isDivisionInDepartment(
        trimmedDivisionId,
        commissionerCtx.departmentId,
      )
      if (!divisionValid) {
        return NextResponse.json(
          { error: 'Division does not belong to your department' },
          { status: 400 },
        )
      }
    }

    const created = await writeClient.create({
      _type: 'auditQuery',
      title: title.trim(),
      description: description?.trim() || '',
      dueDate,
      status: trimmedDivisionId ? 'assigned_to_division' : 'at_commissioner',
      department: { _type: 'reference', _ref: commissionerCtx.departmentId },
      ...(trimmedDivisionId
        ? { division: { _type: 'reference', _ref: trimmedDivisionId } }
        : {}),
      createdBy: commissionerCtx.staffId
        ? { _type: 'reference', _ref: commissionerCtx.staffId }
        : undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })

    if (trimmedDivisionId) {
      notifyOrgWorkItemCascadeEmail({
        docType: 'auditQuery',
        itemId: created._id,
        cascadeRole: 'commissioner',
      })
    }

    return NextResponse.json({ id: created._id }, { status: 201 })
  } catch (error) {
    console.error('Failed to create audit query', error)
    return NextResponse.json(
      { error: 'Failed to create audit query' },
      { status: 500 },
    )
  }
}
