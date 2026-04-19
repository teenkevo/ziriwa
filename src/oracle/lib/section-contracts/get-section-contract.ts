import { oracleQuery } from '@/lib/oracle/client'
import type {
  SectionContract,
  SsmartaObjective,
} from '@/sanity/lib/section-contracts/get-section-contract'

function toYMD(v: unknown): string | undefined {
  if (!v) return undefined
  if (typeof v === 'string') {
    // Accept already-serialized YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v
    return v
  }
  const d = v instanceof Date ? v : new Date(String(v))
  if (Number.isNaN(d.getTime())) return undefined
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

type ObjectiveRow = {
  objective_key: string
  objective_code: string
  objective_title: string
  objective_order: number
  initiative_key: string | null
  initiative_code: string | null
  initiative_title: string | null
  initiative_order: number | null
  activity_id: string | null
  activity_key: string | null
  activity_type: string | null
  activity_title: string | null
  activity_aim: string | null
  activity_order: number | null
  activity_target_date: unknown
  activity_status: string | null
  reporting_frequency: string | null
}

export async function getSectionContractOracle(
  sectionId: string,
  financialYearLabel: string,
): Promise<SectionContract | null> {
  const contractRows = await oracleQuery<any>(
    `
      SELECT
        sc.id AS "_id",
        sc.status AS "status",
        sc.financial_year_label AS "financialYearLabel",
        s.id AS "section_id",
        s.name AS "section_name",
        m.id AS "manager_id",
        coalesce(m.full_name, m.first_name || ' ' || m.last_name) AS "manager_full_name"
      FROM section_contracts sc
      JOIN sections s ON s.id = sc.section_id
      JOIN staff m ON m.id = sc.manager_id
      WHERE sc.section_id = :sectionId
        AND sc.financial_year_label = :financialYearLabel
      FETCH FIRST 1 ROWS ONLY
    `,
    { sectionId, financialYearLabel },
  )

  const cr = contractRows[0]
  if (!cr) return null

  const objectiveRows = await oracleQuery<ObjectiveRow>(
    `
      SELECT
        co.objective_key AS "objective_key",
        co.code AS "objective_code",
        co.title AS "objective_title",
        co.objective_order AS "objective_order",

        ci.initiative_key AS "initiative_key",
        ci.code AS "initiative_code",
        ci.title AS "initiative_title",
        ci.initiative_order AS "initiative_order",

        ma.id AS "activity_id",
        ma.activity_key AS "activity_key",
        ma.activity_type AS "activity_type",
        ma.title AS "activity_title",
        DBMS_LOB.SUBSTR(ma.aim, 4000, 1) AS "activity_aim",
        ma.activity_order AS "activity_order",
        ma.target_date AS "activity_target_date",
        ma.status AS "activity_status",
        ma.reporting_frequency AS "reporting_frequency"
      FROM contract_objectives co
      LEFT JOIN contract_initiatives ci ON ci.objective_id = co.id
      LEFT JOIN measurable_activities ma ON ma.initiative_id = ci.id
      WHERE co.contract_id = :contractId
      ORDER BY
        co.objective_order,
        ci.initiative_order NULLS LAST,
        ma.activity_order NULLS LAST
    `,
    { contractId: cr._id },
  )

  const objectives: SsmartaObjective[] = []
  const objectiveByKey = new Map<string, SsmartaObjective>()

  const activityIdByKey = new Map<string, string>()

  for (const row of objectiveRows) {
    const objKey = row.objective_key
    let obj = objectiveByKey.get(objKey)
    if (!obj) {
      obj = {
        _key: objKey,
        code: row.objective_code,
        title: row.objective_title,
        order: row.objective_order,
        initiatives: [],
      }
      objectiveByKey.set(objKey, obj)
      objectives.push(obj)
    }

    // Initiative can appear across multiple activity rows.
    const initKey = row.initiative_key
    if (!initKey) continue
    let initiatives = obj.initiatives ?? []
    let init = initiatives.find(i => i._key === initKey)
    if (!init) {
      init = {
        _key: initKey,
        code: row.initiative_code ?? undefined,
        title: row.initiative_title ?? '',
        order: row.initiative_order ?? undefined,
        measurableActivities: [],
      }
      initiatives.push(init)
      obj.initiatives = initiatives
    }

    if (row.activity_key) {
      if (row.activity_id) activityIdByKey.set(row.activity_key, row.activity_id)
      init.measurableActivities?.push({
        _key: row.activity_key,
        activityType: (row.activity_type as 'kpi' | 'cross-cutting') ?? 'kpi',
        title: row.activity_title ?? '',
        aim: row.activity_aim ?? undefined,
        order: row.activity_order ?? undefined,
        targetDate: toYMD(row.activity_target_date),
        status: row.activity_status ?? undefined,
        reportingFrequency:
          (row.reporting_frequency as
            | 'weekly'
            | 'monthly'
            | 'quarterly'
            | 'n/a') ?? 'n/a',
        evidence: [],
        tasks: [],
      })
    }
  }

  // Load detailed tasks for all activities.
  const activityIds = Array.from(new Set(activityIdByKey.values()))
  if (activityIds.length) {
    const inBinds: Record<string, string> = {}
    const inKeys: string[] = []
    activityIds.forEach((aid, i) => {
      const k = `a${i}`
      inBinds[k] = aid
      inKeys.push(`:${k}`)
    })

    const taskRows = await oracleQuery<{
      id: string
      activity_id: string
      task_key: string
      task_text: string | null
      task_order: number
      priority: string | null
      status: string | null
      assignee_staff_id: string | null
      target_date: unknown
      reporting_frequency: string | null
      reporting_period_start: unknown
      expected_deliverable: string | null
    }>(
      `
        SELECT
          id AS "id",
          activity_id AS "activity_id",
          task_key AS "task_key",
          task_text AS "task_text",
          task_order AS "task_order",
          priority AS "priority",
          status AS "status",
          assignee_staff_id AS "assignee_staff_id",
          target_date AS "target_date",
          reporting_frequency AS "reporting_frequency",
          reporting_period_start AS "reporting_period_start",
          expected_deliverable AS "expected_deliverable"
        FROM activity_tasks
        WHERE activity_id IN (${inKeys.join(', ')})
        ORDER BY activity_id, task_order ASC
      `,
      inBinds,
    )

    const taskIds = taskRows.map(t => t.id)
    const taskIdBinds: Record<string, string> = {}
    const taskIdKeys: string[] = []
    taskIds.forEach((tid, i) => {
      const k = `t${i}`
      taskIdBinds[k] = tid
      taskIdKeys.push(`:${k}`)
    })

    const assetUrl = (assetId: string) => `/api/assets/${assetId}`

    const inputsRows =
      taskIds.length === 0
        ? []
        : await oracleQuery<{
            task_id: string
            asset_id: string
            submitted_at: unknown
          }>(
            `
              SELECT
                task_id AS "task_id",
                asset_id AS "asset_id",
                submitted_at AS "submitted_at"
              FROM activity_task_inputs
              WHERE task_id IN (${taskIdKeys.join(', ')})
            `,
            taskIdBinds,
          )

    const deliverableRows =
      taskIds.length === 0
        ? []
        : await oracleQuery<{
            task_id: string
            deliverable_key: string
            asset_id: string
            tag: string | null
            locked: number
          }>(
            `
              SELECT
                task_id AS "task_id",
                deliverable_key AS "deliverable_key",
                asset_id AS "asset_id",
                tag AS "tag",
                locked AS "locked"
              FROM activity_task_deliverables
              WHERE task_id IN (${taskIdKeys.join(', ')})
            `,
            taskIdBinds,
          )

    const threadRows =
      taskIds.length === 0
        ? []
        : await oracleQuery<{
            task_id: string
            thread_key: string
            thread_kind: string
            author_staff_id: string | null
            role: string | null
            action: string | null
            message: string | null
            created_at: unknown
            asset_id: string | null
          }>(
            `
              SELECT
                task_id AS "task_id",
                thread_key AS "thread_key",
                thread_kind AS "thread_kind",
                author_staff_id AS "author_staff_id",
                role AS "role",
                action AS "action",
                message AS "message",
                created_at AS "created_at",
                asset_id AS "asset_id"
              FROM activity_task_review_thread
              WHERE task_id IN (${taskIdKeys.join(', ')})
              ORDER BY created_at ASC NULLS LAST
            `,
            taskIdBinds,
          )

    const periodRows =
      taskIds.length === 0
        ? []
        : await oracleQuery<{
            period_id: string
            task_id: string
            period_key: string
            status: string | null
            submitted_at: unknown
          }>(
            `
              SELECT
                id AS "period_id",
                task_id AS "task_id",
                period_key AS "period_key",
                status AS "status",
                submitted_at AS "submitted_at"
              FROM activity_task_periods
              WHERE task_id IN (${taskIdKeys.join(', ')})
            `,
            taskIdBinds,
          )

    const periodIds = periodRows.map(p => p.period_id)
    const periodIdBinds: Record<string, string> = {}
    const periodIdKeys: string[] = []
    periodIds.forEach((pid, i) => {
      const k = `p${i}`
      periodIdBinds[k] = pid
      periodIdKeys.push(`:${k}`)
    })

    const periodDeliverableRows =
      periodIds.length === 0
        ? []
        : await oracleQuery<{
            period_id: string
            deliverable_key: string
            asset_id: string
            tag: string | null
            locked: number
          }>(
            `
              SELECT
                period_id AS "period_id",
                deliverable_key AS "deliverable_key",
                asset_id AS "asset_id",
                tag AS "tag",
                locked AS "locked"
              FROM activity_task_period_deliverables
              WHERE period_id IN (${periodIdKeys.join(', ')})
            `,
            periodIdBinds,
          )

    const periodThreadRows =
      periodIds.length === 0
        ? []
        : await oracleQuery<{
            period_id: string
            thread_key: string
            author_staff_id: string | null
            role: string | null
            action: string | null
            message: string | null
            created_at: unknown
            asset_id: string | null
          }>(
            `
              SELECT
                period_id AS "period_id",
                thread_key AS "thread_key",
                author_staff_id AS "author_staff_id",
                role AS "role",
                action AS "action",
                message AS "message",
                created_at AS "created_at",
                asset_id AS "asset_id"
              FROM activity_task_period_review_thread
              WHERE period_id IN (${periodIdKeys.join(', ')})
              ORDER BY created_at ASC NULLS LAST
            `,
            periodIdBinds,
          )

    const inputsByTask = new Map<string, any>()
    for (const r of inputsRows) {
      inputsByTask.set(r.task_id, {
        file: { asset: { _id: r.asset_id, url: assetUrl(r.asset_id) } },
        submittedAt: r.submitted_at ? new Date(String(r.submitted_at)).toISOString() : undefined,
      })
    }

    const deliverablesByTask = new Map<string, any[]>()
    for (const r of deliverableRows) {
      if (!deliverablesByTask.has(r.task_id)) deliverablesByTask.set(r.task_id, [])
      deliverablesByTask.get(r.task_id)!.push({
        _key: r.deliverable_key,
        file: { asset: { _id: r.asset_id, url: assetUrl(r.asset_id) } },
        tag: r.tag === 'main' ? 'main' : 'support',
        locked: Boolean(r.locked),
      })
    }

    const inputsThreadByTask = new Map<string, any[]>()
    const deliverableThreadByTask = new Map<string, any[]>()
    for (const r of threadRows) {
      const entry = {
        _key: r.thread_key,
        ...(r.author_staff_id && { author: { _id: r.author_staff_id } }),
        role: (r.role as any) ?? undefined,
        action: (r.action as any) ?? undefined,
        message: r.message ?? undefined,
        createdAt: r.created_at ? new Date(String(r.created_at)).toISOString() : undefined,
        ...(r.asset_id && {
          file: { asset: { _id: r.asset_id, url: assetUrl(r.asset_id) } },
        }),
      }
      const target =
        r.thread_kind === 'inputs' ? inputsThreadByTask : deliverableThreadByTask
      if (!target.has(r.task_id)) target.set(r.task_id, [])
      target.get(r.task_id)!.push(entry)
    }

    const periodsByTask = new Map<string, any[]>()
    for (const p of periodRows) {
      if (!periodsByTask.has(p.task_id)) periodsByTask.set(p.task_id, [])
      periodsByTask.get(p.task_id)!.push({
        _key: p.period_id,
        periodKey: p.period_key,
        status: (p.status as any) ?? 'pending',
        submittedAt: p.submitted_at ? new Date(String(p.submitted_at)).toISOString() : undefined,
        deliverable: [],
        deliverableReviewThread: [],
      })
    }

    const periodIndex = new Map<string, any>()
    for (const [taskId, arr] of periodsByTask.entries()) {
      for (const p of arr) periodIndex.set(p._key, p)
    }
    for (const d of periodDeliverableRows) {
      const p = periodIndex.get(d.period_id)
      if (!p) continue
      p.deliverable.push({
        _key: d.deliverable_key,
        file: { asset: { _id: d.asset_id, url: assetUrl(d.asset_id) } },
        tag: d.tag === 'main' ? 'main' : 'support',
        locked: Boolean(d.locked),
      })
    }
    for (const tr of periodThreadRows) {
      const p = periodIndex.get(tr.period_id)
      if (!p) continue
      p.deliverableReviewThread.push({
        _key: tr.thread_key,
        ...(tr.author_staff_id && { author: { _id: tr.author_staff_id } }),
        role: (tr.role as any) ?? undefined,
        action: (tr.action as any) ?? undefined,
        message: tr.message ?? undefined,
        createdAt: tr.created_at ? new Date(String(tr.created_at)).toISOString() : undefined,
        ...(tr.asset_id && {
          file: { asset: { _id: tr.asset_id, url: assetUrl(tr.asset_id) } },
        }),
      })
    }

    const tasksByActivityId = new Map<string, any[]>()
    for (const t of taskRows) {
      if (!tasksByActivityId.has(t.activity_id)) tasksByActivityId.set(t.activity_id, [])
      tasksByActivityId.get(t.activity_id)!.push({
        _key: t.task_key,
        task: t.task_text ?? '',
        priority: t.priority ?? 'medium',
        assignee: t.assignee_staff_id ? { _id: t.assignee_staff_id } : undefined,
        inputs: inputsByTask.get(t.id) ?? undefined,
        inputsReviewThread: inputsThreadByTask.get(t.id) ?? [],
        deliverableReviewThread: deliverableThreadByTask.get(t.id) ?? [],
        status: t.status ?? 'to_do',
        targetDate: toYMD(t.target_date),
        reportingFrequency: (t.reporting_frequency as any) ?? 'n/a',
        expectedDeliverable: t.expected_deliverable ?? undefined,
        reportingPeriodStart: toYMD(t.reporting_period_start),
        periodDeliverables: periodsByTask.get(t.id) ?? [],
        deliverable: deliverablesByTask.get(t.id) ?? [],
      })
    }

    // Attach tasks to the tree using activity_id mapping
    for (const obj of objectives) {
      for (const init of obj.initiatives ?? []) {
        for (const act of init.measurableActivities ?? []) {
          const actId = activityIdByKey.get(act._key)
          if (!actId) continue
          act.tasks = tasksByActivityId.get(actId) ?? []
        }
      }
    }
  }

  return {
    _id: cr._id,
    section: { _id: cr.section_id, name: cr.section_name },
    financialYearLabel: cr.financialYearLabel,
    manager: { _id: cr.manager_id, fullName: cr.manager_full_name },
    status: cr.status,
    objectives,
  }
}
