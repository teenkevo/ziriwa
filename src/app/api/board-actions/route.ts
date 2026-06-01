import { NextRequest, NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'

import { getAppRole } from '@/lib/clerk-app-role.server'
import { isSuperadmin } from '@/lib/authz/guards.server'
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
        { error: 'Only commissioners can create board actions' },
        { status: 403 },
      )
    }

    const commissionerCtx = await client.fetch<{
      departmentId: string | null
      staffId: string | null
    }>(
      /* groq */ `
        {
          "departmentId": coalesce(
            *[_type == "department" && commissioner->status == "active" && lower(commissioner->email) == $email][0]._id,
            *[_type == "department" && commissioner._ref == *[_type == "staff" && lower(email) == $email && status == "active"][0]._id][0]._id,
            *[_type == "staff" && lower(email) == $email && status == "active" && role == "commissioner"][0].department._ref
          ),
          "staffId": *[_type == "staff" && lower(email) == $email && status == "active"][0]._id
        }
      `,
      { email },
    )

    if (!commissionerCtx?.departmentId) {
      return NextResponse.json(
        { error: 'No commissioner department found for your account' },
        { status: 403 },
      )
    }

    const trimmedDivisionId = divisionId?.trim()
    if (trimmedDivisionId) {
      const divisionValid = await client.fetch<boolean>(
        /* groq */ `
          count(*[_type == "division" && _id == $divisionId && department._ref == $departmentId]) > 0
        `,
        {
          divisionId: trimmedDivisionId,
          departmentId: commissionerCtx.departmentId,
        },
      )

      if (!divisionValid) {
        return NextResponse.json(
          { error: 'Division does not belong to your department' },
          { status: 400 },
        )
      }
    }

    const created = await writeClient.create({
      _type: 'boardAction',
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

    return NextResponse.json({ id: created._id }, { status: 201 })
  } catch (error) {
    console.error('Failed to create board action', error)
    return NextResponse.json(
      { error: 'Failed to create board action' },
      { status: 500 },
    )
  }
}
