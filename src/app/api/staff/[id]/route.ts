import { NextRequest, NextResponse } from 'next/server'
import { writeClient } from '@/sanity/lib/write-client'
import { assertAuth } from '@/lib/authz/guards.server'
import { audit } from '@/lib/audit-log/events'
import {
  assertSectionStaffManageAllowed,
  getSectionAccessForViewer,
} from '@/lib/section-access.server'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authResult = await assertAuth()
    if (authResult instanceof NextResponse) return authResult

    const { id } = await params
    const body = await req.json()
    const { status, firstName, lastName, phone } = body

    const staff = await writeClient.fetch<{
      _id: string
      role?: string
      sectionId?: string
    } | null>(
      `*[_type == "staff" && _id == $id][0]{
        _id,
        role,
        "sectionId": section._ref
      }`,
      { id },
    )
    if (!staff) {
      return NextResponse.json({ error: 'Staff not found' }, { status: 404 })
    }

    if (!staff.sectionId) {
      return NextResponse.json(
        { error: 'Staff is not assigned to a section' },
        { status: 400 },
      )
    }

    const access = await getSectionAccessForViewer(staff.sectionId)
    const denied = assertSectionStaffManageAllowed(access)
    if (denied) return denied

    if (
      staff.role !== 'supervisor' &&
      staff.role !== 'officer' &&
      status !== undefined
    ) {
      return NextResponse.json(
        { error: 'Only supervisors and officers can be disabled here' },
        { status: 400 },
      )
    }

    const patch: Record<string, unknown> = {}
    if (status === 'active' || status === 'inactive') {
      patch.status = status
    }
    if (typeof firstName === 'string' && firstName.trim()) {
      patch.firstName = firstName.trim()
    }
    if (typeof lastName === 'string' && lastName.trim()) {
      patch.lastName = lastName.trim()
    }
    if (typeof phone === 'string') {
      patch.phone = phone.trim() || undefined
    }
    if (patch.firstName || patch.lastName) {
      const current = await writeClient.getDocument(id)
      const fn =
        (patch.firstName as string) ??
        (current?.firstName as string | undefined) ??
        ''
      const ln =
        (patch.lastName as string) ??
        (current?.lastName as string | undefined) ??
        ''
      patch.fullName = `${fn} ${ln}`.trim()
    }

    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    await writeClient.patch(id).set(patch).commit()
    const label =
      (patch.fullName as string | undefined) ??
      `${patch.firstName ?? ''} ${patch.lastName ?? ''}`.trim() ??
      id
    audit.staff.updated(id, label, patch)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('PATCH staff', error)
    return NextResponse.json({ error: 'Failed to update staff' }, { status: 500 })
  }
}
