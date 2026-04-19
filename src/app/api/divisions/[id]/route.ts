import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { writeClient } from '@/sanity/lib/write-client'
import { purgeDivisionCascade } from '@/sanity/lib/cascade-delete'
import { hasRoleAtLeast } from '@/lib/app-role'
import { getAppRole } from '@/lib/clerk-app-role.server'
import { getUserIdOrDev } from '@/lib/dev-auth.server'
import { withOracleConnection } from '@/lib/oracle/client'

const staffRef = (id: string) => ({ _type: 'reference' as const, _ref: id })

type DivisionDoc = {
  _id: string
  department?: { _id: string }
  assistantCommissioner?: { _id: string }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await getUserIdOrDev()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const role = await getAppRole()
    if (!hasRoleAtLeast(role, 'commissioner')) {
      return NextResponse.json(
        { error: 'Only commissioners can update divisions' },
        { status: 403 },
      )
    }

    const { id } = await params
    const body = await req.json()
    const { fullName, acronym, assistantCommissionerId, isDefault } = body as {
      fullName?: string
      acronym?: string | null
      assistantCommissionerId?: string | null
      isDefault?: boolean
    }

    if (process.env.CMS_PROVIDER === 'oracle') {
      return withOracleConnection(async conn => {
        const currentRes = await conn.execute(
          `
            SELECT
              id AS "id",
              department_id AS "department_id",
              assistant_commissioner_id AS "assistant_commissioner_id"
            FROM divisions
            WHERE id = :id
            FETCH FIRST 1 ROWS ONLY
          `,
          { id } as any,
        )
        const current = currentRes.rows?.[0] as
          | {
              id: string
              department_id: string
              assistant_commissioner_id: string | null
            }
          | undefined
        if (!current) {
          return NextResponse.json({ error: 'Division not found' }, { status: 404 })
        }

        const sets: string[] = []
        const binds: any = { id }

        if (typeof fullName === 'string' && fullName.trim()) {
          sets.push('full_name = :full_name')
          binds.full_name = fullName.trim()
        }
        if (acronym !== undefined) {
          sets.push('acronym = :acronym')
          binds.acronym =
            acronym === null || acronym === ''
              ? null
              : String(acronym).trim() || null
        }
        if (typeof isDefault === 'boolean') {
          sets.push('is_default = :is_default')
          binds.is_default = isDefault ? 1 : 0
        }

        const oldAcId = current.assistant_commissioner_id
        if (assistantCommissionerId !== undefined) {
          const newAcId =
            assistantCommissionerId === null || assistantCommissionerId === ''
              ? null
              : String(assistantCommissionerId).trim()
          sets.push('assistant_commissioner_id = :assistant_commissioner_id')
          binds.assistant_commissioner_id = newAcId

          if (oldAcId && oldAcId !== newAcId) {
            await conn.execute(
              `UPDATE staff SET division_id = NULL WHERE id = :id`,
              { id: oldAcId } as any,
              { autoCommit: false },
            )
          }
          if (newAcId && oldAcId !== newAcId) {
            await conn.execute(
              `UPDATE staff SET division_id = :divId, department_id = :deptId WHERE id = :id`,
              { divId: id, deptId: current.department_id, id: newAcId } as any,
              { autoCommit: false },
            )
          }
        }

        if (!sets.length) {
          return NextResponse.json({ error: 'No changes provided' }, { status: 400 })
        }

        await conn.execute(
          `UPDATE divisions SET ${sets.join(', ')} WHERE id = :id`,
          binds,
          { autoCommit: false },
        )

        if (isDefault === true) {
          await conn.execute(
            `UPDATE divisions SET is_default = 0 WHERE department_id = :deptId AND id != :id`,
            { deptId: current.department_id, id } as any,
            { autoCommit: false },
          )
        }

        await conn.commit()
        return NextResponse.json({ ok: true })
      })
    }

    const current = await writeClient.fetch<DivisionDoc | null>(
      `*[_type == "division" && _id == $id][0]{
        _id,
        department->{ _id },
        assistantCommissioner->{ _id }
      }`,
      { id },
    )

    if (!current) {
      return NextResponse.json({ error: 'Division not found' }, { status: 404 })
    }

    const departmentId = current.department?._id
    if (!departmentId) {
      return NextResponse.json(
        { error: 'Division has no department' },
        { status: 400 },
      )
    }

    const oldAcId = current.assistantCommissioner?._id

    const patch = writeClient.patch(id)
    let didPatch = false

    if (typeof fullName === 'string' && fullName.trim()) {
      patch.set({ fullName: fullName.trim() })
      didPatch = true
    }
    if (acronym !== undefined) {
      if (acronym === null || acronym === '') {
        patch.unset(['acronym'])
      } else {
        patch.set({ acronym: String(acronym).trim() })
      }
      didPatch = true
    }
    if (typeof isDefault === 'boolean') {
      patch.set({ isDefault })
      didPatch = true
    }

    if (assistantCommissionerId !== undefined) {
      if (assistantCommissionerId === null || assistantCommissionerId === '') {
        patch.unset(['assistantCommissioner'])
      } else {
        patch.set({
          assistantCommissioner: staffRef(assistantCommissionerId),
        })
      }
      didPatch = true
    }

    if (!didPatch) {
      return NextResponse.json(
        { error: 'No changes provided' },
        { status: 400 },
      )
    }

    await patch.commit()

    if (isDefault === true) {
      const others = await writeClient.fetch<string[]>(
        `*[_type == "division" && department._ref == $deptId && _id != $id]._id`,
        { deptId: departmentId, id },
      )
      for (const otherId of others) {
        await writeClient.patch(otherId).set({ isDefault: false }).commit()
      }
    }

    if (assistantCommissionerId !== undefined) {
      if (oldAcId && oldAcId !== assistantCommissionerId) {
        await writeClient.patch(oldAcId).unset(['division']).commit()
      }
      if (assistantCommissionerId && assistantCommissionerId !== oldAcId) {
        await writeClient
          .patch(assistantCommissionerId)
          .set({
            division: staffRef(id),
            department: staffRef(departmentId),
          })
          .commit()
      }
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Error updating division', error)
    return NextResponse.json(
      { error: 'Failed to update division' },
      { status: 500 },
    )
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await getUserIdOrDev()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const role = await getAppRole()
    if (!hasRoleAtLeast(role, 'commissioner')) {
      return NextResponse.json(
        { error: 'Only commissioners can delete divisions' },
        { status: 403 },
      )
    }

    const { id } = await params

    if (process.env.CMS_PROVIDER === 'oracle') {
      return withOracleConnection(async conn => {
        const existsRes = await conn.execute(
          `SELECT id AS "id" FROM divisions WHERE id = :id FETCH FIRST 1 ROWS ONLY`,
          { id } as any,
        )
        if (!existsRes.rows?.[0]) {
          return NextResponse.json({ error: 'Division not found' }, { status: 404 })
        }

        // Clear staff links
        await conn.execute(
          `UPDATE staff SET division_id = NULL, section_id = NULL WHERE division_id = :id`,
          { id } as any,
          { autoCommit: false },
        )

        // Cascade by sections in this division (same shape as section delete, but set-based)
        await conn.execute(
          `DELETE FROM stakeholder_entries WHERE engagement_id IN (SELECT id FROM stakeholder_engagements WHERE section_id IN (SELECT id FROM sections WHERE division_id = :id))`,
          { id } as any,
          { autoCommit: false },
        )
        await conn.execute(
          `DELETE FROM stakeholder_engagements WHERE section_id IN (SELECT id FROM sections WHERE division_id = :id)`,
          { id } as any,
          { autoCommit: false },
        )

        await conn.execute(
          `DELETE FROM work_submission_review_thread WHERE work_submission_id IN (
             SELECT ws.id
             FROM work_submissions ws
             JOIN sprint_tasks st ON st.id = ws.sprint_task_id
             JOIN weekly_sprints sp ON sp.id = st.sprint_id
             WHERE sp.section_id IN (SELECT id FROM sections WHERE division_id = :id)
           )`,
          { id } as any,
          { autoCommit: false },
        )
        await conn.execute(
          `DELETE FROM work_submissions WHERE sprint_task_id IN (
             SELECT st.id
             FROM sprint_tasks st
             JOIN weekly_sprints sp ON sp.id = st.sprint_id
             WHERE sp.section_id IN (SELECT id FROM sections WHERE division_id = :id)
           )`,
          { id } as any,
          { autoCommit: false },
        )
        await conn.execute(
          `DELETE FROM sprint_tasks WHERE sprint_id IN (SELECT id FROM weekly_sprints WHERE section_id IN (SELECT id FROM sections WHERE division_id = :id))`,
          { id } as any,
          { autoCommit: false },
        )
        await conn.execute(
          `DELETE FROM weekly_sprints WHERE section_id IN (SELECT id FROM sections WHERE division_id = :id)`,
          { id } as any,
          { autoCommit: false },
        )

        await conn.execute(
          `DELETE FROM measurable_activity_evidence WHERE activity_id IN (
             SELECT ma.id
             FROM measurable_activities ma
             JOIN contract_initiatives ci ON ci.id = ma.initiative_id
             JOIN contract_objectives co ON co.id = ci.objective_id
             JOIN section_contracts sc ON sc.id = co.contract_id
             WHERE sc.section_id IN (SELECT id FROM sections WHERE division_id = :id)
           )`,
          { id } as any,
          { autoCommit: false },
        )
        await conn.execute(
          `DELETE FROM measurable_activities WHERE initiative_id IN (
             SELECT ci.id
             FROM contract_initiatives ci
             JOIN contract_objectives co ON co.id = ci.objective_id
             JOIN section_contracts sc ON sc.id = co.contract_id
             WHERE sc.section_id IN (SELECT id FROM sections WHERE division_id = :id)
           )`,
          { id } as any,
          { autoCommit: false },
        )
        await conn.execute(
          `DELETE FROM contract_initiatives WHERE objective_id IN (
             SELECT co.id
             FROM contract_objectives co
             JOIN section_contracts sc ON sc.id = co.contract_id
             WHERE sc.section_id IN (SELECT id FROM sections WHERE division_id = :id)
           )`,
          { id } as any,
          { autoCommit: false },
        )
        await conn.execute(
          `DELETE FROM contract_objectives WHERE contract_id IN (
             SELECT id FROM section_contracts WHERE section_id IN (SELECT id FROM sections WHERE division_id = :id)
           )`,
          { id } as any,
          { autoCommit: false },
        )
        await conn.execute(
          `DELETE FROM section_contracts WHERE section_id IN (SELECT id FROM sections WHERE division_id = :id)`,
          { id } as any,
          { autoCommit: false },
        )

        await conn.execute(
          `DELETE FROM sections WHERE division_id = :id`,
          { id } as any,
          { autoCommit: false },
        )
        await conn.execute(
          `DELETE FROM divisions WHERE id = :id`,
          { id } as any,
          { autoCommit: false },
        )

        await conn.commit()
        return NextResponse.json({ ok: true })
      })
    }

    const exists = await writeClient.fetch<string | null>(
      `*[_type == "division" && _id == $id][0]._id`,
      { id },
    )

    if (!exists) {
      return NextResponse.json({ error: 'Division not found' }, { status: 404 })
    }

    await purgeDivisionCascade(writeClient, id)

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Error deleting division', error)
    return NextResponse.json(
      { error: 'Failed to delete division' },
      { status: 500 },
    )
  }
}
