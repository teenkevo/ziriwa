import { NextRequest, NextResponse } from 'next/server'
import { purgeStakeholderEngagement } from '@/sanity/lib/cascade-delete'
import { writeClient } from '@/sanity/lib/write-client'
import { purgeStakeholderEntryAssets } from '@/sanity/lib/stakeholder-engagement/purge-stakeholder-entry-assets'
import {
  buildApprovedMinutesDoc,
  buildMinutesApprovalsDoc,
  buildPublishedMinutesDoc,
  buildSavedMinutesDoc,
} from '@/sanity/lib/stakeholder-engagement/stakeholder-minutes-mutations'

const POWER_VALUES = ['H', 'M', 'L'] as const
const STAKEHOLDER_CATEGORIES = [
  'regulatory_body',
  'community_leader',
  'supplier',
  'partner_organization',
  'internal',
  'other',
] as const
const MODE_OPTIONS = [
  'meeting',
  'email',
  'report',
  'workshop',
  'phone_call',
  'site_visit',
  'other',
] as const

function buildStakeholderDoc(payload: Record<string, unknown>) {
  const doc: Record<string, unknown> = {
    _type: 'stakeholderEntry',
    _key: crypto.randomUUID(),
    name: String(payload.name || '').trim(),
  }
  if (typeof payload.sn === 'number') doc.sn = payload.sn
  if (STAKEHOLDER_CATEGORIES.includes(payload.stakeholder as (typeof STAKEHOLDER_CATEGORIES)[number]))
    doc.stakeholder = payload.stakeholder
  if (typeof payload.designation === 'string') doc.designation = payload.designation.trim()
  if (typeof payload.phoneNumber === 'string') doc.phoneNumber = payload.phoneNumber.trim()
  if (typeof payload.emailAddress === 'string') doc.emailAddress = payload.emailAddress.trim()
  if (typeof payload.address === 'string') doc.address = payload.address.trim()
  if (typeof payload.objectiveOfEngagement === 'string')
    doc.objectiveOfEngagement = payload.objectiveOfEngagement.trim()
  if (typeof payload.initiativeCode === 'string')
    doc.initiativeCode = payload.initiativeCode.trim() || undefined
  if (POWER_VALUES.includes(payload.power as (typeof POWER_VALUES)[number])) doc.power = payload.power
  if (POWER_VALUES.includes(payload.interest as (typeof POWER_VALUES)[number]))
    doc.interest = payload.interest
  if (POWER_VALUES.includes(payload.priority as (typeof POWER_VALUES)[number]))
    doc.priority = payload.priority
  if (typeof payload.stakeholderExpectations === 'string')
    doc.stakeholderExpectations = payload.stakeholderExpectations.trim()
  if (typeof payload.uraExpectations === 'string')
    doc.uraExpectations = payload.uraExpectations.trim()
  if (typeof payload.proposedDateOfEngagement === 'string')
    doc.proposedDateOfEngagement = payload.proposedDateOfEngagement
  if (typeof payload.engagementReport === 'string')
    doc.engagementReport = payload.engagementReport.trim()
  if (MODE_OPTIONS.includes(payload.modeOfEngagement as (typeof MODE_OPTIONS)[number]))
    doc.modeOfEngagement = payload.modeOfEngagement
  if (typeof payload.budgetHighlights === 'string')
    doc.budgetHighlights = payload.budgetHighlights.trim()
  if (typeof payload.totalCost === 'number') doc.totalCost = payload.totalCost
  if (payload.uraDelegation && typeof payload.uraDelegation === 'string')
    doc.uraDelegation = { _type: 'reference', _ref: payload.uraDelegation }
  return doc
}

function buildActionPointDoc(payload: Record<string, unknown>) {
  const description = String(payload.description || '').trim()
  const dueDate = String(payload.dueDate || '').trim()
  const assignee =
    typeof payload.assignee === 'string' ? payload.assignee.trim() : ''

  if (!description || !dueDate || !assignee) {
    return null
  }

  return {
    _type: 'stakeholderActionPoint',
    _key:
      typeof payload._key === 'string' && payload._key.trim()
        ? payload._key.trim()
        : crypto.randomUUID(),
    description,
    dueDate,
    assignee: { _type: 'reference', _ref: assignee },
  }
}

/**
 * PATCH /api/stakeholder-engagement/[id]
 * Body: { op: 'addStakeholder' | 'updateStakeholder', payload }
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const body = await req.json()
    const { op, payload } = body

    if (!op || !payload) {
      return NextResponse.json(
        { error: 'op and payload are required' },
        { status: 400 },
      )
    }

    if (op === 'addStakeholder') {
      if (!payload.name || typeof payload.name !== 'string') {
        return NextResponse.json(
          { error: 'name is required' },
          { status: 400 },
        )
      }
      const doc = buildStakeholderDoc(payload)
      await writeClient
        .patch(id)
        .setIfMissing({ stakeholders: [] })
        .append('stakeholders', [doc])
        .commit()
      return NextResponse.json({ ok: true })
    }

    if (op === 'updateStakeholder') {
      const { stakeholderIndex, ...fields } = payload
      if (typeof stakeholderIndex !== 'number') {
        return NextResponse.json(
          { error: 'stakeholderIndex is required' },
          { status: 400 },
        )
      }
      const doc = buildStakeholderDoc({ ...fields, name: fields.name ?? '' })
      delete (doc as Record<string, unknown>)._key
      const setPayload: Record<string, unknown> = {}
      for (const [key, value] of Object.entries(doc)) {
        if (key !== '_type' && value !== undefined) {
          setPayload[`stakeholders[${stakeholderIndex}].${key}`] = value
        }
      }
      if (Object.keys(setPayload).length > 0) {
        await writeClient.patch(id).set(setPayload).commit()
      }
      return NextResponse.json({ ok: true })
    }

    if (op === 'updateReport') {
      const {
        stakeholderIndex,
        engagementReport,
        attendanceSheetFileId,
        clearAttendanceSheet,
      } = payload
      if (typeof stakeholderIndex !== 'number') {
        return NextResponse.json(
          { error: 'stakeholderIndex is required' },
          { status: 400 },
        )
      }
      if (engagementReport !== undefined && typeof engagementReport !== 'string') {
        return NextResponse.json(
          { error: 'engagementReport must be a string' },
          { status: 400 },
        )
      }
      if (
        attendanceSheetFileId !== undefined &&
        typeof attendanceSheetFileId !== 'string'
      ) {
        return NextResponse.json(
          { error: 'attendanceSheetFileId must be a string' },
          { status: 400 },
        )
      }

      const setPayload: Record<string, unknown> = {}
      if (typeof engagementReport === 'string') {
        setPayload[`stakeholders[${stakeholderIndex}].engagementReport`] =
          engagementReport.trim()
      }
      const existingDoc = await writeClient.fetch<{
        stakeholders?: unknown[]
      }>(`*[_id == $id][0]{ stakeholders }`, { id })
      const existingEntry = existingDoc?.stakeholders?.[stakeholderIndex]

      if (clearAttendanceSheet === true) {
        setPayload[`stakeholders[${stakeholderIndex}].attendanceSheet`] = null
      } else if (
        typeof attendanceSheetFileId === 'string' &&
        attendanceSheetFileId.trim()
      ) {
        setPayload[`stakeholders[${stakeholderIndex}].attendanceSheet`] = {
          _type: 'file',
          asset: {
            _type: 'reference',
            _ref: attendanceSheetFileId.trim(),
          },
        }
      }

      if (Object.keys(setPayload).length === 0) {
        return NextResponse.json(
          { error: 'No report updates provided' },
          { status: 400 },
        )
      }

      await writeClient.patch(id).set(setPayload).commit()

      if (
        clearAttendanceSheet === true ||
        (typeof attendanceSheetFileId === 'string' && attendanceSheetFileId.trim())
      ) {
        await purgeStakeholderEntryAssets(writeClient, existingEntry)
      }

      return NextResponse.json({ ok: true })
    }

    if (op === 'setActionPoints') {
      const { stakeholderIndex, actionPoints } = payload
      if (typeof stakeholderIndex !== 'number') {
        return NextResponse.json(
          { error: 'stakeholderIndex is required' },
          { status: 400 },
        )
      }
      if (!Array.isArray(actionPoints)) {
        return NextResponse.json(
          { error: 'actionPoints must be an array' },
          { status: 400 },
        )
      }

      const docs = actionPoints
        .map((item: Record<string, unknown>) => buildActionPointDoc(item))
        .filter(Boolean)

      if (docs.length !== actionPoints.length) {
        return NextResponse.json(
          {
            error:
              'Each action point requires a description, assignee, and due date',
          },
          { status: 400 },
        )
      }

      await writeClient
        .patch(id)
        .set({
          [`stakeholders[${stakeholderIndex}].actionPoints`]: docs,
        })
        .commit()
      return NextResponse.json({ ok: true })
    }

    if (op === 'saveMinutes') {
      const { stakeholderIndex, content, authorId, meetingDate } = payload
      if (typeof stakeholderIndex !== 'number') {
        return NextResponse.json(
          { error: 'stakeholderIndex is required' },
          { status: 400 },
        )
      }
      if (typeof content !== 'string') {
        return NextResponse.json(
          { error: 'content is required' },
          { status: 400 },
        )
      }

      const doc = await writeClient.fetch<{ stakeholders?: unknown[] }>(
        `*[_id == $id][0]{ stakeholders }`,
        { id },
      )
      const entry = doc?.stakeholders?.[stakeholderIndex]
      if (!entry) {
        return NextResponse.json(
          { error: 'Stakeholder not found' },
          { status: 404 },
        )
      }

      const existingMinutes = (entry as { minutes?: { status?: string } }).minutes
      if (existingMinutes?.status === 'published') {
        return NextResponse.json(
          { error: 'Published minutes cannot be edited' },
          { status: 400 },
        )
      }

      const minutesDoc = buildSavedMinutesDoc({
        existingEntry: entry,
        content,
        authorId: typeof authorId === 'string' ? authorId : undefined,
        meetingDate: typeof meetingDate === 'string' ? meetingDate : undefined,
      })

      await writeClient
        .patch(id)
        .set({
          [`stakeholders[${stakeholderIndex}].minutes`]: minutesDoc,
        })
        .commit()
      return NextResponse.json({ ok: true })
    }

    if (op === 'setMinutesApprovals') {
      const { stakeholderIndex, approverIds } = payload
      if (typeof stakeholderIndex !== 'number') {
        return NextResponse.json(
          { error: 'stakeholderIndex is required' },
          { status: 400 },
        )
      }
      if (!Array.isArray(approverIds)) {
        return NextResponse.json(
          { error: 'approverIds must be an array' },
          { status: 400 },
        )
      }

      const doc = await writeClient.fetch<{ stakeholders?: unknown[] }>(
        `*[_id == $id][0]{ stakeholders }`,
        { id },
      )
      const entry = doc?.stakeholders?.[stakeholderIndex]
      if (!entry) {
        return NextResponse.json(
          { error: 'Stakeholder not found' },
          { status: 404 },
        )
      }

      try {
        const minutesDoc = buildMinutesApprovalsDoc(
          entry,
          approverIds.filter((value: unknown) => typeof value === 'string'),
        )
        await writeClient
          .patch(id)
          .set({
            [`stakeholders[${stakeholderIndex}].minutes`]: minutesDoc,
          })
          .commit()
        return NextResponse.json({ ok: true })
      } catch (error) {
        return NextResponse.json(
          {
            error:
              error instanceof Error
                ? error.message
                : 'Failed to assign approvals',
          },
          { status: 400 },
        )
      }
    }

    if (op === 'approveMinutes') {
      const { stakeholderIndex, assigneeId } = payload
      if (typeof stakeholderIndex !== 'number') {
        return NextResponse.json(
          { error: 'stakeholderIndex is required' },
          { status: 400 },
        )
      }
      if (typeof assigneeId !== 'string' || !assigneeId.trim()) {
        return NextResponse.json(
          { error: 'assigneeId is required' },
          { status: 400 },
        )
      }

      const doc = await writeClient.fetch<{ stakeholders?: unknown[] }>(
        `*[_id == $id][0]{ stakeholders }`,
        { id },
      )
      const entry = doc?.stakeholders?.[stakeholderIndex]
      if (!entry) {
        return NextResponse.json(
          { error: 'Stakeholder not found' },
          { status: 404 },
        )
      }

      try {
        const minutesDoc = buildApprovedMinutesDoc(entry, assigneeId.trim())
        await writeClient
          .patch(id)
          .set({
            [`stakeholders[${stakeholderIndex}].minutes`]: minutesDoc,
          })
          .commit()
        return NextResponse.json({ ok: true })
      } catch (error) {
        return NextResponse.json(
          {
            error:
              error instanceof Error ? error.message : 'Failed to approve minutes',
          },
          { status: 400 },
        )
      }
    }

    if (op === 'publishMinutes') {
      const { stakeholderIndex, content } = payload
      if (typeof stakeholderIndex !== 'number') {
        return NextResponse.json(
          { error: 'stakeholderIndex is required' },
          { status: 400 },
        )
      }

      const doc = await writeClient.fetch<{ stakeholders?: unknown[] }>(
        `*[_id == $id][0]{ stakeholders }`,
        { id },
      )
      const entry = doc?.stakeholders?.[stakeholderIndex]
      if (!entry) {
        return NextResponse.json(
          { error: 'Stakeholder not found' },
          { status: 404 },
        )
      }

      try {
        const minutesDoc = buildPublishedMinutesDoc(
          entry,
          typeof content === 'string' ? content : undefined,
        )
        await writeClient
          .patch(id)
          .set({
            [`stakeholders[${stakeholderIndex}].minutes`]: minutesDoc,
          })
          .commit()
        return NextResponse.json({ ok: true })
      } catch (error) {
        return NextResponse.json(
          {
            error:
              error instanceof Error ? error.message : 'Failed to publish minutes',
          },
          { status: 400 },
        )
      }
    }

    if (op === 'deleteMinutes') {
      const { stakeholderIndex } = payload
      if (typeof stakeholderIndex !== 'number') {
        return NextResponse.json(
          { error: 'stakeholderIndex is required' },
          { status: 400 },
        )
      }

      await writeClient
        .patch(id)
        .unset([`stakeholders[${stakeholderIndex}].minutes`])
        .commit()
      return NextResponse.json({ ok: true })
    }

    if (op === 'deleteStakeholder') {
      const { stakeholderIndex } = payload
      if (typeof stakeholderIndex !== 'number') {
        return NextResponse.json(
          { error: 'stakeholderIndex is required' },
          { status: 400 },
        )
      }
      const doc = await writeClient.fetch<{ stakeholders?: unknown[] }>(
        `*[_id == $id][0]{ stakeholders }`,
        { id },
      )
      const stakeholders = doc?.stakeholders ?? []
      const entry = stakeholders[stakeholderIndex]
      if (!entry) {
        return NextResponse.json(
          { error: 'Stakeholder not found' },
          { status: 404 },
        )
      }

      const filtered = stakeholders.filter((_, i) => i !== stakeholderIndex)

      if (filtered.length === 0) {
        await purgeStakeholderEngagement(writeClient, id)
        return NextResponse.json({ ok: true, engagementDeleted: true })
      }

      await purgeStakeholderEntryAssets(writeClient, entry)
      await writeClient.patch(id).set({ stakeholders: filtered }).commit()
      return NextResponse.json({ ok: true, engagementDeleted: false })
    }

    return NextResponse.json({ error: 'Unknown op' }, { status: 400 })
  } catch (error) {
    console.error('Error patching stakeholder engagement', error)
    return NextResponse.json(
      { error: 'Failed to update stakeholder engagement' },
      { status: 500 },
    )
  }
}

/**
 * DELETE /api/stakeholder-engagement/[id]
 * Removes the engagement matrix, all stakeholder entries, and embedded file assets.
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const doc = await writeClient.fetch<{ _id: string } | null>(
      `*[_id == $id && _type == "stakeholderEngagement"][0]{ _id }`,
      { id },
    )
    if (!doc) {
      return NextResponse.json(
        { error: 'Stakeholder engagement not found' },
        { status: 404 },
      )
    }

    await purgeStakeholderEngagement(writeClient, id)
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Error deleting stakeholder engagement', error)
    return NextResponse.json(
      { error: 'Failed to delete stakeholder engagement' },
      { status: 500 },
    )
  }
}
