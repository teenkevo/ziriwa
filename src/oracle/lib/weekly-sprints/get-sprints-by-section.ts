import { oracleQuery } from '@/lib/oracle/client'
import type {
  SprintTask,
  WeeklySprint,
  WorkSubmission,
} from '@/sanity/lib/weekly-sprints/get-sprints-by-section'

type SprintRow = {
  _id: string
  weekLabel: string
  weekStart: Date | string
  weekEnd: Date | string
  status: WeeklySprint['status']
  supervisor_id: string
  supervisor_full_name: string
}

type TaskRow = {
  sprint_id: string
  sprint_task_id: string
  _key: string
  description: string
  activityCategory: string
  initiativeKey?: string
  initiativeTitle?: string
  activityKey?: string
  activityTitle?: string
  status: SprintTask['status']
  revisionReason?: string | null
  reviewedAt?: Date | string | null
  assignee?: string | null
  assigneeName?: string | null
  priority?: string | null
  taskStatus?: SprintTask['taskStatus'] | null
}

type SubmissionRow = {
  sprint_task_id: string
  submission_db_id: string
  _key: string
  date: Date | string
  startTime: string
  endTime: string
  totalHours?: number | null
  description: string
  status: WorkSubmission['status']
  submittedAt?: Date | string | null
  revenueAssessed?: number | null
  output_asset_id?: string | null
  asset_id?: string | null
  asset_original_filename?: string | null
  asset_mime_type?: string | null
  asset_size_bytes?: number | null
}

type SubmissionThreadRow = {
  work_submission_id: string
  _key: string
  role: string
  action: string
  message?: string | null
  createdAt: Date | string
}

type AssetRow = {
  id: string
  original_filename: string | null
  mime_type: string | null
  size_bytes: number | null
}

function formatYMD(v: Date | string | null | undefined): string | undefined {
  if (!v) return undefined
  const d = v instanceof Date ? v : new Date(String(v))
  if (Number.isNaN(d.getTime())) return undefined
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function iso(v: Date | string | null | undefined): string | undefined {
  if (!v) return undefined
  const d = v instanceof Date ? v : new Date(String(v))
  if (Number.isNaN(d.getTime())) return undefined
  return d.toISOString()
}

function oracleInClauseParams(items: string[]) {
  // Builds `(:id0,:id1,...)` bind list plus bind object.
  const binds: Record<string, string> = {}
  const placeholders = items.map((id, i) => {
    const key = `id${i}`
    binds[key] = id
    return `:${key}`
  })
  return { inSql: placeholders.join(','), binds }
}

export async function getSprintsBySectionOracle(
  sectionId: string,
): Promise<WeeklySprint[]> {
  const sprints = await oracleQuery<SprintRow>(
    `
      SELECT
        ws.id AS "_id",
        ws.week_label AS "weekLabel",
        ws.week_start AS "weekStart",
        ws.week_end AS "weekEnd",
        ws.status AS "status",
        sup.id AS "supervisor_id",
        coalesce(sup.full_name, sup.first_name || ' ' || sup.last_name) AS "supervisor_full_name"
      FROM weekly_sprints ws
      JOIN staff sup ON sup.id = ws.supervisor_staff_id
      WHERE ws.section_id = :sectionId
      ORDER BY ws.week_start DESC
    `,
    { sectionId },
  )

  if (!sprints.length) return []

  const sprintIds = sprints.map(s => s._id)
  const sprintIdsIn = oracleInClauseParams(sprintIds)

  const taskRows = await oracleQuery<TaskRow>(
    `
      SELECT
        st.sprint_id AS "sprint_id",
        st.id AS "sprint_task_id",
        st.task_key AS "_key",
        st.description AS "description",
        st.activity_category AS "activityCategory",
        st.initiative_key AS "initiativeKey",
        st.initiative_title AS "initiativeTitle",
        st.activity_key AS "activityKey",
        st.activity_title AS "activityTitle",
        st.status AS "status",
        st.revision_reason AS "revisionReason",
        st.reviewed_at AS "reviewedAt",
        st.assignee_staff_id AS "assignee",
        st.assignee_name AS "assigneeName",
        st.priority AS "priority",
        st.task_status AS "taskStatus"
      FROM sprint_tasks st
      WHERE st.sprint_id IN (${sprintIdsIn.inSql})
      ORDER BY st.sprint_id, st.task_key
    `,
    sprintIdsIn.binds,
  )

  const tasksBySprintId = new Map<string, SprintTask[]>()
  const taskByDbId = new Map<string, SprintTask>()
  for (const s of sprints) tasksBySprintId.set(s._id, [])

  for (const t of taskRows) {
    const sprintTasks = tasksBySprintId.get(t.sprint_id)
    if (!sprintTasks) continue
    const task: SprintTask = {
      _key: t._key,
      description: t.description,
      activityCategory: t.activityCategory as SprintTask['activityCategory'],
      initiativeKey: t.initiativeKey ?? undefined,
      initiativeTitle: t.initiativeTitle ?? undefined,
      activityKey: t.activityKey ?? undefined,
      activityTitle: t.activityTitle ?? undefined,
      status: t.status,
      revisionReason: t.revisionReason ?? undefined,
      reviewedAt: iso(t.reviewedAt ?? null),
      assignee: t.assignee ?? null,
      assigneeName: t.assigneeName ?? null,
      priority: t.priority ?? undefined,
      taskStatus: (t.taskStatus ?? undefined) as SprintTask['taskStatus'] | undefined,
      workSubmissions: [],
    }
    sprintTasks.push(task)
    taskByDbId.set(t.sprint_task_id, task)
  }

  // Work submissions and threads
  const sprintTaskDbIds = taskRows.map(t => t.sprint_task_id)
  if (sprintTaskDbIds.length) {
    const sprintTaskIdsIn = oracleInClauseParams(sprintTaskDbIds)

    const submissionRows = await oracleQuery<SubmissionRow>(
      `
        SELECT
          ws.sprint_task_id AS "sprint_task_id",
          ws.id AS "submission_db_id",
          ws.submission_key AS "_key",
          ws.submission_date AS "date",
          ws.start_time AS "startTime",
          ws.end_time AS "endTime",
          ws.total_hours AS "totalHours",
          ws.description AS "description",
          ws.status AS "status",
          ws.submitted_at AS "submittedAt",
          ws.revenue_assessed AS "revenueAssessed",
          ws.output_asset_id AS "output_asset_id",
          a.id AS "asset_id",
          a.original_filename AS "asset_original_filename",
          a.mime_type AS "asset_mime_type",
          a.size_bytes AS "asset_size_bytes"
        FROM work_submissions ws
        LEFT JOIN assets a ON a.id = ws.output_asset_id
        WHERE ws.sprint_task_id IN (${sprintTaskIdsIn.inSql})
        ORDER BY ws.sprint_task_id, ws.submission_date DESC
      `,
      sprintTaskIdsIn.binds,
    )

    const submissionByDbId = new Map<string, WorkSubmission>()

    for (const r of submissionRows) {
      const task = taskByDbId.get(r.sprint_task_id)
      if (!task) continue

      const asset =
        r.asset_id && r.asset_original_filename
          ? {
              _id: r.asset_id,
              url: `/api/assets/${r.asset_id}`,
              originalFilename: r.asset_original_filename ?? undefined,
              size: r.asset_size_bytes ?? undefined,
              mimeType: r.asset_mime_type ?? undefined,
            }
          : undefined

      const wsObj: WorkSubmission = {
        _key: r._key,
        date: formatYMD(r.date) ?? undefined,
        startTime: r.startTime ?? undefined,
        endTime: r.endTime ?? undefined,
        totalHours: r.totalHours ?? undefined,
        description: r.description ?? undefined,
        status: r.status ?? undefined,
        submittedAt: iso(r.submittedAt ?? null),
        revenueAssessed: r.revenueAssessed ?? undefined,
        output: asset ? { asset } : undefined,
        reviewThread: [],
      }

      task.workSubmissions = task.workSubmissions ?? []
      task.workSubmissions.push(wsObj)
      submissionByDbId.set(r.submission_db_id, wsObj)
    }

    // Review thread entries
    const submissionDbIds = submissionRows.map(r => r.submission_db_id)
    if (submissionDbIds.length) {
      const submissionIdsIn = oracleInClauseParams(submissionDbIds)
      const threadRows = await oracleQuery<SubmissionThreadRow>(
        `
          SELECT
            tr.work_submission_id AS "work_submission_id",
            tr.thread_key AS "_key",
            tr.role AS "role",
            tr.action AS "action",
            tr.message AS "message",
            tr.created_at AS "createdAt"
          FROM work_submission_review_thread tr
          WHERE tr.work_submission_id IN (${submissionIdsIn.inSql})
          ORDER BY tr.work_submission_id, tr.created_at ASC
        `,
        submissionIdsIn.binds,
      )

      for (const tr of threadRows) {
        const wsObj = submissionByDbId.get(tr.work_submission_id)
        if (!wsObj) continue
        wsObj.reviewThread = wsObj.reviewThread ?? []
        wsObj.reviewThread.push({
          _key: tr._key,
          role: tr.role as any,
          action: tr.action as any,
          message: tr.message ?? undefined,
          createdAt: iso(tr.createdAt ?? null),
        })
      }
    }
  }

  return sprints.map(s => {
    const start = formatYMD(s.weekStart) ?? ''
    const end = formatYMD(s.weekEnd) ?? ''
    return {
      _id: s._id,
      weekLabel: s.weekLabel,
      weekStart: start,
      weekEnd: end,
      status: s.status,
      supervisor: {
        _id: s.supervisor_id,
        fullName: s.supervisor_full_name,
      },
      tasks: tasksBySprintId.get(s._id) ?? [],
    }
  })
}

