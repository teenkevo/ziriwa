import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { writeClient } from '@/sanity/lib/write-client'
import { oracleQuery, withOracleConnection } from '@/lib/oracle/client'
import { validateSprintTaskPayload } from '@/lib/sprint-task-validation'
import { getAppRole } from '@/lib/clerk-app-role.server'
import { getUserIdOrDev } from '@/lib/dev-auth.server'

function parseYMDToDate(ymd: string): Date {
  const [y, m, d] = ymd.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export async function POST(req: NextRequest) {
  try {
    if (process.env.CMS_PROVIDER === 'oracle') {
      const userId = await getUserIdOrDev()
      if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      const role = await getAppRole()
      if (role === 'officer') {
        return NextResponse.json(
          { error: 'Officers cannot create weekly sprints' },
          { status: 403 },
        )
      }

      const body = await req.json()
      const { sectionId, weekLabel, weekStart, weekEnd, tasks } = body

      if (!sectionId || !weekLabel || !weekStart || !weekEnd) {
        return NextResponse.json(
          { error: 'sectionId, weekLabel, weekStart, and weekEnd are required' },
          { status: 400 },
        )
      }

      if (!Array.isArray(tasks) || tasks.length === 0) {
        return NextResponse.json({ error: 'At least one task is required' }, { status: 400 })
      }

      for (const t of tasks) {
        const err = validateSprintTaskPayload(t)
        if (err) {
          return NextResponse.json({ error: err }, { status: 400 })
        }
      }

      // Supervisor is required in our relational model; drafts choose a supervisor for the section.
      const supervisors = await oracleQuery<{ id: string }>(
        `
          SELECT id AS "id"
          FROM staff
          WHERE role = 'supervisor'
            AND section_id = :sectionId
            AND status = 'active'
          FETCH FIRST 1 ROWS ONLY
        `,
        { sectionId },
      )
      const supervisorId = supervisors[0]?.id
      if (!supervisorId) {
        return NextResponse.json(
          { error: 'No active supervisor found for this section' },
          { status: 400 },
        )
      }

      const sprintId = crypto.randomUUID()

      await withOracleConnection(async conn => {
        const weekStartDate = parseYMDToDate(String(weekStart))
        const weekEndDate = parseYMDToDate(String(weekEnd))

        await conn.execute(
          `
            INSERT INTO weekly_sprints (id, section_id, week_label, week_start, week_end, status, supervisor_staff_id)
            VALUES (:id, :section_id, :week_label, :week_start, :week_end, :status, :supervisor_staff_id)
          `,
          {
            id: sprintId,
            section_id: sectionId,
            week_label: weekLabel,
            week_start: weekStartDate,
            week_end: weekEndDate,
            status: 'draft',
            supervisor_staff_id: supervisorId,
          },
          { autoCommit: false },
        )

        for (const t of tasks) {
          const taskId = crypto.randomUUID()
          await conn.execute(
            `
              INSERT INTO sprint_tasks (
                id, sprint_id, task_key, description,
                activity_category, initiative_key, initiative_title,
                activity_key, activity_title,
                status, revision_reason, reviewed_at,
                assignee_staff_id, assignee_name,
                priority, task_status
              ) VALUES (
                :id, :sprint_id, :task_key, :description,
                :activity_category, :initiative_key, :initiative_title,
                :activity_key, :activity_title,
                :status, :revision_reason, :reviewed_at,
                :assignee_staff_id, :assignee_name,
                :priority, :task_status
              )
            `,
            {
              id: taskId,
              sprint_id: sprintId,
              task_key: crypto.randomUUID(),
              description: String(t.description).trim(),
              activity_category: t.activityCategory,
              initiative_key: t.initiativeKey,
              initiative_title: t.initiativeTitle ?? null,
              activity_key: t.activityKey,
              activity_title: t.activityTitle ?? null,
              status: 'pending',
              revision_reason: null,
              reviewed_at: null,
              assignee_staff_id: null,
              assignee_name: null,
              priority: 'medium',
              task_status: 'to_do',
            },
            { autoCommit: false },
          )
        }

        await conn.commit()
      })

      return NextResponse.json({ id: sprintId }, { status: 201 })
    }

    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const role = await getAppRole()
    if (role === 'officer') {
      return NextResponse.json(
        { error: 'Officers cannot create weekly sprints' },
        { status: 403 },
      )
    }

    const body = await req.json()
    const { sectionId, supervisorId, weekLabel, weekStart, weekEnd, tasks } =
      body

    if (!sectionId || !weekLabel || !weekStart || !weekEnd) {
      return NextResponse.json(
        { error: 'sectionId, weekLabel, weekStart, and weekEnd are required' },
        { status: 400 },
      )
    }

    if (!Array.isArray(tasks) || tasks.length === 0) {
      return NextResponse.json(
        { error: 'At least one task is required' },
        { status: 400 },
      )
    }

    for (const t of tasks) {
      const err = validateSprintTaskPayload(t)
      if (err) {
        return NextResponse.json({ error: err }, { status: 400 })
      }
    }

    const doc = {
      _type: 'weeklySprint',
      section: { _type: 'reference', _ref: sectionId },
      ...(supervisorId && {
        supervisor: { _type: 'reference', _ref: supervisorId },
      }),
      weekLabel,
      weekStart,
      weekEnd,
      status: 'draft',
      tasks: tasks.map(
        (t: {
          description: string
          activityCategory: string
          initiativeKey: string
          initiativeTitle?: string
          activityKey: string
          activityTitle?: string
        }) => ({
          _type: 'sprintTask',
          _key: crypto.randomUUID(),
          description: t.description.trim(),
          activityCategory: t.activityCategory,
          initiativeKey: t.initiativeKey,
          ...(t.initiativeTitle && { initiativeTitle: t.initiativeTitle }),
          activityKey: t.activityKey,
          ...(t.activityTitle && { activityTitle: t.activityTitle }),
          status: 'pending',
        }),
      ),
    }

    const result = await writeClient.create(doc)
    return NextResponse.json({ id: result._id }, { status: 201 })
  } catch (error) {
    console.error('Error creating weekly sprint', error)
    return NextResponse.json(
      { error: 'Failed to create weekly sprint' },
      { status: 500 },
    )
  }
}
