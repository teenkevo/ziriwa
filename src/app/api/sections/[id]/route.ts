import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { writeClient } from '@/sanity/lib/write-client'
import { purgeSectionCascade } from '@/sanity/lib/cascade-delete'
import { generateUniqueSlug } from '@/sanity/lib/unique-slug'
import { canCreateSection } from '@/lib/app-role'
import { getAppRole } from '@/lib/clerk-app-role.server'
import { getUserIdOrDev } from '@/lib/dev-auth.server'
import { withOracleConnection } from '@/lib/oracle/client'
import { generateUniqueSlugOracle } from '@/lib/oracle/unique-slug'

const staffRef = (id: string) => ({ _type: 'reference' as const, _ref: id })

type SectionDoc = {
  _id: string
  name: string
  division?: { _id: string }
  manager?: { _id: string }
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
    if (!canCreateSection(role)) {
      return NextResponse.json(
        {
          error:
            'Only assistant commissioners and commissioners can update sections',
        },
        { status: 403 },
      )
    }

    const { id } = await params
    const body = await req.json()
    const { name, managerId, divisionId, order } = body as {
      name?: string
      managerId?: string
      divisionId?: string
      order?: number
    }

    if (process.env.CMS_PROVIDER === 'oracle') {
      return withOracleConnection(async conn => {
        const currentRes = await conn.execute(
          `
            SELECT
              s.id AS "id",
              s.name AS "name",
              s.division_id AS "division_id",
              s.manager_id AS "manager_id"
            FROM sections s
            WHERE s.id = :id
            FETCH FIRST 1 ROWS ONLY
          `,
          { id } as any,
        )
        const current = currentRes.rows?.[0] as
          | { id: string; name: string; division_id: string; manager_id: string }
          | undefined
        if (!current) {
          return NextResponse.json({ error: 'Section not found' }, { status: 404 })
        }

        let newSlug: string | undefined
        const sets: string[] = []
        const binds: any = { id }

        if (typeof name === 'string' && name.trim() && name.trim() !== current.name) {
          const trimmed = name.trim()
          const baseSlug = trimmed
            .toLowerCase()
            .replace(/\\s+/g, '-')
            .replace(/[^a-z0-9-]/g, '')
          newSlug = await generateUniqueSlugOracle(baseSlug, 'sections', id)
          sets.push('name = :name')
          binds.name = trimmed
          sets.push('slug_current = :slug_current')
          binds.slug_current = newSlug
        }

        if (typeof divisionId === 'string' && divisionId !== current.division_id) {
          const target = await conn.execute(
            `SELECT department_id AS "dept" FROM divisions WHERE id = :id FETCH FIRST 1 ROWS ONLY`,
            { id: divisionId } as any,
          )
          const currentDiv = await conn.execute(
            `SELECT department_id AS "dept" FROM divisions WHERE id = :id FETCH FIRST 1 ROWS ONLY`,
            { id: current.division_id } as any,
          )
          const targetDept = (target.rows?.[0] as any)?.dept as string | undefined
          const currentDept = (currentDiv.rows?.[0] as any)?.dept as string | undefined
          if (!targetDept || !currentDept || targetDept !== currentDept) {
            return NextResponse.json(
              {
                error:
                  'Section can only be moved to divisions within the same department.',
              },
              { status: 400 },
            )
          }
          sets.push('division_id = :division_id')
          binds.division_id = divisionId
        }

        if (typeof order === 'number') {
          sets.push('order_number = :order_number')
          binds.order_number = order
        }

        const managerChanged =
          typeof managerId === 'string' && managerId !== current.manager_id
        if (managerChanged) {
          sets.push('manager_id = :manager_id')
          binds.manager_id = managerId
        }

        if (!sets.length) {
          return NextResponse.json({ error: 'No changes provided' }, { status: 400 })
        }

        await conn.execute(
          `UPDATE sections SET ${sets.join(', ')} WHERE id = :id`,
          binds,
          { autoCommit: false },
        )

        if (managerChanged) {
          // detach old manager
          await conn.execute(
            `UPDATE staff SET section_id = NULL WHERE id = :id`,
            { id: current.manager_id } as any,
            { autoCommit: false },
          )
          await conn.execute(
            `UPDATE staff SET section_id = :section_id WHERE id = :id`,
            { section_id: id, id: managerId } as any,
            { autoCommit: false },
          )
        }

        await conn.commit()
        return NextResponse.json({ ok: true, ...(newSlug && { slug: newSlug }) })
      })
    }

    const current = await writeClient.fetch<SectionDoc | null>(
      `*[_type == "section" && _id == $id][0]{
        _id,
        name,
        division->{ _id },
        manager->{ _id }
      }`,
      { id },
    )

    if (!current) {
      return NextResponse.json({ error: 'Section not found' }, { status: 404 })
    }

    const patch = writeClient.patch(id)
    let newSlug: string | undefined
    let didPatch = false

    if (typeof name === 'string' && name.trim() && name.trim() !== current.name) {
      const trimmed = name.trim()
      const baseSlug = trimmed
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '')
      newSlug = await generateUniqueSlug(baseSlug, 'section', id)
      patch.set({
        name: trimmed,
        slug: { _type: 'slug', current: newSlug },
      })
      didPatch = true
    }

    if (
      typeof divisionId === 'string' &&
      divisionId !== current.division?._id
    ) {
      const targetDept = await writeClient.fetch<string | null>(
        `*[_type == "division" && _id == $divId][0].department._ref`,
        { divId: divisionId },
      )
      const currentDept =
        current.division?._id != null
          ? await writeClient.fetch<string | null>(
              `*[_type == "division" && _id == $divId][0].department._ref`,
              { divId: current.division._id },
            )
          : null
      if (!targetDept || targetDept !== currentDept) {
        return NextResponse.json(
          {
            error:
              'Section can only be moved to divisions within the same department.',
          },
          { status: 400 },
        )
      }
      patch.set({ division: staffRef(divisionId) })
      didPatch = true
    }

    if (typeof order === 'number') {
      patch.set({ order })
      didPatch = true
    }

    const managerChanged =
      typeof managerId === 'string' &&
      managerId !== (current.manager?._id ?? '')

    if (managerChanged) {
      patch.set({ manager: staffRef(managerId) })
      didPatch = true
    }

    if (!didPatch) {
      return NextResponse.json(
        { error: 'No changes provided' },
        { status: 400 },
      )
    }

    await patch.commit()

    if (managerChanged) {
      if (current.manager?._id) {
        await writeClient.patch(current.manager._id).unset(['section']).commit()
      }
      await writeClient
        .patch(managerId)
        .set({ section: staffRef(id) })
        .commit()
    }

    return NextResponse.json({
      ok: true,
      ...(newSlug && { slug: newSlug }),
    })
  } catch (error) {
    console.error('Error updating section', error)
    return NextResponse.json(
      { error: 'Failed to update section' },
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
    if (!canCreateSection(role)) {
      return NextResponse.json(
        {
          error:
            'Only assistant commissioners and commissioners can delete sections',
        },
        { status: 403 },
      )
    }

    const { id } = await params

    if (process.env.CMS_PROVIDER === 'oracle') {
      return withOracleConnection(async conn => {
        const existsRes = await conn.execute(
          `SELECT id AS "id" FROM sections WHERE id = :id FETCH FIRST 1 ROWS ONLY`,
          { id } as any,
        )
        if (!existsRes.rows?.[0]) {
          return NextResponse.json({ error: 'Section not found' }, { status: 404 })
        }

        // Clear staff links
        await conn.execute(
          `UPDATE staff SET section_id = NULL WHERE section_id = :id`,
          { id } as any,
          { autoCommit: false },
        )

        // Stakeholder engagement cascade
        await conn.execute(
          `DELETE FROM stakeholder_entries WHERE engagement_id IN (SELECT id FROM stakeholder_engagements WHERE section_id = :id)`,
          { id } as any,
          { autoCommit: false },
        )
        await conn.execute(
          `DELETE FROM stakeholder_engagements WHERE section_id = :id`,
          { id } as any,
          { autoCommit: false },
        )

        // Contracts cascade
        await conn.execute(
          `DELETE FROM measurable_activity_evidence WHERE activity_id IN (
             SELECT ma.id FROM measurable_activities ma
             JOIN contract_initiatives ci ON ci.id = ma.initiative_id
             JOIN contract_objectives co ON co.id = ci.objective_id
             JOIN section_contracts sc ON sc.id = co.contract_id
             WHERE sc.section_id = :id
           )`,
          { id } as any,
          { autoCommit: false },
        )
        await conn.execute(
          `DELETE FROM measurable_activities WHERE initiative_id IN (
             SELECT ci.id FROM contract_initiatives ci
             JOIN contract_objectives co ON co.id = ci.objective_id
             JOIN section_contracts sc ON sc.id = co.contract_id
             WHERE sc.section_id = :id
           )`,
          { id } as any,
          { autoCommit: false },
        )
        await conn.execute(
          `DELETE FROM contract_initiatives WHERE objective_id IN (
             SELECT co.id FROM contract_objectives co
             JOIN section_contracts sc ON sc.id = co.contract_id
             WHERE sc.section_id = :id
           )`,
          { id } as any,
          { autoCommit: false },
        )
        await conn.execute(
          `DELETE FROM contract_objectives WHERE contract_id IN (
             SELECT id FROM section_contracts WHERE section_id = :id
           )`,
          { id } as any,
          { autoCommit: false },
        )
        await conn.execute(
          `DELETE FROM section_contracts WHERE section_id = :id`,
          { id } as any,
          { autoCommit: false },
        )

        // Weekly sprints cascade
        await conn.execute(
          `DELETE FROM work_submission_review_thread WHERE work_submission_id IN (
             SELECT ws.id FROM work_submissions ws
             JOIN sprint_tasks st ON st.id = ws.sprint_task_id
             JOIN weekly_sprints sp ON sp.id = st.sprint_id
             WHERE sp.section_id = :id
           )`,
          { id } as any,
          { autoCommit: false },
        )
        await conn.execute(
          `DELETE FROM work_submissions WHERE sprint_task_id IN (
             SELECT st.id FROM sprint_tasks st
             JOIN weekly_sprints sp ON sp.id = st.sprint_id
             WHERE sp.section_id = :id
           )`,
          { id } as any,
          { autoCommit: false },
        )
        await conn.execute(
          `DELETE FROM sprint_tasks WHERE sprint_id IN (SELECT id FROM weekly_sprints WHERE section_id = :id)`,
          { id } as any,
          { autoCommit: false },
        )
        await conn.execute(
          `DELETE FROM weekly_sprints WHERE section_id = :id`,
          { id } as any,
          { autoCommit: false },
        )

        await conn.execute(
          `DELETE FROM sections WHERE id = :id`,
          { id } as any,
          { autoCommit: false },
        )

        await conn.commit()
        return NextResponse.json({ ok: true })
      })
    }

    const section = await writeClient.fetch<SectionDoc | null>(
      `*[_type == "section" && _id == $id][0]{ _id }`,
      { id },
    )

    if (!section) {
      return NextResponse.json({ error: 'Section not found' }, { status: 404 })
    }

    await purgeSectionCascade(writeClient, id)

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Error deleting section', error)
    return NextResponse.json(
      { error: 'Failed to delete section' },
      { status: 500 },
    )
  }
}
