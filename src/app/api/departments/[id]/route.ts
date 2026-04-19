import { NextRequest, NextResponse } from 'next/server'
import { hasRoleAtLeast } from '@/lib/app-role'
import { getAppRole } from '@/lib/clerk-app-role.server'
import { getUserIdOrDev } from '@/lib/dev-auth.server'
import { withOracleConnection } from '@/lib/oracle/client'

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
        { error: 'Only commissioners can update departments' },
        { status: 403 },
      )
    }

    const { id } = await params
    const body = await req.json()
    const { fullName, acronym, commissionerId, isDefault } = body as {
      fullName?: string
      acronym?: string | null
      commissionerId?: string | null
      isDefault?: boolean
    }

    return withOracleConnection(async conn => {
      const currentRes = await conn.execute(
        `
          SELECT
            id AS "id",
            commissioner_id AS "commissioner_id"
          FROM departments
          WHERE id = :id
          FETCH FIRST 1 ROWS ONLY
        `,
        { id } as any,
      )
      const current = currentRes.rows?.[0] as
        | { id: string; commissioner_id: string | null }
        | undefined
      if (!current) {
        return NextResponse.json(
          { error: 'Department not found' },
          { status: 404 },
        )
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

      const oldCommId = current.commissioner_id
      if (commissionerId !== undefined) {
        const newCommId =
          commissionerId === null || commissionerId === ''
            ? null
            : String(commissionerId).trim()
        sets.push('commissioner_id = :commissioner_id')
        binds.commissioner_id = newCommId

        if (oldCommId && oldCommId !== newCommId) {
          await conn.execute(
            `UPDATE staff SET department_id = NULL WHERE id = :id`,
            { id: oldCommId } as any,
            { autoCommit: false },
          )
        }
        if (newCommId && oldCommId !== newCommId) {
          await conn.execute(
            `UPDATE staff SET department_id = :deptId WHERE id = :id`,
            { deptId: id, id: newCommId } as any,
            { autoCommit: false },
          )
        }
      }

      if (!sets.length) {
        return NextResponse.json(
          { error: 'No changes provided' },
          { status: 400 },
        )
      }

      await conn.execute(
        `UPDATE departments SET ${sets.join(', ')} WHERE id = :id`,
        binds,
        { autoCommit: false },
      )

      if (isDefault === true) {
        await conn.execute(
          `UPDATE departments SET is_default = 0 WHERE id != :id AND is_default = 1`,
          { id } as any,
          { autoCommit: false },
        )
      }

      await conn.commit()
      return NextResponse.json({ ok: true })
    })
  } catch (error) {
    console.error('Error updating department', error)
    return NextResponse.json(
      { error: 'Failed to update department' },
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
        { error: 'Only commissioners can delete departments' },
        { status: 403 },
      )
    }

    const { id } = await params

    return withOracleConnection(async conn => {
      const existsRes = await conn.execute(
        `SELECT id AS "id" FROM departments WHERE id = :id FETCH FIRST 1 ROWS ONLY`,
        { id } as any,
      )
      if (!existsRes.rows?.[0]) {
        return NextResponse.json(
          { error: 'Department not found' },
          { status: 404 },
        )
      }

      await conn.execute(
        `UPDATE staff SET department_id = NULL, division_id = NULL, section_id = NULL WHERE department_id = :id`,
        { id } as any,
        { autoCommit: false },
      )

      await conn.execute(
        `DELETE FROM stakeholder_entries WHERE engagement_id IN (
             SELECT se.id
             FROM stakeholder_engagements se
             JOIN sections s ON s.id = se.section_id
             JOIN divisions d ON d.id = s.division_id
             WHERE d.department_id = :id
           )`,
        { id } as any,
        { autoCommit: false },
      )
      await conn.execute(
        `DELETE FROM stakeholder_engagements WHERE section_id IN (
             SELECT s.id
             FROM sections s
             JOIN divisions d ON d.id = s.division_id
             WHERE d.department_id = :id
           )`,
        { id } as any,
        { autoCommit: false },
      )

      await conn.execute(
        `DELETE FROM work_submission_review_thread WHERE work_submission_id IN (
             SELECT ws.id
             FROM work_submissions ws
             JOIN sprint_tasks st ON st.id = ws.sprint_task_id
             JOIN weekly_sprints sp ON sp.id = st.sprint_id
             JOIN sections s ON s.id = sp.section_id
             JOIN divisions d ON d.id = s.division_id
             WHERE d.department_id = :id
           )`,
        { id } as any,
        { autoCommit: false },
      )
      await conn.execute(
        `DELETE FROM work_submissions WHERE sprint_task_id IN (
             SELECT st.id
             FROM sprint_tasks st
             JOIN weekly_sprints sp ON sp.id = st.sprint_id
             JOIN sections s ON s.id = sp.section_id
             JOIN divisions d ON d.id = s.division_id
             WHERE d.department_id = :id
           )`,
        { id } as any,
        { autoCommit: false },
      )
      await conn.execute(
        `DELETE FROM sprint_tasks WHERE sprint_id IN (
             SELECT sp.id
             FROM weekly_sprints sp
             JOIN sections s ON s.id = sp.section_id
             JOIN divisions d ON d.id = s.division_id
             WHERE d.department_id = :id
           )`,
        { id } as any,
        { autoCommit: false },
      )
      await conn.execute(
        `DELETE FROM weekly_sprints WHERE section_id IN (
             SELECT s.id
             FROM sections s
             JOIN divisions d ON d.id = s.division_id
             WHERE d.department_id = :id
           )`,
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
             JOIN sections s ON s.id = sc.section_id
             JOIN divisions d ON d.id = s.division_id
             WHERE d.department_id = :id
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
             JOIN sections s ON s.id = sc.section_id
             JOIN divisions d ON d.id = s.division_id
             WHERE d.department_id = :id
           )`,
        { id } as any,
        { autoCommit: false },
      )
      await conn.execute(
        `DELETE FROM contract_initiatives WHERE objective_id IN (
             SELECT co.id
             FROM contract_objectives co
             JOIN section_contracts sc ON sc.id = co.contract_id
             JOIN sections s ON s.id = sc.section_id
             JOIN divisions d ON d.id = s.division_id
             WHERE d.department_id = :id
           )`,
        { id } as any,
        { autoCommit: false },
      )
      await conn.execute(
        `DELETE FROM contract_objectives WHERE contract_id IN (
             SELECT sc.id
             FROM section_contracts sc
             JOIN sections s ON s.id = sc.section_id
             JOIN divisions d ON d.id = s.division_id
             WHERE d.department_id = :id
           )`,
        { id } as any,
        { autoCommit: false },
      )
      await conn.execute(
        `DELETE FROM section_contracts WHERE section_id IN (
             SELECT s.id
             FROM sections s
             JOIN divisions d ON d.id = s.division_id
             WHERE d.department_id = :id
           )`,
        { id } as any,
        { autoCommit: false },
      )

      await conn.execute(
        `DELETE FROM sections WHERE division_id IN (SELECT id FROM divisions WHERE department_id = :id)`,
        { id } as any,
        { autoCommit: false },
      )
      await conn.execute(
        `DELETE FROM divisions WHERE department_id = :id`,
        { id } as any,
        { autoCommit: false },
      )
      await conn.execute(
        `DELETE FROM departments WHERE id = :id`,
        { id } as any,
        { autoCommit: false },
      )

      await conn.commit()
      return NextResponse.json({ ok: true })
    })
  } catch (error) {
    console.error('Error deleting department', error)
    return NextResponse.json(
      { error: 'Failed to delete department' },
      { status: 500 },
    )
  }
}
