import { NextRequest, NextResponse } from 'next/server'
import { writeClient } from '@/sanity/lib/write-client'
import { getStakeholderEngagement } from '@/sanity/lib/stakeholder-engagement/get-stakeholder-engagement'
import { withOracleConnection } from '@/lib/oracle/client'

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

function mapPayloadToDbFields(payload: Record<string, unknown>) {
  const fields: Record<string, unknown> = {
    name: String(payload.name || '').trim(),
  }
  if (typeof payload.sn === 'number') fields.sn = payload.sn
  if (
    STAKEHOLDER_CATEGORIES.includes(
      payload.stakeholder as (typeof STAKEHOLDER_CATEGORIES)[number],
    )
  )
    fields.stakeholder = payload.stakeholder
  if (typeof payload.designation === 'string')
    fields.designation = payload.designation.trim()
  if (typeof payload.phoneNumber === 'string')
    fields.phone_number = payload.phoneNumber.trim()
  if (typeof payload.emailAddress === 'string')
    fields.email_address = payload.emailAddress.trim()
  if (typeof payload.address === 'string') fields.address = payload.address.trim()
  if (typeof payload.objectiveOfEngagement === 'string')
    fields.objective_of_engagement = payload.objectiveOfEngagement.trim()
  if (typeof payload.initiativeCode === 'string')
    fields.initiative_code = payload.initiativeCode.trim() || null
  if (POWER_VALUES.includes(payload.power as (typeof POWER_VALUES)[number]))
    fields.power = payload.power
  if (POWER_VALUES.includes(payload.interest as (typeof POWER_VALUES)[number]))
    fields.interest = payload.interest
  if (POWER_VALUES.includes(payload.priority as (typeof POWER_VALUES)[number]))
    fields.priority = payload.priority
  if (typeof payload.stakeholderExpectations === 'string')
    fields.stakeholder_expectations = payload.stakeholderExpectations.trim()
  if (typeof payload.uraExpectations === 'string')
    fields.ura_expectations = payload.uraExpectations.trim()
  if (typeof payload.proposedDateOfEngagement === 'string')
    fields.proposed_date_of_engagement = payload.proposedDateOfEngagement
  if (typeof payload.engagementReport === 'string')
    fields.engagement_report = payload.engagementReport.trim()
  if (
    MODE_OPTIONS.includes(payload.modeOfEngagement as (typeof MODE_OPTIONS)[number])
  )
    fields.mode_of_engagement = payload.modeOfEngagement
  if (typeof payload.budgetHighlights === 'string')
    fields.budget_highlights = payload.budgetHighlights.trim()
  if (typeof payload.totalCost === 'number') fields.total_cost = payload.totalCost
  if (payload.uraDelegation && typeof payload.uraDelegation === 'string')
    fields.ura_delegation_staff_id = payload.uraDelegation
  return fields
}

async function resolveStakeholderEntryIdByIndex(
  conn: any,
  engagementId: string,
  stakeholderIndex: number,
): Promise<string | null> {
  const rn = stakeholderIndex + 1
  const res = await conn.execute(
    `
      SELECT entry_id AS "entry_id"
      FROM (
        SELECT
          id AS entry_id,
          ROW_NUMBER() OVER (ORDER BY sn NULLS LAST, name ASC, id ASC) AS rn
        FROM stakeholder_entries
        WHERE engagement_id = :id
      )
      WHERE rn = :rn
    `,
    { id: engagementId, rn } as any,
  )
  const row = res.rows?.[0] as { entry_id?: string } | undefined
  return row?.entry_id ?? null
}

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

    if (process.env.CMS_PROVIDER === 'oracle') {
      return withOracleConnection(async conn => {
        const existsRes = await conn.execute(
          `SELECT id AS "id" FROM stakeholder_engagements WHERE id = :id FETCH FIRST 1 ROWS ONLY`,
          { id } as any,
        )
        if (!existsRes.rows?.[0]) {
          return NextResponse.json(
            { error: 'Stakeholder engagement not found' },
            { status: 404 },
          )
        }

        if (op === 'addStakeholder') {
          if (!payload.name || typeof payload.name !== 'string') {
            return NextResponse.json({ error: 'name is required' }, { status: 400 })
          }

          const entryId = crypto.randomUUID()
          const stakeholderKey = crypto.randomUUID()
          const fields = mapPayloadToDbFields(payload)

          await conn.execute(
            `
              INSERT INTO stakeholder_entries (
                id, engagement_id, stakeholder_key,
                sn, stakeholder, designation, name,
                phone_number, email_address, address,
                objective_of_engagement, initiative_code,
                power, interest, priority,
                stakeholder_expectations, ura_expectations,
                proposed_date_of_engagement, mode_of_engagement,
                engagement_report, budget_highlights, total_cost,
                ura_delegation_staff_id
              ) VALUES (
                :id, :engagement_id, :stakeholder_key,
                :sn, :stakeholder, :designation, :name,
                :phone_number, :email_address, :address,
                :objective_of_engagement, :initiative_code,
                :power, :interest, :priority,
                :stakeholder_expectations, :ura_expectations,
                :proposed_date_of_engagement, :mode_of_engagement,
                :engagement_report, :budget_highlights, :total_cost,
                :ura_delegation_staff_id
              )
            `,
            {
              id: entryId,
              engagement_id: id,
              stakeholder_key: stakeholderKey,
              sn: fields.sn ?? null,
              stakeholder: fields.stakeholder ?? null,
              designation: fields.designation ?? null,
              name: fields.name,
              phone_number: fields.phone_number ?? null,
              email_address: fields.email_address ?? null,
              address: fields.address ?? null,
              objective_of_engagement: fields.objective_of_engagement ?? null,
              initiative_code: fields.initiative_code ?? null,
              power: fields.power ?? null,
              interest: fields.interest ?? null,
              priority: fields.priority ?? null,
              stakeholder_expectations: fields.stakeholder_expectations ?? null,
              ura_expectations: fields.ura_expectations ?? null,
              proposed_date_of_engagement:
                fields.proposed_date_of_engagement ?? null,
              mode_of_engagement: fields.mode_of_engagement ?? null,
              engagement_report: fields.engagement_report ?? null,
              budget_highlights: fields.budget_highlights ?? null,
              total_cost: fields.total_cost ?? null,
              ura_delegation_staff_id: fields.ura_delegation_staff_id ?? null,
            } as any,
            { autoCommit: true },
          )

          return NextResponse.json({ ok: true })
        }

        if (op === 'updateStakeholder') {
          const { stakeholderIndex, ...fieldsRaw } = payload as {
            stakeholderIndex?: number
            [key: string]: unknown
          }
          if (typeof stakeholderIndex !== 'number') {
            return NextResponse.json(
              { error: 'stakeholderIndex is required' },
              { status: 400 },
            )
          }

          const entryId = await resolveStakeholderEntryIdByIndex(
            conn,
            id,
            stakeholderIndex,
          )
          if (!entryId) {
            return NextResponse.json({ error: 'Stakeholder not found' }, { status: 404 })
          }

          const fields = mapPayloadToDbFields({
            ...fieldsRaw,
            name: fieldsRaw.name ?? '',
          })

          await conn.execute(
            `
              UPDATE stakeholder_entries
              SET
                sn = :sn,
                stakeholder = :stakeholder,
                designation = :designation,
                name = :name,
                phone_number = :phone_number,
                email_address = :email_address,
                address = :address,
                objective_of_engagement = :objective_of_engagement,
                initiative_code = :initiative_code,
                power = :power,
                interest = :interest,
                priority = :priority,
                stakeholder_expectations = :stakeholder_expectations,
                ura_expectations = :ura_expectations,
                proposed_date_of_engagement = :proposed_date_of_engagement,
                mode_of_engagement = :mode_of_engagement,
                engagement_report = :engagement_report,
                budget_highlights = :budget_highlights,
                total_cost = :total_cost,
                ura_delegation_staff_id = :ura_delegation_staff_id
              WHERE id = :id
            `,
            {
              id: entryId,
              sn: fields.sn ?? null,
              stakeholder: fields.stakeholder ?? null,
              designation: fields.designation ?? null,
              name: fields.name,
              phone_number: fields.phone_number ?? null,
              email_address: fields.email_address ?? null,
              address: fields.address ?? null,
              objective_of_engagement: fields.objective_of_engagement ?? null,
              initiative_code: fields.initiative_code ?? null,
              power: fields.power ?? null,
              interest: fields.interest ?? null,
              priority: fields.priority ?? null,
              stakeholder_expectations: fields.stakeholder_expectations ?? null,
              ura_expectations: fields.ura_expectations ?? null,
              proposed_date_of_engagement:
                fields.proposed_date_of_engagement ?? null,
              mode_of_engagement: fields.mode_of_engagement ?? null,
              engagement_report: fields.engagement_report ?? null,
              budget_highlights: fields.budget_highlights ?? null,
              total_cost: fields.total_cost ?? null,
              ura_delegation_staff_id: fields.ura_delegation_staff_id ?? null,
            } as any,
            { autoCommit: true },
          )

          return NextResponse.json({ ok: true })
        }

        if (op === 'updateReport') {
          const { stakeholderIndex, engagementReport } = payload as {
            stakeholderIndex?: number
            engagementReport?: unknown
          }
          if (typeof stakeholderIndex !== 'number') {
            return NextResponse.json(
              { error: 'stakeholderIndex is required' },
              { status: 400 },
            )
          }
          if (
            engagementReport !== undefined &&
            typeof engagementReport !== 'string'
          ) {
            return NextResponse.json(
              { error: 'engagementReport must be a string' },
              { status: 400 },
            )
          }

          const entryId = await resolveStakeholderEntryIdByIndex(
            conn,
            id,
            stakeholderIndex,
          )
          if (!entryId) {
            return NextResponse.json({ error: 'Stakeholder not found' }, { status: 404 })
          }

          await conn.execute(
            `UPDATE stakeholder_entries SET engagement_report = :r WHERE id = :id`,
            { r: String(engagementReport ?? '').trim(), id: entryId } as any,
            { autoCommit: true },
          )
          return NextResponse.json({ ok: true })
        }

        if (op === 'deleteStakeholder') {
          const { stakeholderIndex } = payload as { stakeholderIndex?: number }
          if (typeof stakeholderIndex !== 'number') {
            return NextResponse.json(
              { error: 'stakeholderIndex is required' },
              { status: 400 },
            )
          }

          const entryId = await resolveStakeholderEntryIdByIndex(
            conn,
            id,
            stakeholderIndex,
          )
          if (!entryId) {
            return NextResponse.json({ error: 'Stakeholder not found' }, { status: 404 })
          }

          await conn.execute(
            `DELETE FROM stakeholder_entries WHERE id = :id`,
            { id: entryId } as any,
            { autoCommit: true },
          )
          return NextResponse.json({ ok: true })
        }

        return NextResponse.json({ error: 'Unknown op' }, { status: 400 })
      })
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
