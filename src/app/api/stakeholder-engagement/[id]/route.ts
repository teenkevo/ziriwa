import { NextRequest, NextResponse } from 'next/server'
import { writeClient } from '@/sanity/lib/write-client'
import { getStakeholderEngagement } from '@/sanity/lib/stakeholder-engagement/get-stakeholder-engagement'

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
      const { stakeholderIndex, engagementReport } = payload
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
      await writeClient
        .patch(id)
        .set({
          [`stakeholders[${stakeholderIndex}].engagementReport`]: engagementReport.trim(),
        })
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
      const filtered = stakeholders.filter((_, i) => i !== stakeholderIndex)
      await writeClient.patch(id).set({ stakeholders: filtered }).commit()
      return NextResponse.json({ ok: true })
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
