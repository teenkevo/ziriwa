import { NextRequest, NextResponse } from 'next/server'
import { auth, currentUser } from '@clerk/nextjs/server'
import oracledb from 'oracledb'
import { writeClient } from '@/sanity/lib/write-client'
import { withOracleConnection } from '@/lib/oracle/client'
import {
  sprintTaskHasRequiredLinks,
  validateSprintTaskPayload,
} from '@/lib/sprint-task-validation'
import { getSprintWeekStartLocal, isSprintWeekStarted } from '@/lib/sprint-week'
import { getAppRole } from '@/lib/clerk-app-role.server'
import { getCurrentUserEmailOrDev, getUserIdOrDev } from '@/lib/dev-auth.server'

function parseYMDToDate(ymd: string): Date {
  const [y, m, d] = ymd.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function toYMDString(v: unknown): string {
  const d = v instanceof Date ? v : new Date(String(v))
  if (Number.isNaN(d.getTime())) return ''
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const body = await req.json()
    const { action } = body

    if (process.env.CMS_PROVIDER === 'oracle') {
      if (!action || typeof action !== 'string') {
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
      }

      // Authorization mirrors the Sanity route behavior.
      if (action === 'submit' || action === 'update-draft-sprint') {
        const userId = await getUserIdOrDev()
        if (!userId) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }
        const role = await getAppRole()
        if (role === 'officer') {
          return NextResponse.json(
            {
              error:
                action === 'submit'
                  ? 'Officers cannot create or submit weekly sprint plans'
                  : 'Officers cannot create or edit draft weekly sprint plans',
            },
            { status: 403 },
          )
        }
      }

      const now = new Date()
      const nowTs = now
      const nowIso = nowTs.toISOString()
      const nowEndTime = `${String(nowTs.getHours()).padStart(2, '0')}:${String(
        nowTs.getMinutes(),
      ).padStart(2, '0')}`

      // Common reads helpers (kept inside the transaction for consistency)
      if (action === 'submit') {
        return withOracleConnection(async conn => {
          const sprintRes = await conn.execute(
            `
              SELECT id AS "id", status AS "status"
              FROM weekly_sprints
              WHERE id = :id
              FETCH FIRST 1 ROWS ONLY
            `,
            { id },
            { outFormat: oracledb.OUT_FORMAT_OBJECT },
          )
          const sprint = (sprintRes.rows?.[0] ?? null) as
            | { id: string; status: string }
            | null
          if (!sprint) {
            return NextResponse.json({ error: 'Sprint not found' }, { status: 404 })
          }

          const tasksRes = await conn.execute(
            `
              SELECT
                description AS "description",
                activity_category AS "activityCategory",
                initiative_key AS "initiativeKey",
                activity_key AS "activityKey"
              FROM sprint_tasks
              WHERE sprint_id = :id
            `,
            { id },
            { outFormat: oracledb.OUT_FORMAT_OBJECT },
          )
          const tasks = (tasksRes.rows ?? []) as any[]
          const invalid = tasks.some(t => {
            return (
              validateSprintTaskPayload({
                description: t?.description,
                activityCategory: t?.activityCategory,
                initiativeKey: t?.initiativeKey,
                activityKey: t?.activityKey,
              }) !== null
            )
          })
          if (invalid) {
            return NextResponse.json(
              {
                error:
                  'Every task must have an activity category, related initiative, and related measurable activity before submitting',
              },
              { status: 400 },
            )
          }

          await conn.execute(
            `UPDATE weekly_sprints SET status = 'submitted' WHERE id = :id`,
            { id },
            { autoCommit: false },
          )
          await conn.commit()
          return NextResponse.json({ success: true })
        })
      }

      if (action === 'update-draft-sprint') {
        const { weekLabel, weekStart, weekEnd, tasks } = body as {
          weekLabel?: string
          weekStart?: string
          weekEnd?: string
          tasks?: Array<{
            _key?: string
            description: string
            activityCategory: string
            initiativeKey: string
            initiativeTitle?: string
            activityKey: string
            activityTitle?: string
          }>
        }

        if (!weekLabel || !weekStart || !weekEnd) {
          return NextResponse.json(
            { error: 'weekLabel, weekStart, and weekEnd are required' },
            { status: 400 },
          )
        }

        if (!Array.isArray(tasks) || tasks.length === 0) {
          return NextResponse.json(
            { error: 'At least one task is required' },
            { status: 400 },
          )
        }

        return withOracleConnection(async conn => {
          const docRes = await conn.execute(
            `SELECT id, status FROM weekly_sprints WHERE id = :id FETCH FIRST 1 ROWS ONLY`,
            { id },
          )
          const doc = (docRes.rows?.[0] ?? null) as
            | { id: string; status: string }
            | null
          if (!doc) {
            return NextResponse.json({ error: 'Sprint not found' }, { status: 404 })
          }
          if (doc.status !== 'draft') {
            return NextResponse.json(
              { error: 'Only draft sprints can be edited' },
              { status: 400 },
            )
          }

          for (const t of tasks) {
            const err = validateSprintTaskPayload(t)
            if (err) {
              return NextResponse.json({ error: err }, { status: 400 })
            }
          }

          const usedKeys = new Set<string>()
          const nextKey = (raw?: string) => {
            const k = typeof raw === 'string' ? raw.trim() : ''
            if (k && !usedKeys.has(k)) {
              usedKeys.add(k)
              return k
            }
            const nk = crypto.randomUUID()
            usedKeys.add(nk)
            return nk
          }

          await conn.execute(
            `
              UPDATE weekly_sprints
              SET week_label = :week_label, week_start = :week_start, week_end = :week_end
              WHERE id = :id
            `,
            {
              id,
              week_label: weekLabel,
              week_start: parseYMDToDate(weekStart),
              week_end: parseYMDToDate(weekEnd),
            },
            { autoCommit: false },
          )

          await conn.execute(
            `DELETE FROM sprint_tasks WHERE sprint_id = :id`,
            { id },
            { autoCommit: false },
          )

          for (const t of tasks) {
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
                  :task_row_id, :sprint_id, :task_key, :description,
                  :activity_category, :initiative_key, :initiative_title,
                  :activity_key, :activity_title,
                  'pending', NULL, NULL,
                  NULL, NULL,
                  'medium', 'to_do'
                )
              `,
              {
                task_row_id: crypto.randomUUID(),
                sprint_id: id,
                task_key: nextKey(t._key),
                description: String(t.description).trim(),
                activity_category: t.activityCategory,
                initiative_key: t.initiativeKey,
                initiative_title: t.initiativeTitle ?? null,
                activity_key: t.activityKey,
                activity_title: t.activityTitle ?? null,
              },
              { autoCommit: false },
            )
          }

          await conn.commit()
          return NextResponse.json({ success: true })
        })
      }

      if (action === 'review-task') {
        const { taskKey, reviewStatus, revisionReason } = body as {
          taskKey?: string
          reviewStatus?: 'accepted' | 'rejected' | 'revisions_requested'
          revisionReason?: string
        }

        if (!taskKey || !reviewStatus) {
          return NextResponse.json(
            { error: 'taskKey and reviewStatus are required' },
            { status: 400 },
          )
        }

        const validStatuses = ['accepted', 'rejected', 'revisions_requested']
        if (!validStatuses.includes(reviewStatus)) {
          return NextResponse.json(
            {
              error: `reviewStatus must be one of: ${validStatuses.join(', ')}`,
            },
            { status: 400 },
          )
        }

        if (reviewStatus === 'revisions_requested' && !revisionReason?.trim()) {
          return NextResponse.json(
            { error: 'Revision reason is required when requesting revisions' },
            { status: 400 },
          )
        }

        return withOracleConnection(async conn => {
          const taskRes = await conn.execute(
            `
              SELECT id AS "id", status AS "status"
              FROM sprint_tasks
              WHERE sprint_id = :sprint_id
                AND task_key = :taskKey
              FETCH FIRST 1 ROWS ONLY
            `,
            { sprint_id: id, taskKey },
            { outFormat: oracledb.OUT_FORMAT_OBJECT },
          )
          const task = taskRes.rows?.[0] as { id: string } | undefined
          if (!task) {
            return NextResponse.json({ error: 'Task not found' }, { status: 404 })
          }

          const setParts: string[] = [
            `status = :status`,
            `reviewed_at = :reviewed_at`,
            `revision_reason = :revision_reason`,
          ]
          const binds: any = {
            status: reviewStatus,
            reviewed_at: nowTs,
            revision_reason:
              reviewStatus === 'revisions_requested'
                ? (revisionReason ?? '').trim()
                : '',
            task_id: task.id,
          }

          if (reviewStatus === 'accepted') {
            setParts.push(`task_status = :task_status`)
            setParts.push(`priority = :priority`)
            binds.task_status = 'to_do'
            binds.priority = 'medium'
          }

          await conn.execute(
            `UPDATE sprint_tasks SET ${setParts.join(', ')} WHERE id = :task_id`,
            binds,
            { autoCommit: false },
          )

          // Determine if all other tasks are no longer pending.
          const pendingRes = await conn.execute(
            `
              SELECT COUNT(*) AS "pendingCount"
              FROM sprint_tasks
              WHERE sprint_id = :sprint_id
                AND status = 'pending'
                AND task_key != :taskKey
            `,
            { sprint_id: id, taskKey },
            { outFormat: oracledb.OUT_FORMAT_OBJECT },
          )
          const pendingCount = Number(
            (pendingRes.rows?.[0] as any)?.pendingCount ?? 0,
          )
          if (pendingCount === 0) {
            await conn.execute(
              `UPDATE weekly_sprints SET status = 'reviewed' WHERE id = :id`,
              { id },
              { autoCommit: false },
            )
          }

          await conn.commit()
          return NextResponse.json({ success: true })
        })
      }

      if (action === 'update-task') {
        const { taskKey, updates } = body as {
          taskKey?: string
          updates?: {
            assignee?: string | null
            priority?: string
            taskStatus?: string
          }
        }
        if (!taskKey || !updates) {
          return NextResponse.json(
            { error: 'taskKey and updates are required' },
            { status: 400 },
          )
        }

        return withOracleConnection(async conn => {
          const [taskRowRes, sprintRes] = await Promise.all([
            conn.execute(
              `
                SELECT
                  id AS "id",
                  status AS "status",
                  task_status AS "taskStatus"
                FROM sprint_tasks
                WHERE sprint_id = :sprint_id
                  AND task_key = :taskKey
                FETCH FIRST 1 ROWS ONLY
              `,
              { sprint_id: id, taskKey },
              { outFormat: oracledb.OUT_FORMAT_OBJECT },
            ),
            conn.execute(
              `SELECT week_start AS "week_start" FROM weekly_sprints WHERE id = :id FETCH FIRST 1 ROWS ONLY`,
              { id },
              { outFormat: oracledb.OUT_FORMAT_OBJECT },
            ),
          ])

          const task = (taskRowRes.rows?.[0] ?? null) as
            | { id: string; status: string }
            | null
          if (!task) {
            return NextResponse.json({ error: 'Task not found' }, { status: 404 })
          }

          const sprintRow = (sprintRes.rows?.[0] ?? null) as
            | { week_start: Date }
            | null
          const weekStartStr = sprintRow ? toYMDString(sprintRow.week_start) : ''

          if (
            updates.taskStatus !== undefined &&
            task.status === 'accepted' &&
            !isSprintWeekStarted(weekStartStr) &&
            updates.taskStatus !== 'to_do'
          ) {
            return NextResponse.json(
              {
                error:
                  'Task status stays To do until the sprint week starts (Monday 10 AM)',
              },
              { status: 400 },
            )
          }

          const setParts: string[] = []
          const binds: any = { task_id: task.id }

          if (updates.assignee !== undefined) {
            if (updates.assignee) {
              const assigneeFullNameRes = await conn.execute(
                `
                  SELECT coalesce(full_name, first_name || ' ' || last_name) AS "fullName"
                  FROM staff
                  WHERE id = :id
                  FETCH FIRST 1 ROWS ONLY
                `,
                { id: updates.assignee },
              )
              const fullName =
                (assigneeFullNameRes.rows?.[0] as any)?.fullName ?? null

              setParts.push(`assignee_staff_id = :assignee_id`)
              binds.assignee_id = updates.assignee
              setParts.push(`assignee_name = :assignee_name`)
              binds.assignee_name = fullName
            } else {
              setParts.push(`assignee_staff_id = NULL`)
              setParts.push(`assignee_name = NULL`)
            }
          }

          if (updates.priority !== undefined) {
            setParts.push(`priority = :priority`)
            binds.priority = updates.priority
          }

          if (updates.taskStatus !== undefined) {
            setParts.push(`task_status = :task_status`)
            binds.task_status = updates.taskStatus
          }

          if (setParts.length) {
            await conn.execute(
              `UPDATE sprint_tasks SET ${setParts.join(', ')} WHERE id = :task_id`,
              binds,
              { autoCommit: false },
            )
          }

          await conn.commit()
          return NextResponse.json({ success: true })
        })
      }

      if (action === 'add-work-submission') {
        const { taskKey, description, outputFileId, revenueAssessed } = body as {
          taskKey?: string
          description?: string
          outputFileId?: string
          revenueAssessed?: number | null
        }

        if (
          !taskKey ||
          !description?.trim() ||
          !outputFileId ||
          typeof outputFileId !== 'string'
        ) {
          return NextResponse.json(
            {
              error: 'taskKey, description, and outputFileId are required',
            },
            { status: 400 },
          )
        }

        return withOracleConnection(async conn => {
          const [sprintRes, taskRes] = await Promise.all([
            conn.execute(
              `SELECT week_start AS "week_start" FROM weekly_sprints WHERE id = :id FETCH FIRST 1 ROWS ONLY`,
              { id },
              { outFormat: oracledb.OUT_FORMAT_OBJECT },
            ),
            conn.execute(
              `
                SELECT id AS "id", status AS "status"
                FROM sprint_tasks
                WHERE sprint_id = :sprint_id
                  AND task_key = :taskKey
                FETCH FIRST 1 ROWS ONLY
              `,
              { sprint_id: id, taskKey },
              { outFormat: oracledb.OUT_FORMAT_OBJECT },
            ),
          ])

          const sprintRow = (sprintRes.rows?.[0] ?? null) as
            | { week_start: Date }
            | null
          const weekStartStr = sprintRow ? toYMDString(sprintRow.week_start) : ''

          const task = (taskRes.rows?.[0] ?? null) as
            | { id: string; status: string }
            | null
          if (!task) {
            return NextResponse.json({ error: 'Task not found' }, { status: 404 })
          }

          if (task.status !== 'accepted') {
            return NextResponse.json(
              { error: 'Only accepted tasks can receive work submissions' },
              { status: 400 },
            )
          }

          if (!isSprintWeekStarted(weekStartStr, now)) {
            return NextResponse.json(
              {
                error:
                  'Work submissions open when the sprint week starts (Monday 10 AM)',
              },
              { status: 400 },
            )
          }

          const sprintStart = getSprintWeekStartLocal(weekStartStr)
          const diffMs = now.getTime() - sprintStart.getTime()
          const totalHours = Math.max(
            0,
            Math.round((diffMs / 3_600_000) * 100) / 100,
          )

          const submissionDbId = crypto.randomUUID()
          const submissionKey = crypto.randomUUID()
          const submittedDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())

          await conn.execute(
            `
              INSERT INTO work_submissions (
                id, sprint_task_id,
                submission_key, submission_date,
                start_time, end_time, total_hours,
                description, status, submitted_at,
                revenue_assessed, output_asset_id
              ) VALUES (
                :id, :sprint_task_id,
                :submission_key, :submission_date,
                :start_time, :end_time, :total_hours,
                :description, :status, :submitted_at,
                :revenue_assessed, :output_asset_id
              )
            `,
            {
              id: submissionDbId,
              sprint_task_id: task.id,
              submission_key: submissionKey,
              submission_date: submittedDate,
              start_time: '10:00',
              end_time: nowEndTime,
              total_hours: totalHours,
              description: description.trim(),
              status: 'pending',
              submitted_at: nowTs,
              revenue_assessed:
                revenueAssessed !== undefined ? revenueAssessed : null,
              output_asset_id: outputFileId,
            },
            { autoCommit: false },
          )

          await conn.execute(
            `
              INSERT INTO work_submission_review_thread (
                id, work_submission_id,
                thread_key, role, action, message, created_at
              ) VALUES (
                :id, :work_submission_id,
                :thread_key, :role, :action, :message, :created_at
              )
            `,
            {
              id: crypto.randomUUID(),
              work_submission_id: submissionDbId,
              thread_key: crypto.randomUUID(),
              role: 'officer',
              action: 'submit',
              message: 'Work submission created',
              created_at: nowTs,
            },
            { autoCommit: false },
          )

          await conn.commit()
          return NextResponse.json({ success: true, key: submissionKey })
        })
      }

      if (action === 'approve-work-submission') {
        const { taskKey, submissionKey, message } = body as {
          taskKey?: string
          submissionKey?: string
          message?: string
        }
        if (!taskKey || !submissionKey) {
          return NextResponse.json(
            { error: 'taskKey and submissionKey are required' },
            { status: 400 },
          )
        }

        return withOracleConnection(async conn => {
          const taskRes = await conn.execute(
            `SELECT id AS "id" FROM sprint_tasks WHERE sprint_id = :sprint_id AND task_key = :taskKey FETCH FIRST 1 ROWS ONLY`,
            { sprint_id: id, taskKey },
            { outFormat: oracledb.OUT_FORMAT_OBJECT },
          )
          const taskId = (taskRes.rows?.[0] as any)?.id as string | undefined
          if (!taskId) {
            return NextResponse.json({ error: 'Task not found' }, { status: 404 })
          }

          const sprintRes = await conn.execute(
            `SELECT week_start AS "week_start" FROM weekly_sprints WHERE id = :id FETCH FIRST 1 ROWS ONLY`,
            { id },
            { outFormat: oracledb.OUT_FORMAT_OBJECT },
          )
          const sprintRow = (sprintRes.rows?.[0] ?? null) as
            | { week_start: Date }
            | null
          const weekStartStr = sprintRow ? toYMDString(sprintRow.week_start) : ''

          const submissionRes = await conn.execute(
            `
              SELECT id AS "id"
              FROM work_submissions
              WHERE sprint_task_id = :sprint_task_id
                AND submission_key = :submissionKey
              FETCH FIRST 1 ROWS ONLY
            `,
            { sprint_task_id: taskId, submissionKey },
            { outFormat: oracledb.OUT_FORMAT_OBJECT },
          )

          const submission = submissionRes.rows?.[0] as { id: string } | undefined
          if (!submission) {
            return NextResponse.json(
              { error: 'Submission not found' },
              { status: 404 },
            )
          }

          await conn.execute(
            `UPDATE work_submissions SET status = 'approved' WHERE id = :id`,
            { id: submission.id },
            { autoCommit: false },
          )
          await conn.execute(
            `
              INSERT INTO work_submission_review_thread (
                id, work_submission_id, thread_key, role, action, message, created_at
              ) VALUES (
                :id, :work_submission_id, :thread_key, :role, :action, :message, :created_at
              )
            `,
            {
              id: crypto.randomUUID(),
              work_submission_id: submission.id,
              thread_key: crypto.randomUUID(),
              role: 'supervisor',
              action: 'approve',
              message: message || 'Approved',
              created_at: nowTs,
            },
            { autoCommit: false },
          )

          const nonApprovedRes = await conn.execute(
            `
              SELECT COUNT(*) AS "nonApprovedCount"
              FROM work_submissions
              WHERE sprint_task_id = :sprint_task_id
                AND status != 'approved'
            `,
            { sprint_task_id: taskId },
            { outFormat: oracledb.OUT_FORMAT_OBJECT },
          )
          const nonApprovedCount = Number(
            (nonApprovedRes.rows?.[0] as any)?.nonApprovedCount ?? 0,
          )
          if (nonApprovedCount === 0) {
            await conn.execute(
              `
                UPDATE sprint_tasks
                SET task_status = :task_status
                WHERE id = :task_id
              `,
              {
                task_status: isSprintWeekStarted(weekStartStr, now)
                  ? 'done'
                  : 'to_do',
                task_id: taskId,
              },
              { autoCommit: false },
            )
          }

          await conn.commit()
          return NextResponse.json({ success: true })
        })
      }

      if (action === 'reject-work-submission') {
        const { taskKey, submissionKey, message } = body as {
          taskKey?: string
          submissionKey?: string
          message?: string
        }

        if (!taskKey || !submissionKey || !message?.trim()) {
          return NextResponse.json(
            { error: 'taskKey, submissionKey, and message are required' },
            { status: 400 },
          )
        }

        return withOracleConnection(async conn => {
          const taskRes = await conn.execute(
            `SELECT id AS "id" FROM sprint_tasks WHERE sprint_id = :sprint_id AND task_key = :taskKey FETCH FIRST 1 ROWS ONLY`,
            { sprint_id: id, taskKey },
            { outFormat: oracledb.OUT_FORMAT_OBJECT },
          )
          const taskId = (taskRes.rows?.[0] as any)?.id as string | undefined
          if (!taskId) {
            return NextResponse.json({ error: 'Task not found' }, { status: 404 })
          }

          const subRes = await conn.execute(
            `
              SELECT id AS "id"
              FROM work_submissions
              WHERE sprint_task_id = :sprint_task_id
                AND submission_key = :submissionKey
              FETCH FIRST 1 ROWS ONLY
            `,
            { sprint_task_id: taskId, submissionKey },
            { outFormat: oracledb.OUT_FORMAT_OBJECT },
          )
          const submission = subRes.rows?.[0] as { id: string } | undefined
          if (!submission) {
            return NextResponse.json(
              { error: 'Submission not found' },
              { status: 404 },
            )
          }

          await conn.execute(
            `UPDATE work_submissions SET status = 'rejected' WHERE id = :id`,
            { id: submission.id },
            { autoCommit: false },
          )
          await conn.execute(
            `
              INSERT INTO work_submission_review_thread (
                id, work_submission_id, thread_key, role, action, message, created_at
              ) VALUES (
                :id, :work_submission_id, :thread_key, :role, :action, :message, :created_at
              )
            `,
            {
              id: crypto.randomUUID(),
              work_submission_id: submission.id,
              thread_key: crypto.randomUUID(),
              role: 'supervisor',
              action: 'reject',
              message: message.trim(),
              created_at: nowTs,
            },
            { autoCommit: false },
          )

          await conn.commit()
          return NextResponse.json({ success: true })
        })
      }

      if (action === 'respond-to-work-submission-rejection') {
        const { taskKey, submissionKey, message, outputFileId } = body as {
          taskKey?: string
          submissionKey?: string
          message?: string
          outputFileId?: string
        }

        if (!taskKey || !submissionKey) {
          return NextResponse.json(
            { error: 'taskKey and submissionKey are required' },
            { status: 400 },
          )
        }

        return withOracleConnection(async conn => {
          const sprintRes = await conn.execute(
            `SELECT week_start AS "week_start" FROM weekly_sprints WHERE id = :id FETCH FIRST 1 ROWS ONLY`,
            { id },
            { outFormat: oracledb.OUT_FORMAT_OBJECT },
          )
          const sprintRow = (sprintRes.rows?.[0] ?? null) as
            | { week_start: Date }
            | null
          const weekStartStr = sprintRow ? toYMDString(sprintRow.week_start) : ''
          if (!isSprintWeekStarted(weekStartStr, now)) {
            return NextResponse.json(
              {
                error:
                  'Responses open when the sprint week starts (Monday 10 AM)',
              },
              { status: 400 },
            )
          }

          const taskRes = await conn.execute(
            `SELECT id AS "id" FROM sprint_tasks WHERE sprint_id = :sprint_id AND task_key = :taskKey FETCH FIRST 1 ROWS ONLY`,
            { sprint_id: id, taskKey },
            { outFormat: oracledb.OUT_FORMAT_OBJECT },
          )
          const taskId = (taskRes.rows?.[0] as any)?.id as string | undefined
          if (!taskId) {
            return NextResponse.json({ error: 'Task not found' }, { status: 404 })
          }

          const subRes = await conn.execute(
            `
              SELECT id AS "id"
              FROM work_submissions
              WHERE sprint_task_id = :sprint_task_id
                AND submission_key = :submissionKey
              FETCH FIRST 1 ROWS ONLY
            `,
            { sprint_task_id: taskId, submissionKey },
            { outFormat: oracledb.OUT_FORMAT_OBJECT },
          )
          const submission = subRes.rows?.[0] as { id: string } | undefined
          if (!submission) {
            return NextResponse.json(
              { error: 'Submission not found' },
              { status: 404 },
            )
          }

          // Update submission + append review entry.
          if (outputFileId) {
            await conn.execute(
              `
                UPDATE work_submissions
                SET status = 'pending', output_asset_id = :output_asset_id
                WHERE id = :id
              `,
              { id: submission.id, output_asset_id: outputFileId },
              { autoCommit: false },
            )
          } else {
            await conn.execute(
              `UPDATE work_submissions SET status = 'pending' WHERE id = :id`,
              { id: submission.id },
              { autoCommit: false },
            )
          }

          await conn.execute(
            `
              INSERT INTO work_submission_review_thread (
                id, work_submission_id, thread_key, role, action, message, created_at
              ) VALUES (
                :id, :work_submission_id, :thread_key, :role, :action, :message, :created_at
              )
            `,
            {
              id: crypto.randomUUID(),
              work_submission_id: submission.id,
              thread_key: crypto.randomUUID(),
              role: 'officer',
              action: 'respond',
              message: message?.trim() || 'Resubmitted',
              created_at: nowTs,
            },
            { autoCommit: false },
          )

          await conn.commit()
          return NextResponse.json({ success: true })
        })
      }

      if (action === 'revise-task') {
        const {
          taskKey,
          description,
          activityCategory,
          initiativeKey,
          initiativeTitle,
          activityKey,
          activityTitle,
        } = body as {
          taskKey?: string
          description?: string
          activityCategory?: string
          initiativeKey?: string
          initiativeTitle?: string
          activityKey?: string
          activityTitle?: string
        }

        if (!taskKey || typeof taskKey !== 'string') {
          return NextResponse.json({ error: 'taskKey is required' }, { status: 400 })
        }

        const err = validateSprintTaskPayload({
          description,
          activityCategory,
          initiativeKey,
          activityKey,
        })
        if (err) {
          return NextResponse.json({ error: err }, { status: 400 })
        }

        return withOracleConnection(async conn => {
          const sprintRes = await conn.execute(
            `SELECT id AS "id", status AS "status" FROM weekly_sprints WHERE id = :id FETCH FIRST 1 ROWS ONLY`,
            { id },
            { outFormat: oracledb.OUT_FORMAT_OBJECT },
          )
          const sprintRow = (sprintRes.rows?.[0] ?? null) as
            | { id: string; status: string }
            | null
          if (!sprintRow) {
            return NextResponse.json({ error: 'Sprint not found' }, { status: 404 })
          }
          if (sprintRow.status !== 'submitted' && sprintRow.status !== 'reviewed') {
            return NextResponse.json(
              {
                error:
                  'Can only revise tasks in sprints that are submitted or fully reviewed',
              },
              { status: 400 },
            )
          }

          const taskRes = await conn.execute(
            `
              SELECT id AS "id", status AS "status"
              FROM sprint_tasks
              WHERE sprint_id = :sprint_id AND task_key = :taskKey
              FETCH FIRST 1 ROWS ONLY
            `,
            { sprint_id: id, taskKey },
            { outFormat: oracledb.OUT_FORMAT_OBJECT },
          )
          const task = taskRes.rows?.[0] as { id: string; status: string } | undefined
          if (!task) {
            return NextResponse.json({ error: 'Task not found' }, { status: 404 })
          }
          if (task.status !== 'revisions_requested') {
            return NextResponse.json(
              { error: 'Only tasks with revisions requested can be revised' },
              { status: 400 },
            )
          }

          await conn.execute(
            `
              UPDATE sprint_tasks
              SET description = :description,
                  activity_category = :activity_category,
                  initiative_key = :initiative_key,
                  initiative_title = :initiative_title,
                  activity_key = :activity_key,
                  activity_title = :activity_title,
                  status = 'pending',
                  revision_reason = ''
              WHERE id = :task_id
            `,
            {
              task_id: task.id,
              description: String(description ?? '').trim(),
              activity_category: activityCategory,
              initiative_key: initiativeKey,
              initiative_title: initiativeTitle ?? null,
              activity_key: activityKey,
              activity_title: activityTitle ?? null,
            },
            { autoCommit: false },
          )

          if (sprintRow.status === 'reviewed') {
            await conn.execute(
              `UPDATE weekly_sprints SET status = 'submitted' WHERE id = :id`,
              { id },
              { autoCommit: false },
            )
          }

          await conn.commit()
          return NextResponse.json({ success: true })
        })
      }

      if (action === 'add-extra-task') {
        const {
          description,
          activityCategory,
          initiativeKey,
          initiativeTitle,
          activityKey,
          activityTitle,
        } = body as {
          description?: string
          activityCategory?: string
          initiativeKey?: string
          initiativeTitle?: string
          activityKey?: string
          activityTitle?: string
        }

        const userId = await getUserIdOrDev()
        if (!userId) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const email = await getCurrentUserEmailOrDev()
        if (!email) {
          return NextResponse.json(
            { error: 'Could not resolve your account email' },
            { status: 400 },
          )
        }

        const err = validateSprintTaskPayload({
          description,
          activityCategory,
          initiativeKey,
          activityKey,
        })
        if (err) {
          return NextResponse.json({ error: err }, { status: 400 })
        }

        return withOracleConnection(async conn => {
          const sprintRes = await conn.execute(
            `SELECT id AS "id", status AS "status", section_id AS "section_id" FROM weekly_sprints WHERE id = :id FETCH FIRST 1 ROWS ONLY`,
            { id },
            { outFormat: oracledb.OUT_FORMAT_OBJECT },
          )
          const sprintRow = sprintRes.rows?.[0] as
            | { id: string; status: string; section_id: string }
            | undefined
          if (!sprintRow) {
            return NextResponse.json({ error: 'Sprint not found' }, { status: 404 })
          }
          if (sprintRow.status === 'draft') {
            return NextResponse.json(
              { error: 'Cannot add extra tasks to draft sprints' },
              { status: 400 },
            )
          }

          const officerRes = await conn.execute(
            `
              SELECT
                id AS "id",
                coalesce(full_name, first_name || ' ' || last_name) AS "fullName"
              FROM staff
              WHERE role = 'officer'
                AND lower(email) = :email
                AND section_id = :sectionId
                AND status = 'active'
              FETCH FIRST 1 ROWS ONLY
            `,
            { email, sectionId: sprintRow.section_id },
            { outFormat: oracledb.OUT_FORMAT_OBJECT },
          )
          const officerRow = officerRes.rows?.[0] as
            | { id: string; fullName: string }
            | undefined
          if (!officerRow) {
            return NextResponse.json(
              {
                error:
                  'Only active officers assigned to this section can add extra tasks. Your sign-in email must match your staff record.',
              },
              { status: 403 },
            )
          }

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
                'accepted', NULL, :reviewed_at,
                :assignee_id, :assignee_name,
                'medium', 'to_do'
              )
            `,
            {
              id: crypto.randomUUID(),
              sprint_id: id,
              task_key: crypto.randomUUID(),
              description: String(description ?? '').trim(),
              activity_category: activityCategory,
              initiative_key: initiativeKey,
              initiative_title: initiativeTitle ?? null,
              activity_key: activityKey,
              activity_title: activityTitle ?? null,
              reviewed_at: nowTs,
              assignee_id: officerRow.id,
              assignee_name: officerRow.fullName,
            },
            { autoCommit: false },
          )

          await conn.commit()
          return NextResponse.json({ success: true })
        })
      }

      return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }

    if (action === 'submit' || action === 'update-draft-sprint') {
      const { userId } = await auth()
      if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      const role = await getAppRole()
      if (role === 'officer') {
        return NextResponse.json(
          {
            error:
              'Officers cannot create or edit draft weekly sprint plans',
          },
          { status: 403 },
        )
      }
    }

    if (action === 'submit') {
      const doc = await writeClient.getDocument(id)
      if (!doc || doc._type !== 'weeklySprint') {
        return NextResponse.json({ error: 'Sprint not found' }, { status: 404 })
      }
      const tasks = (doc.tasks as Array<Record<string, unknown>>) || []
      const invalid = tasks.some(t => !sprintTaskHasRequiredLinks(t))
      if (invalid) {
        return NextResponse.json(
          {
            error:
              'Every task must have an activity category, related initiative, and related measurable activity before submitting',
          },
          { status: 400 },
        )
      }
      await writeClient.patch(id).set({ status: 'submitted' }).commit()
      return NextResponse.json({ success: true })
    }

    if (action === 'update-draft-sprint') {
      const { weekLabel, weekStart, weekEnd, tasks } = body

      if (!weekLabel || !weekStart || !weekEnd) {
        return NextResponse.json(
          { error: 'weekLabel, weekStart, and weekEnd are required' },
          { status: 400 },
        )
      }

      if (!Array.isArray(tasks) || tasks.length === 0) {
        return NextResponse.json(
          { error: 'At least one task is required' },
          { status: 400 },
        )
      }

      const doc = await writeClient.getDocument(id)
      if (!doc || doc._type !== 'weeklySprint') {
        return NextResponse.json({ error: 'Sprint not found' }, { status: 404 })
      }
      if (doc.status !== 'draft') {
        return NextResponse.json(
          { error: 'Only draft sprints can be edited' },
          { status: 400 },
        )
      }

      for (const t of tasks) {
        const err = validateSprintTaskPayload(t)
        if (err) {
          return NextResponse.json({ error: err }, { status: 400 })
        }
      }

      const usedKeys = new Set<string>()
      const nextKey = (raw?: string) => {
        const k = typeof raw === 'string' ? raw.trim() : ''
        if (k && !usedKeys.has(k)) {
          usedKeys.add(k)
          return k
        }
        const nk = crypto.randomUUID()
        usedKeys.add(nk)
        return nk
      }

      const builtTasks = tasks.map(
        (t: {
          _key?: string
          description: string
          activityCategory: string
          initiativeKey: string
          initiativeTitle?: string
          activityKey: string
          activityTitle?: string
        }) => ({
          _type: 'sprintTask',
          _key: nextKey(t._key),
          description: t.description.trim(),
          activityCategory: t.activityCategory,
          initiativeKey: t.initiativeKey,
          ...(t.initiativeTitle && { initiativeTitle: t.initiativeTitle }),
          activityKey: t.activityKey,
          ...(t.activityTitle && { activityTitle: t.activityTitle }),
          status: 'pending',
        }),
      )

      await writeClient
        .patch(id)
        .set({
          weekLabel,
          weekStart,
          weekEnd,
          tasks: builtTasks,
        })
        .commit()

      return NextResponse.json({ success: true })
    }

    if (action === 'review-task') {
      const { taskKey, reviewStatus, revisionReason } = body

      if (!taskKey || !reviewStatus) {
        return NextResponse.json(
          { error: 'taskKey and reviewStatus are required' },
          { status: 400 },
        )
      }

      const validStatuses = ['accepted', 'rejected', 'revisions_requested']
      if (!validStatuses.includes(reviewStatus)) {
        return NextResponse.json(
          { error: `reviewStatus must be one of: ${validStatuses.join(', ')}` },
          { status: 400 },
        )
      }

      if (reviewStatus === 'revisions_requested' && !revisionReason?.trim()) {
        return NextResponse.json(
          { error: 'Revision reason is required when requesting revisions' },
          { status: 400 },
        )
      }

      const doc = await writeClient.getDocument(id)
      if (!doc || doc._type !== 'weeklySprint') {
        return NextResponse.json({ error: 'Sprint not found' }, { status: 404 })
      }

      const tasks = (doc.tasks as Array<Record<string, unknown>>) || []
      const taskIndex = tasks.findIndex(
        (t: Record<string, unknown>) => t._key === taskKey,
      )
      if (taskIndex === -1) {
        return NextResponse.json({ error: 'Task not found' }, { status: 404 })
      }

      const patchPath = `tasks[_key=="${taskKey}"]`
      const setFields: Record<string, unknown> = {
        [`${patchPath}.status`]: reviewStatus,
        [`${patchPath}.reviewedAt`]: new Date().toISOString(),
        [`${patchPath}.revisionReason`]:
          reviewStatus === 'revisions_requested' ? revisionReason.trim() : '',
      }

      if (reviewStatus === 'accepted') {
        setFields[`${patchPath}.taskStatus`] = 'to_do'
        setFields[`${patchPath}.priority`] = 'medium'
      }

      const patch = writeClient.patch(id).set(setFields)

      const allReviewed = tasks.every(
        (t: Record<string, unknown>, i: number) =>
          i === taskIndex ? true : t.status !== 'pending',
      )
      if (allReviewed) {
        patch.set({ status: 'reviewed' })
      }

      await patch.commit()
      return NextResponse.json({ success: true })
    }

    if (action === 'update-task') {
      const { taskKey, updates } = body
      if (!taskKey || !updates) {
        return NextResponse.json(
          { error: 'taskKey and updates are required' },
          { status: 400 },
        )
      }

      const doc = await writeClient.getDocument(id)
      if (!doc || doc._type !== 'weeklySprint') {
        return NextResponse.json({ error: 'Sprint not found' }, { status: 404 })
      }
      const tasks = (doc.tasks as Array<Record<string, unknown>>) || []
      const task = tasks.find(
        (t: Record<string, unknown>) => t._key === taskKey,
      )
      if (!task) {
        return NextResponse.json({ error: 'Task not found' }, { status: 404 })
      }
      const weekStart = doc.weekStart as string
      if (
        updates.taskStatus !== undefined &&
        task.status === 'accepted' &&
        !isSprintWeekStarted(weekStart) &&
        updates.taskStatus !== 'to_do'
      ) {
        return NextResponse.json(
          {
            error:
              'Task status stays To do until the sprint week starts (Monday 10 AM)',
          },
          { status: 400 },
        )
      }

      const patchPath = `tasks[_key=="${taskKey}"]`
      const setFields: Record<string, unknown> = {}

      if (updates.assignee !== undefined) {
        setFields[`${patchPath}.assignee`] = updates.assignee
          ? { _type: 'reference', _ref: updates.assignee }
          : null
      }
      if (updates.priority !== undefined) {
        setFields[`${patchPath}.priority`] = updates.priority
      }
      if (updates.taskStatus !== undefined) {
        setFields[`${patchPath}.taskStatus`] = updates.taskStatus
      }

      await writeClient.patch(id).set(setFields).commit()
      return NextResponse.json({ success: true })
    }

    if (action === 'add-work-submission') {
      const { taskKey, description, outputFileId, revenueAssessed } = body
      if (!taskKey || !description?.trim() || !outputFileId) {
        return NextResponse.json(
          { error: 'taskKey, description, and outputFileId are required' },
          { status: 400 },
        )
      }

      const doc = await writeClient.getDocument(id)
      if (!doc || doc._type !== 'weeklySprint') {
        return NextResponse.json({ error: 'Sprint not found' }, { status: 404 })
      }

      const tasks = (doc.tasks as Array<Record<string, unknown>>) || []
      const task = tasks.find(
        (t: Record<string, unknown>) => t._key === taskKey,
      )
      if (!task) {
        return NextResponse.json({ error: 'Task not found' }, { status: 404 })
      }

      const now = new Date()
      const weekStart = doc.weekStart as string
      if (task.status !== 'accepted') {
        return NextResponse.json(
          { error: 'Only accepted tasks can receive work submissions' },
          { status: 400 },
        )
      }
      if (!isSprintWeekStarted(weekStart, now)) {
        return NextResponse.json(
          {
            error:
              'Work submissions open when the sprint week starts (Monday 10 AM)',
          },
          { status: 400 },
        )
      }
      const sprintStart = getSprintWeekStartLocal(weekStart)
      const diffMs = now.getTime() - sprintStart.getTime()
      const totalHours = Math.max(
        0,
        Math.round((diffMs / 3_600_000) * 100) / 100,
      )

      const existing =
        (task.workSubmissions as Array<Record<string, unknown>>) || []
      const newSubmission: Record<string, unknown> = {
        _key: crypto.randomUUID(),
        _type: 'workSubmission',
        date: now.toISOString().slice(0, 10),
        startTime: '10:00',
        endTime: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
        totalHours,
        description: description.trim(),
        status: 'pending',
        submittedAt: now.toISOString(),
        output: {
          _type: 'file',
          asset: { _type: 'reference', _ref: outputFileId },
        },
        reviewThread: [
          {
            _key: crypto.randomUUID(),
            _type: 'object',
            role: 'officer',
            action: 'submit',
            message: 'Work submission created',
            createdAt: now.toISOString(),
          },
        ],
      }

      if (revenueAssessed !== undefined && revenueAssessed !== null) {
        newSubmission.revenueAssessed = revenueAssessed
      }

      await writeClient
        .patch(id)
        .set({
          [`tasks[_key=="${taskKey}"].workSubmissions`]: [
            ...existing,
            newSubmission,
          ],
        })
        .commit()

      return NextResponse.json({ success: true, key: newSubmission._key })
    }

    if (action === 'approve-work-submission') {
      const { taskKey, submissionKey, message } = body
      if (!taskKey || !submissionKey) {
        return NextResponse.json(
          { error: 'taskKey and submissionKey are required' },
          { status: 400 },
        )
      }

      const doc = await writeClient.getDocument(id)
      if (!doc || doc._type !== 'weeklySprint') {
        return NextResponse.json({ error: 'Sprint not found' }, { status: 404 })
      }

      const tasks = (doc.tasks as Array<Record<string, unknown>>) || []
      const task = tasks.find(
        (t: Record<string, unknown>) => t._key === taskKey,
      )
      if (!task) {
        return NextResponse.json({ error: 'Task not found' }, { status: 404 })
      }

      const submissions =
        (task.workSubmissions as Array<Record<string, unknown>>) || []
      const updated = submissions.map(s => {
        if (s._key !== submissionKey) return s
        const thread = (s.reviewThread as Array<Record<string, unknown>>) || []
        return {
          ...s,
          status: 'approved',
          reviewThread: [
            ...thread,
            {
              _key: crypto.randomUUID(),
              _type: 'object',
              role: 'supervisor',
              action: 'approve',
              message: message || 'Approved',
              createdAt: new Date().toISOString(),
            },
          ],
        }
      })

      const allApproved = updated.every(s => s.status === 'approved')

      const setFields: Record<string, unknown> = {
        [`tasks[_key=="${taskKey}"].workSubmissions`]: updated,
      }
      if (allApproved) {
        const ws = doc.weekStart as string
        setFields[`tasks[_key=="${taskKey}"].taskStatus`] = isSprintWeekStarted(
          ws,
        )
          ? 'done'
          : 'to_do'
      }

      await writeClient.patch(id).set(setFields).commit()
      return NextResponse.json({ success: true })
    }

    if (action === 'reject-work-submission') {
      const { taskKey, submissionKey, message } = body
      if (!taskKey || !submissionKey || !message?.trim()) {
        return NextResponse.json(
          { error: 'taskKey, submissionKey, and message are required' },
          { status: 400 },
        )
      }

      const doc = await writeClient.getDocument(id)
      if (!doc || doc._type !== 'weeklySprint') {
        return NextResponse.json({ error: 'Sprint not found' }, { status: 404 })
      }

      const tasks = (doc.tasks as Array<Record<string, unknown>>) || []
      const task = tasks.find(
        (t: Record<string, unknown>) => t._key === taskKey,
      )
      if (!task) {
        return NextResponse.json({ error: 'Task not found' }, { status: 404 })
      }

      const submissions =
        (task.workSubmissions as Array<Record<string, unknown>>) || []
      const updated = submissions.map(s => {
        if (s._key !== submissionKey) return s
        const thread = (s.reviewThread as Array<Record<string, unknown>>) || []
        return {
          ...s,
          status: 'rejected',
          reviewThread: [
            ...thread,
            {
              _key: crypto.randomUUID(),
              _type: 'object',
              role: 'supervisor',
              action: 'reject',
              message: message.trim(),
              createdAt: new Date().toISOString(),
            },
          ],
        }
      })

      await writeClient
        .patch(id)
        .set({ [`tasks[_key=="${taskKey}"].workSubmissions`]: updated })
        .commit()

      return NextResponse.json({ success: true })
    }

    if (action === 'respond-to-work-submission-rejection') {
      const { taskKey, submissionKey, message, outputFileId } = body
      if (!taskKey || !submissionKey) {
        return NextResponse.json(
          { error: 'taskKey and submissionKey are required' },
          { status: 400 },
        )
      }

      const doc = await writeClient.getDocument(id)
      if (!doc || doc._type !== 'weeklySprint') {
        return NextResponse.json({ error: 'Sprint not found' }, { status: 404 })
      }

      const weekStart = doc.weekStart as string
      if (!isSprintWeekStarted(weekStart)) {
        return NextResponse.json(
          {
            error: 'Responses open when the sprint week starts (Monday 10 AM)',
          },
          { status: 400 },
        )
      }

      const tasks = (doc.tasks as Array<Record<string, unknown>>) || []
      const task = tasks.find(
        (t: Record<string, unknown>) => t._key === taskKey,
      )
      if (!task) {
        return NextResponse.json({ error: 'Task not found' }, { status: 404 })
      }

      const submissions =
        (task.workSubmissions as Array<Record<string, unknown>>) || []
      const updated = submissions.map(s => {
        if (s._key !== submissionKey) return s
        const thread = (s.reviewThread as Array<Record<string, unknown>>) || []
        const updatedSubmission: Record<string, unknown> = {
          ...s,
          status: 'pending',
          reviewThread: [
            ...thread,
            {
              _key: crypto.randomUUID(),
              _type: 'object',
              role: 'officer',
              action: 'respond',
              message: message?.trim() || 'Resubmitted',
              createdAt: new Date().toISOString(),
            },
          ],
        }
        if (outputFileId) {
          updatedSubmission.output = {
            _type: 'file',
            asset: { _type: 'reference', _ref: outputFileId },
          }
        }
        return updatedSubmission
      })

      await writeClient
        .patch(id)
        .set({ [`tasks[_key=="${taskKey}"].workSubmissions`]: updated })
        .commit()

      return NextResponse.json({ success: true })
    }

    if (action === 'revise-task') {
      const {
        taskKey,
        description,
        activityCategory,
        initiativeKey,
        initiativeTitle,
        activityKey,
        activityTitle,
      } = body

      if (!taskKey || typeof taskKey !== 'string') {
        return NextResponse.json(
          { error: 'taskKey is required' },
          { status: 400 },
        )
      }

      const err = validateSprintTaskPayload({
        description,
        activityCategory,
        initiativeKey,
        activityKey,
      })
      if (err) {
        return NextResponse.json({ error: err }, { status: 400 })
      }

      const doc = await writeClient.getDocument(id)
      if (!doc || doc._type !== 'weeklySprint') {
        return NextResponse.json({ error: 'Sprint not found' }, { status: 404 })
      }

      if (doc.status !== 'submitted' && doc.status !== 'reviewed') {
        return NextResponse.json(
          {
            error:
              'Can only revise tasks in sprints that are submitted or fully reviewed',
          },
          { status: 400 },
        )
      }

      const tasks = (doc.tasks as Array<Record<string, unknown>>) || []
      const task = tasks.find(
        (t: Record<string, unknown>) => t._key === taskKey,
      )
      if (!task) {
        return NextResponse.json({ error: 'Task not found' }, { status: 404 })
      }
      if (task.status !== 'revisions_requested') {
        return NextResponse.json(
          {
            error: 'Only tasks with revisions requested can be revised',
          },
          { status: 400 },
        )
      }

      const patchPath = `tasks[_key=="${taskKey}"]`
      const patch = writeClient.patch(id).set({
        [`${patchPath}.description`]: String(description).trim(),
        [`${patchPath}.activityCategory`]: activityCategory,
        [`${patchPath}.initiativeKey`]: initiativeKey,
        ...(initiativeTitle && {
          [`${patchPath}.initiativeTitle`]: String(initiativeTitle).trim(),
        }),
        [`${patchPath}.activityKey`]: activityKey,
        ...(activityTitle && {
          [`${patchPath}.activityTitle`]: String(activityTitle).trim(),
        }),
        [`${patchPath}.status`]: 'pending',
        [`${patchPath}.revisionReason`]: '',
      })

      if (doc.status === 'reviewed') {
        patch.set({ status: 'submitted' })
      }

      await patch.commit()
      return NextResponse.json({ success: true })
    }

    if (action === 'add-extra-task') {
      const { userId } = await auth()
      if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }

      const clerkUser = await currentUser()
      const emailRaw =
        clerkUser?.primaryEmailAddress?.emailAddress ??
        clerkUser?.emailAddresses?.[0]?.emailAddress
      const email = emailRaw?.trim().toLowerCase()
      if (!email) {
        return NextResponse.json(
          { error: 'Could not resolve your account email' },
          { status: 400 },
        )
      }

      const {
        description,
        activityCategory,
        initiativeKey,
        initiativeTitle,
        activityKey,
        activityTitle,
      } = body

      const err = validateSprintTaskPayload({
        description,
        activityCategory,
        initiativeKey,
        activityKey,
      })
      if (err) {
        return NextResponse.json({ error: err }, { status: 400 })
      }

      const doc = await writeClient.getDocument(id)
      if (!doc || doc._type !== 'weeklySprint') {
        return NextResponse.json({ error: 'Sprint not found' }, { status: 404 })
      }
      if (doc.status === 'draft') {
        return NextResponse.json(
          { error: 'Cannot add extra tasks to draft sprints' },
          { status: 400 },
        )
      }

      const sectionRef = doc.section as { _ref?: string } | undefined
      const sectionId = sectionRef?._ref
      if (!sectionId) {
        return NextResponse.json(
          { error: 'Sprint has no section' },
          { status: 400 },
        )
      }

      const officerId = await writeClient.fetch<string | null>(
        `*[_type == "staff"
          && role == "officer"
          && lower(email) == $email
          && section._ref == $sectionId
          && status == "active"
        ][0]._id`,
        { email, sectionId },
      )

      if (!officerId) {
        return NextResponse.json(
          {
            error:
              'Only active officers assigned to this section can add extra tasks. Your sign-in email must match your staff record.',
          },
          { status: 403 },
        )
      }

      const tasks = (doc.tasks as Array<Record<string, unknown>>) || []
      const newTask: Record<string, unknown> = {
        _type: 'sprintTask',
        _key: crypto.randomUUID(),
        description: String(description).trim(),
        activityCategory,
        initiativeKey,
        ...(initiativeTitle && {
          initiativeTitle: String(initiativeTitle).trim(),
        }),
        activityKey,
        ...(activityTitle && { activityTitle: String(activityTitle).trim() }),
        status: 'accepted',
        reviewedAt: new Date().toISOString(),
        taskStatus: 'to_do',
        priority: 'medium',
        assignee: { _type: 'reference', _ref: officerId },
      }

      await writeClient
        .patch(id)
        .set({ tasks: [...tasks, newTask] })
        .commit()

      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error) {
    console.error('Error updating weekly sprint', error)
    return NextResponse.json(
      { error: 'Failed to update sprint' },
      { status: 500 },
    )
  }
}
