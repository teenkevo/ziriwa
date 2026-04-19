import { NextRequest, NextResponse } from 'next/server'
import { writeClient } from '@/sanity/lib/write-client'
import { withOracleConnection } from '@/lib/oracle/client'
import oracledb from 'oracledb'
import {
  duplicateAmongStrings,
  initiativeCodeMatchesObjective,
  remapInitiativeCodeForObjectiveRename,
} from '@/lib/contract-code-validation'

function isYmd(v: unknown): v is string {
  return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)
}

function parseDateOrNull(v: unknown): Date | null {
  if (!v) return null
  if (v instanceof Date) return v
  if (isYmd(v)) return new Date(`${v}T00:00:00.000Z`)
  if (typeof v === 'string') {
    const d = new Date(v)
    return Number.isNaN(d.getTime()) ? null : d
  }
  return null
}

async function resolveObjectiveIdByIndex(
  conn: any,
  contractId: string,
  objectiveIndex: number,
): Promise<{ id: string; code: string | null } | null> {
  const rn = objectiveIndex + 1
  const res = await conn.execute(
    `
      SELECT id AS "id", code AS "code"
      FROM (
        SELECT
          id,
          code,
          ROW_NUMBER() OVER (
            ORDER BY objective_order ASC, code NULLS LAST, id
          ) AS rn
        FROM contract_objectives
        WHERE contract_id = :contractId
      )
      WHERE rn = :rn
    `,
    { contractId, rn } as any,
    { outFormat: oracledb.OUT_FORMAT_OBJECT },
  )
  return (res.rows?.[0] as any) ?? null
}

async function resolveInitiativeIdByIndex(
  conn: any,
  objectiveId: string,
  initiativeIndex: number,
): Promise<{ id: string; code: string | null } | null> {
  const rn = initiativeIndex + 1
  const res = await conn.execute(
    `
      SELECT id AS "id", code AS "code"
      FROM (
        SELECT
          id,
          code,
          ROW_NUMBER() OVER (
            ORDER BY initiative_order ASC, code NULLS LAST, id
          ) AS rn
        FROM contract_initiatives
        WHERE objective_id = :objectiveId
      )
      WHERE rn = :rn
    `,
    { objectiveId, rn } as any,
    { outFormat: oracledb.OUT_FORMAT_OBJECT },
  )
  return (res.rows?.[0] as any) ?? null
}

async function resolveActivityIdByIndex(
  conn: any,
  initiativeId: string,
  activityIndex: number,
): Promise<string | null> {
  const rn = activityIndex + 1
  const res = await conn.execute(
    `
      SELECT id AS "id"
      FROM (
        SELECT
          id,
          ROW_NUMBER() OVER (
            ORDER BY activity_order NULLS LAST, target_date NULLS LAST, id
          ) AS rn
        FROM measurable_activities
        WHERE initiative_id = :initiativeId
      )
      WHERE rn = :rn
    `,
    { initiativeId, rn } as any,
    { outFormat: oracledb.OUT_FORMAT_OBJECT },
  )
  const row = res.rows?.[0] as { id?: string } | undefined
  return row?.id ?? null
}

/**
 * PATCH /api/section-contracts/[id] - Add objective, initiative, or activity
 * Body: { op: 'addObjective' | 'addInitiative' | 'addActivity', payload }
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
          `SELECT id AS "id" FROM section_contracts WHERE id = :id FETCH FIRST 1 ROWS ONLY`,
          { id } as any,
          { outFormat: oracledb.OUT_FORMAT_OBJECT },
        )
        if (!existsRes.rows?.[0]) {
          return NextResponse.json(
            { error: 'Contract not found' },
            { status: 404 },
          )
        }

        if (op === 'deleteObjective') {
          const { objectiveIndex } = payload as { objectiveIndex?: number }
          if (typeof objectiveIndex !== 'number') {
            return NextResponse.json(
              { error: 'objectiveIndex is required' },
              { status: 400 },
            )
          }
          const obj = await resolveObjectiveIdByIndex(conn, id, objectiveIndex)
          if (!obj?.id) {
            return NextResponse.json(
              { error: 'Objective not found' },
              { status: 404 },
            )
          }
          await conn.execute(
            `DELETE FROM measurable_activity_evidence WHERE activity_id IN (
              SELECT ma.id FROM measurable_activities ma
              JOIN contract_initiatives ci ON ci.id = ma.initiative_id
              WHERE ci.objective_id = :objId
            )`,
            { objId: obj.id } as any,
            { autoCommit: false },
          )
          await conn.execute(
            `DELETE FROM measurable_activities WHERE initiative_id IN (
              SELECT id FROM contract_initiatives WHERE objective_id = :objId
            )`,
            { objId: obj.id } as any,
            { autoCommit: false },
          )
          await conn.execute(
            `DELETE FROM contract_initiatives WHERE objective_id = :objId`,
            { objId: obj.id } as any,
            { autoCommit: false },
          )
          await conn.execute(
            `DELETE FROM contract_objectives WHERE id = :objId`,
            { objId: obj.id } as any,
            { autoCommit: false },
          )
          await conn.commit()
          return NextResponse.json({ ok: true })
        }

        if (op === 'deleteInitiative') {
          const { objectiveIndex, initiativeIndex } = payload as {
            objectiveIndex?: number
            initiativeIndex?: number
          }
          if (
            typeof objectiveIndex !== 'number' ||
            typeof initiativeIndex !== 'number'
          ) {
            return NextResponse.json(
              { error: 'objectiveIndex and initiativeIndex are required' },
              { status: 400 },
            )
          }
          const obj = await resolveObjectiveIdByIndex(conn, id, objectiveIndex)
          if (!obj?.id) {
            return NextResponse.json(
              { error: 'Objective not found' },
              { status: 404 },
            )
          }
          const init = await resolveInitiativeIdByIndex(conn, obj.id, initiativeIndex)
          if (!init?.id) {
            return NextResponse.json(
              { error: 'Initiative not found' },
              { status: 404 },
            )
          }
          await conn.execute(
            `DELETE FROM measurable_activity_evidence WHERE activity_id IN (
              SELECT id FROM measurable_activities WHERE initiative_id = :initId
            )`,
            { initId: init.id } as any,
            { autoCommit: false },
          )
          await conn.execute(
            `DELETE FROM measurable_activities WHERE initiative_id = :initId`,
            { initId: init.id } as any,
            { autoCommit: false },
          )
          await conn.execute(
            `DELETE FROM contract_initiatives WHERE id = :initId`,
            { initId: init.id } as any,
            { autoCommit: false },
          )
          await conn.commit()
          return NextResponse.json({ ok: true })
        }

        if (op === 'addObjective') {
          const { code, title, order } = payload as {
            code?: string
            title?: string
            order?: number
          }
          if (!code || typeof code !== 'string') {
            return NextResponse.json({ error: 'code is required' }, { status: 400 })
          }
          const trimmedCode = code.trim()
          if (!/^\d+\.\d+$/.test(trimmedCode)) {
            return NextResponse.json(
              { error: 'code must match format 1.1, 1.2, 2.1' },
              { status: 400 },
            )
          }
          if (!title || typeof title !== 'string') {
            return NextResponse.json({ error: 'title is required' }, { status: 400 })
          }
          const existing = await conn.execute(
            `SELECT COUNT(*) AS "c" FROM contract_objectives WHERE contract_id = :id AND code = :code`,
            { id, code: trimmedCode } as any,
            { outFormat: oracledb.OUT_FORMAT_OBJECT },
          )
          const c = Number((existing.rows?.[0] as any)?.c ?? 0)
          if (c > 0) {
            return NextResponse.json(
              { error: `SSMARTA objective with code "${trimmedCode}" already exists` },
              { status: 409 },
            )
          }

          const orderNumber =
            typeof order === 'number'
              ? order
              : Number(
                  (((await conn.execute(
                    `SELECT NVL(MAX(objective_order), 0) + 1 AS "n" FROM contract_objectives WHERE contract_id = :id`,
                    { id } as any,
                    { outFormat: oracledb.OUT_FORMAT_OBJECT },
                  )).rows?.[0] as any)?.n ?? 1),
                )

          await conn.execute(
            `
              INSERT INTO contract_objectives (id, contract_id, objective_key, code, title, objective_order)
              VALUES (:id, :contract_id, :objective_key, :code, :title, :objective_order)
            `,
            {
              id: crypto.randomUUID(),
              contract_id: id,
              objective_key: crypto.randomUUID(),
              code: trimmedCode,
              title: title.trim(),
              objective_order: orderNumber,
            } as any,
            { autoCommit: true },
          )
          return NextResponse.json({ ok: true })
        }

        if (op === 'addInitiative') {
          const { objectiveIndex, code, title, order } = payload as {
            objectiveIndex?: number
            code?: string
            title?: string
            order?: number
          }
          if (
            typeof objectiveIndex !== 'number' ||
            !code ||
            typeof code !== 'string' ||
            !title ||
            typeof title !== 'string'
          ) {
            return NextResponse.json(
              { error: 'objectiveIndex, code, and title are required' },
              { status: 400 },
            )
          }
          const trimmedCode = code.trim()
          if (!/^\d+\.\d+\.\d+$/.test(trimmedCode)) {
            return NextResponse.json(
              { error: 'code must match format 1.1.1, 1.1.2' },
              { status: 400 },
            )
          }

          const obj = await resolveObjectiveIdByIndex(conn, id, objectiveIndex)
          if (!obj?.id) {
            return NextResponse.json(
              { error: 'Objective not found' },
              { status: 404 },
            )
          }
          const objectiveCode = obj.code?.trim() ?? String(objectiveIndex + 1)
          if (!initiativeCodeMatchesObjective(trimmedCode, objectiveCode)) {
            return NextResponse.json(
              {
                error: `Initiative code must start with "${objectiveCode}." (under this SSMARTA objective).`,
              },
              { status: 400 },
            )
          }
          const dupeRes = await conn.execute(
            `SELECT COUNT(*) AS "c" FROM contract_initiatives WHERE objective_id = :objective_id AND code = :code`,
            { objective_id: obj.id, code: trimmedCode } as any,
            { outFormat: oracledb.OUT_FORMAT_OBJECT },
          )
          const c = Number((dupeRes.rows?.[0] as any)?.c ?? 0)
          if (c > 0) {
            return NextResponse.json(
              { error: `Initiative with code "${trimmedCode}" already exists.` },
              { status: 409 },
            )
          }

          const orderNumber =
            typeof order === 'number'
              ? order
              : Number(
                  (((await conn.execute(
                    `SELECT NVL(MAX(initiative_order), 0) + 1 AS "n" FROM contract_initiatives WHERE objective_id = :objective_id`,
                    { objective_id: obj.id } as any,
                    { outFormat: oracledb.OUT_FORMAT_OBJECT },
                  )).rows?.[0] as any)?.n ?? 1),
                )

          await conn.execute(
            `
              INSERT INTO contract_initiatives (
                id, objective_id, initiative_key, code, title, initiative_order
              ) VALUES (
                :id, :objective_id, :initiative_key, :code, :title, :initiative_order
              )
            `,
            {
              id: crypto.randomUUID(),
              objective_id: obj.id,
              initiative_key: crypto.randomUUID(),
              code: trimmedCode,
              title: title.trim(),
              initiative_order: orderNumber,
            } as any,
            { autoCommit: true },
          )

          return NextResponse.json({ ok: true })
        }

        if (op === 'addMeasurableActivity') {
          const {
            objectiveIndex,
            initiativeIndex,
            activityType,
            title,
            aim,
            targetDate,
            order,
          } = payload as Record<string, unknown>
          if (
            typeof objectiveIndex !== 'number' ||
            typeof initiativeIndex !== 'number' ||
            !title ||
            typeof title !== 'string' ||
            !['kpi', 'cross-cutting'].includes(String(activityType))
          ) {
            return NextResponse.json(
              {
                error:
                  'objectiveIndex, initiativeIndex, title, and activityType (kpi|cross-cutting) are required',
              },
              { status: 400 },
            )
          }
          const obj = await resolveObjectiveIdByIndex(conn, id, objectiveIndex)
          if (!obj?.id) {
            return NextResponse.json(
              { error: 'Objective not found' },
              { status: 404 },
            )
          }
          const init = await resolveInitiativeIdByIndex(
            conn,
            obj.id,
            initiativeIndex,
          )
          if (!init?.id) {
            return NextResponse.json(
              { error: 'Initiative not found' },
              { status: 404 },
            )
          }

          const td =
            typeof targetDate === 'string' && targetDate
              ? new Date(`${targetDate}T00:00:00.000Z`)
              : null

          await conn.execute(
            `
              INSERT INTO measurable_activities (
                id, initiative_id, activity_key, activity_type, title, aim,
                target_date, activity_order, status, reporting_frequency
              ) VALUES (
                :id, :initiative_id, :activity_key, :activity_type, :title, :aim,
                :target_date, :activity_order, :status, :reporting_frequency
              )
            `,
            {
              id: crypto.randomUUID(),
              initiative_id: init.id,
              activity_key: crypto.randomUUID(),
              activity_type: String(activityType),
              title: title.trim(),
              aim:
                String(activityType) === 'kpi' && typeof aim === 'string' && aim.trim()
                  ? aim.trim()
                  : null,
              target_date: td,
              activity_order: typeof order === 'number' ? order : null,
              status: 'not_started',
              reporting_frequency: 'monthly',
            } as any,
            { autoCommit: true },
          )
          return NextResponse.json({ ok: true })
        }

        if (op === 'updateObjective') {
          const { objectiveIndex, code, title } = payload as Record<string, unknown>
          if (typeof objectiveIndex !== 'number') {
            return NextResponse.json(
              { error: 'objectiveIndex is required' },
              { status: 400 },
            )
          }

          const obj = await resolveObjectiveIdByIndex(conn, id, objectiveIndex)
          if (!obj?.id) {
            return NextResponse.json(
              { error: 'Objective not found' },
              { status: 404 },
            )
          }

          const setObjective: any = {}
          const setObjectiveSql: string[] = []

          if (code !== undefined) {
            if (typeof code !== 'string') {
              return NextResponse.json(
                { error: 'code must be a string' },
                { status: 400 },
              )
            }
            const trimmedCode = code.trim()
            if (!/^\d+\.\d+$/.test(trimmedCode)) {
              return NextResponse.json(
                { error: 'code must match format 1.1, 1.2, 2.1' },
                { status: 400 },
              )
            }

            const dupeRes = await conn.execute(
              `SELECT COUNT(*) AS "c" FROM contract_objectives WHERE contract_id = :contractId AND code = :code AND id != :id`,
              { contractId: id, code: trimmedCode, id: obj.id } as any,
              { outFormat: oracledb.OUT_FORMAT_OBJECT },
            )
            const dupe = Number((dupeRes.rows?.[0] as any)?.c ?? 0)
            if (dupe > 0) {
              return NextResponse.json(
                { error: `SSMARTA objective with code "${trimmedCode}" already exists` },
                { status: 409 },
              )
            }

            const initiativesRes = await conn.execute(
              `SELECT id AS "id", code AS "code" FROM contract_initiatives WHERE objective_id = :id ORDER BY initiative_order ASC, code NULLS LAST, id`,
              { id: obj.id } as any,
              { outFormat: oracledb.OUT_FORMAT_OBJECT },
            )
            const initiatives = (initiativesRes.rows ?? []) as Array<{
              id: string
              code: string | null
            }>
            const oldObjectiveCode =
              (obj.code?.trim() ?? '') || String(objectiveIndex + 1)
            if (trimmedCode !== oldObjectiveCode) {
              const remapped = initiatives.map(init =>
                remapInitiativeCodeForObjectiveRename(
                  init.code ?? '',
                  oldObjectiveCode,
                  trimmedCode,
                ),
              )
              const dupMsg = duplicateAmongStrings(remapped)
              if (dupMsg) {
                return NextResponse.json({ error: dupMsg }, { status: 409 })
              }
              for (let j = 0; j < initiatives.length; j++) {
                if (remapped[j] && remapped[j] !== (initiatives[j].code ?? '')) {
                  await conn.execute(
                    `UPDATE contract_initiatives SET code = :code WHERE id = :id`,
                    { code: remapped[j], id: initiatives[j].id } as any,
                    { autoCommit: false },
                  )
                }
              }
            }

            setObjectiveSql.push('code = :code')
            setObjective.code = trimmedCode
          }

          if (title !== undefined) {
            if (typeof title !== 'string' || !title.trim()) {
              return NextResponse.json(
                { error: 'title must be a non-empty string' },
                { status: 400 },
              )
            }
            setObjectiveSql.push('title = :title')
            setObjective.title = title.trim()
          }

          if (setObjectiveSql.length) {
            await conn.execute(
              `UPDATE contract_objectives SET ${setObjectiveSql.join(', ')} WHERE id = :id`,
              { ...setObjective, id: obj.id } as any,
              { autoCommit: false },
            )
          }

          await conn.commit()
          return NextResponse.json({ ok: true })
        }

        if (op === 'updateInitiative') {
          const { objectiveIndex, initiativeIndex, code, title } = payload as Record<
            string,
            unknown
          >
          if (
            typeof objectiveIndex !== 'number' ||
            typeof initiativeIndex !== 'number'
          ) {
            return NextResponse.json(
              { error: 'objectiveIndex and initiativeIndex are required' },
              { status: 400 },
            )
          }

          const obj = await resolveObjectiveIdByIndex(conn, id, objectiveIndex)
          if (!obj?.id) {
            return NextResponse.json(
              { error: 'Objective not found' },
              { status: 404 },
            )
          }
          const init = await resolveInitiativeIdByIndex(conn, obj.id, initiativeIndex)
          if (!init?.id) {
            return NextResponse.json(
              { error: 'Initiative not found' },
              { status: 404 },
            )
          }

          const setSql: string[] = []
          const binds: any = { id: init.id }

          if (code !== undefined) {
            if (typeof code !== 'string') {
              return NextResponse.json(
                { error: 'code must be a string' },
                { status: 400 },
              )
            }
            const trimmedCode = code.trim()
            if (!/^\d+\.\d+\.\d+$/.test(trimmedCode)) {
              return NextResponse.json(
                { error: 'code must match format 1.1.1, 1.1.2, 1.1.3' },
                { status: 400 },
              )
            }
            const objectiveCode =
              obj.code?.trim() ?? String(objectiveIndex + 1)
            if (!initiativeCodeMatchesObjective(trimmedCode, objectiveCode)) {
              return NextResponse.json(
                {
                  error: `Initiative code must nest under this objective (e.g. "${objectiveCode}.1"), not another branch.`,
                },
                { status: 400 },
              )
            }
            const dupeRes = await conn.execute(
              `SELECT COUNT(*) AS "c" FROM contract_initiatives WHERE objective_id = :objId AND code = :code AND id != :id`,
              { objId: obj.id, code: trimmedCode, id: init.id } as any,
              { outFormat: oracledb.OUT_FORMAT_OBJECT },
            )
            const dupe = Number((dupeRes.rows?.[0] as any)?.c ?? 0)
            if (dupe > 0) {
              return NextResponse.json(
                { error: `Initiative with code "${trimmedCode}" already exists.` },
                { status: 409 },
              )
            }
            setSql.push('code = :code')
            binds.code = trimmedCode
          }

          if (title !== undefined) {
            if (typeof title !== 'string' || !title.trim()) {
              return NextResponse.json(
                { error: 'title must be a non-empty string' },
                { status: 400 },
              )
            }
            setSql.push('title = :title')
            binds.title = title.trim()
          }

          if (setSql.length) {
            await conn.execute(
              `UPDATE contract_initiatives SET ${setSql.join(', ')} WHERE id = :id`,
              binds,
              { autoCommit: true },
            )
          }
          return NextResponse.json({ ok: true })
        }

        if (op === 'updateActivity') {
          const {
            objectiveIndex,
            initiativeIndex,
            activityIndex,
            title,
            aim,
            targetDate,
            status,
            reportingFrequency,
          } = payload as Record<string, unknown>

          if (
            typeof objectiveIndex !== 'number' ||
            typeof initiativeIndex !== 'number' ||
            typeof activityIndex !== 'number'
          ) {
            return NextResponse.json(
              {
                error:
                  'objectiveIndex, initiativeIndex, and activityIndex are required',
              },
              { status: 400 },
            )
          }

          const obj = await resolveObjectiveIdByIndex(conn, id, objectiveIndex)
          if (!obj?.id) {
            return NextResponse.json(
              { error: 'Objective not found' },
              { status: 404 },
            )
          }
          const init = await resolveInitiativeIdByIndex(conn, obj.id, initiativeIndex)
          if (!init?.id) {
            return NextResponse.json(
              { error: 'Initiative not found' },
              { status: 404 },
            )
          }
          const activityId = await resolveActivityIdByIndex(
            conn,
            init.id,
            activityIndex,
          )
          if (!activityId) {
            return NextResponse.json(
              { error: 'Activity not found' },
              { status: 404 },
            )
          }

          const sets: string[] = []
          const binds: any = { id: activityId }

          if (title !== undefined && typeof title === 'string') {
            sets.push('title = :title')
            binds.title = title.trim()
          }
          if (aim !== undefined) {
            sets.push('aim = :aim')
            binds.aim = typeof aim === 'string' ? aim.trim() : null
          }
          if (targetDate !== undefined) {
            sets.push('target_date = :target_date')
            binds.target_date =
              typeof targetDate === 'string' && targetDate
                ? new Date(`${targetDate}T00:00:00.000Z`)
                : null
          }
          if (
            status !== undefined &&
            ['not_started', 'in_progress', 'completed'].includes(String(status))
          ) {
            sets.push('status = :status')
            binds.status = String(status)
          }
          if (
            reportingFrequency !== undefined &&
            ['weekly', 'monthly', 'quarterly', 'n/a'].includes(
              String(reportingFrequency),
            )
          ) {
            sets.push('reporting_frequency = :reporting_frequency')
            binds.reporting_frequency = String(reportingFrequency)
          }

          if (sets.length) {
            await conn.execute(
              `UPDATE measurable_activities SET ${sets.join(', ')} WHERE id = :id`,
              binds,
              { autoCommit: true },
            )
          }

          return NextResponse.json({ ok: true })
        }

        if (op === 'updateActivityTasks') {
          const { objectiveIndex, initiativeIndex, activityIndex, tasks } =
            payload as {
              objectiveIndex?: number
              initiativeIndex?: number
              activityIndex?: number
              tasks?: unknown
            }

          if (
            typeof objectiveIndex !== 'number' ||
            typeof initiativeIndex !== 'number' ||
            typeof activityIndex !== 'number' ||
            !Array.isArray(tasks)
          ) {
            return NextResponse.json(
              {
                error:
                  'objectiveIndex, initiativeIndex, activityIndex, and tasks (array) are required',
              },
              { status: 400 },
            )
          }

          const obj = await resolveObjectiveIdByIndex(conn, id, objectiveIndex)
          if (!obj?.id) {
            return NextResponse.json(
              { error: 'Objective not found' },
              { status: 404 },
            )
          }
          const init = await resolveInitiativeIdByIndex(conn, obj.id, initiativeIndex)
          if (!init?.id) {
            return NextResponse.json(
              { error: 'Initiative not found' },
              { status: 404 },
            )
          }
          const activityId = await resolveActivityIdByIndex(
            conn,
            init.id,
            activityIndex,
          )
          if (!activityId) {
            return NextResponse.json(
              { error: 'Activity not found' },
              { status: 404 },
            )
          }

          // Prevent deletion of tasks that already have submitted work.
          const existing = await conn.execute(
            `
              SELECT
                t.task_key AS "task_key",
                CASE
                  WHEN t.status IS NOT NULL
                    AND t.status NOT IN ('to_do', 'not_started') THEN 1
                  WHEN EXISTS (SELECT 1 FROM activity_task_inputs i WHERE i.task_id = t.id) THEN 1
                  WHEN EXISTS (SELECT 1 FROM activity_task_deliverables d WHERE d.task_id = t.id) THEN 1
                  WHEN EXISTS (
                    SELECT 1 FROM activity_task_review_thread rt
                    WHERE rt.task_id = t.id
                      AND (
                        rt.asset_id IS NOT NULL
                        OR (rt.message IS NOT NULL AND LENGTH(TRIM(rt.message)) > 0)
                        OR (rt.action IS NOT NULL AND LENGTH(TRIM(rt.action)) > 0)
                      )
                  ) THEN 1
                  WHEN EXISTS (
                    SELECT 1 FROM activity_task_period_deliverables pd
                    WHERE pd.period_id IN (SELECT id FROM activity_task_periods p WHERE p.task_id = t.id)
                  ) THEN 1
                  WHEN EXISTS (
                    SELECT 1 FROM activity_task_period_review_thread prt
                    WHERE prt.period_id IN (SELECT id FROM activity_task_periods p WHERE p.task_id = t.id)
                      AND (
                        prt.asset_id IS NOT NULL
                        OR (prt.message IS NOT NULL AND LENGTH(TRIM(prt.message)) > 0)
                        OR (prt.action IS NOT NULL AND LENGTH(TRIM(prt.action)) > 0)
                      )
                  ) THEN 1
                  WHEN EXISTS (
                    SELECT 1 FROM activity_task_periods p
                    WHERE p.task_id = t.id
                      AND (
                        (p.submitted_at IS NOT NULL)
                        OR (p.status IS NOT NULL AND p.status <> 'pending')
                      )
                  ) THEN 1
                  ELSE 0
                END AS "has_work"
              FROM activity_tasks t
              WHERE t.activity_id = :activityId
            `,
            { activityId } as any,
          )
          const existingRows = (existing.rows ?? []) as Array<{
            task_key: string
            has_work: number
          }>

          const incomingKeys = new Set<string>()
          for (const t of tasks as any[]) {
            const k =
              typeof t === 'string'
                ? null
                : typeof t?._key === 'string'
                  ? t._key
                  : null
            if (k) incomingKeys.add(k)
          }
          const deletedWithWork = existingRows.find(
            r => r.has_work === 1 && r.task_key && !incomingKeys.has(r.task_key),
          )
          if (deletedWithWork) {
            return NextResponse.json(
              { error: 'Tasks with submitted work cannot be deleted' },
              { status: 409 },
            )
          }

          // Delete existing task subtree for this activity.
          await conn.execute(
            `DELETE FROM activity_task_period_review_thread WHERE period_id IN (
              SELECT id FROM activity_task_periods WHERE task_id IN (
                SELECT id FROM activity_tasks WHERE activity_id = :activityId
              )
            )`,
            { activityId } as any,
            { autoCommit: false },
          )
          await conn.execute(
            `DELETE FROM activity_task_period_deliverables WHERE period_id IN (
              SELECT id FROM activity_task_periods WHERE task_id IN (
                SELECT id FROM activity_tasks WHERE activity_id = :activityId
              )
            )`,
            { activityId } as any,
            { autoCommit: false },
          )
          await conn.execute(
            `DELETE FROM activity_task_periods WHERE task_id IN (
              SELECT id FROM activity_tasks WHERE activity_id = :activityId
            )`,
            { activityId } as any,
            { autoCommit: false },
          )
          await conn.execute(
            `DELETE FROM activity_task_review_thread WHERE task_id IN (
              SELECT id FROM activity_tasks WHERE activity_id = :activityId
            )`,
            { activityId } as any,
            { autoCommit: false },
          )
          await conn.execute(
            `DELETE FROM activity_task_deliverables WHERE task_id IN (
              SELECT id FROM activity_tasks WHERE activity_id = :activityId
            )`,
            { activityId } as any,
            { autoCommit: false },
          )
          await conn.execute(
            `DELETE FROM activity_task_inputs WHERE task_id IN (
              SELECT id FROM activity_tasks WHERE activity_id = :activityId
            )`,
            { activityId } as any,
            { autoCommit: false },
          )
          await conn.execute(
            `DELETE FROM activity_tasks WHERE activity_id = :activityId`,
            { activityId } as any,
            { autoCommit: false },
          )

          const insertThread = async (
            taskId: string,
            kind: 'inputs' | 'deliverable',
            entry: any,
          ) => {
            const assetId = entry?.file?.asset?._ref ?? entry?.file?.asset?._id
            const authorId =
              typeof entry?.author === 'string'
                ? entry.author
                : typeof entry?.author?._id === 'string'
                  ? entry.author._id
                  : null
            await conn.execute(
              `
                INSERT INTO activity_task_review_thread (
                  id, task_id, thread_key, thread_kind,
                  author_staff_id, role, action, message, created_at, asset_id
                ) VALUES (
                  :id, :task_id, :thread_key, :thread_kind,
                  :author_staff_id, :role, :action, :message, :created_at, :asset_id
                )
              `,
              {
                id: crypto.randomUUID(),
                task_id: taskId,
                thread_key:
                  typeof entry?._key === 'string' ? entry._key : crypto.randomUUID(),
                thread_kind: kind,
                author_staff_id: authorId,
                role: typeof entry?.role === 'string' ? entry.role : null,
                action: typeof entry?.action === 'string' ? entry.action : null,
                message: typeof entry?.message === 'string' ? entry.message : null,
                created_at: entry?.createdAt
                  ? new Date(String(entry.createdAt))
                  : new Date(),
                asset_id: typeof assetId === 'string' ? assetId : null,
              } as any,
              { autoCommit: false },
            )
          }

          for (let i = 0; i < tasks.length; i++) {
            const t = tasks[i] as any
            const isString = typeof t === 'string'
            const taskKey =
              (typeof t?._key === 'string' && t._key) ||
              (isString
                ? `task-${i}-${crypto.randomUUID().slice(0, 8)}`
                : crypto.randomUUID())
            const taskText = isString
              ? String(t).trim()
              : String(t?.task ?? '').trim()
            const priority =
              typeof t?.priority === 'string' ? String(t.priority) : 'medium'
            const status =
              typeof t?.status === 'string' ? String(t.status) : 'to_do'
            const assigneeStaffId =
              typeof t?.assignee === 'string'
                ? t.assignee
                : typeof t?.assignee?._id === 'string'
                  ? t.assignee._id
                  : null

            const taskId = crypto.randomUUID()
            await conn.execute(
              `
                INSERT INTO activity_tasks (
                  id, activity_id, task_key, task_text, task_order,
                  priority, status, assignee_staff_id,
                  target_date, reporting_frequency, reporting_period_start, expected_deliverable
                ) VALUES (
                  :id, :activity_id, :task_key, :task_text, :task_order,
                  :priority, :status, :assignee_staff_id,
                  :target_date, :reporting_frequency, :reporting_period_start, :expected_deliverable
                )
              `,
              {
                id: taskId,
                activity_id: activityId,
                task_key: taskKey,
                task_text: taskText,
                task_order: i,
                priority,
                status,
                assignee_staff_id: assigneeStaffId,
                target_date: parseDateOrNull(t?.targetDate),
                reporting_frequency:
                  typeof t?.reportingFrequency === 'string'
                    ? t.reportingFrequency
                    : 'n/a',
                reporting_period_start: parseDateOrNull(t?.reportingPeriodStart),
                expected_deliverable:
                  typeof t?.expectedDeliverable === 'string'
                    ? t.expectedDeliverable
                    : null,
              } as any,
              { autoCommit: false },
            )

            const inputsAssetId =
              t?.inputs?.file?.asset?._ref ??
              t?.inputs?.file?.asset?._id ??
              t?.inputs?.file?.asset?.id
            if (typeof inputsAssetId === 'string' && inputsAssetId) {
              await conn.execute(
                `
                  INSERT INTO activity_task_inputs (id, task_id, asset_id, submitted_at)
                  VALUES (:id, :task_id, :asset_id, :submitted_at)
                `,
                {
                  id: crypto.randomUUID(),
                  task_id: taskId,
                  asset_id: inputsAssetId,
                  submitted_at: t?.inputs?.submittedAt
                    ? new Date(String(t.inputs.submittedAt))
                    : new Date(),
                } as any,
                { autoCommit: false },
              )
            }

            if (Array.isArray(t?.inputsReviewThread)) {
              for (const entry of t.inputsReviewThread) {
                // eslint-disable-next-line no-await-in-loop
                await insertThread(taskId, 'inputs', entry)
              }
            }
            if (Array.isArray(t?.deliverableReviewThread)) {
              for (const entry of t.deliverableReviewThread) {
                // eslint-disable-next-line no-await-in-loop
                await insertThread(taskId, 'deliverable', entry)
              }
            }

            if (Array.isArray(t?.deliverable)) {
              for (const d of t.deliverable) {
                const assetId = d?.file?.asset?._ref ?? d?.file?.asset?._id
                if (typeof assetId !== 'string' || !assetId) continue
                // eslint-disable-next-line no-await-in-loop
                await conn.execute(
                  `
                    INSERT INTO activity_task_deliverables (
                      id, task_id, deliverable_key, asset_id, tag, locked
                    ) VALUES (
                      :id, :task_id, :deliverable_key, :asset_id, :tag, :locked
                    )
                  `,
                  {
                    id: crypto.randomUUID(),
                    task_id: taskId,
                    deliverable_key:
                      typeof d?._key === 'string' ? d._key : crypto.randomUUID(),
                    asset_id: assetId,
                    tag: d?.tag === 'main' ? 'main' : 'support',
                    locked: d?.locked ? 1 : 0,
                  } as any,
                  { autoCommit: false },
                )
              }
            }

            if (Array.isArray(t?.periodDeliverables)) {
              for (const pd of t.periodDeliverables) {
                const periodId = crypto.randomUUID()
                await conn.execute(
                  `
                    INSERT INTO activity_task_periods (id, task_id, period_key, status, submitted_at)
                    VALUES (:id, :task_id, :period_key, :status, :submitted_at)
                  `,
                  {
                    id: periodId,
                    task_id: taskId,
                    period_key:
                      typeof pd?.periodKey === 'string'
                        ? pd.periodKey
                        : crypto.randomUUID(),
                    status: typeof pd?.status === 'string' ? pd.status : 'pending',
                    submitted_at: pd?.submittedAt
                      ? new Date(String(pd.submittedAt))
                      : null,
                  } as any,
                  { autoCommit: false },
                )

                if (Array.isArray(pd?.deliverable)) {
                  for (const d of pd.deliverable) {
                    const assetId = d?.file?.asset?._ref ?? d?.file?.asset?._id
                    if (typeof assetId !== 'string' || !assetId) continue
                    // eslint-disable-next-line no-await-in-loop
                    await conn.execute(
                      `
                        INSERT INTO activity_task_period_deliverables (
                          id, period_id, deliverable_key, asset_id, tag, locked
                        ) VALUES (
                          :id, :period_id, :deliverable_key, :asset_id, :tag, :locked
                        )
                      `,
                      {
                        id: crypto.randomUUID(),
                        period_id: periodId,
                        deliverable_key:
                          typeof d?._key === 'string' ? d._key : crypto.randomUUID(),
                        asset_id: assetId,
                        tag: d?.tag === 'main' ? 'main' : 'support',
                        locked: d?.locked ? 1 : 0,
                      } as any,
                      { autoCommit: false },
                    )
                  }
                }

                if (Array.isArray(pd?.deliverableReviewThread)) {
                  for (const entry of pd.deliverableReviewThread) {
                    const assetId =
                      entry?.file?.asset?._ref ?? entry?.file?.asset?._id
                    const authorId =
                      typeof entry?.author === 'string'
                        ? entry.author
                        : typeof entry?.author?._id === 'string'
                          ? entry.author._id
                          : null
                    // eslint-disable-next-line no-await-in-loop
                    await conn.execute(
                      `
                        INSERT INTO activity_task_period_review_thread (
                          id, period_id, thread_key, author_staff_id, role, action,
                          message, created_at, asset_id
                        ) VALUES (
                          :id, :period_id, :thread_key, :author_staff_id, :role, :action,
                          :message, :created_at, :asset_id
                        )
                      `,
                      {
                        id: crypto.randomUUID(),
                        period_id: periodId,
                        thread_key:
                          typeof entry?._key === 'string'
                            ? entry._key
                            : crypto.randomUUID(),
                        author_staff_id: authorId,
                        role: typeof entry?.role === 'string' ? entry.role : null,
                        action:
                          typeof entry?.action === 'string' ? entry.action : null,
                        message:
                          typeof entry?.message === 'string' ? entry.message : null,
                        created_at: entry?.createdAt
                          ? new Date(String(entry.createdAt))
                          : new Date(),
                        asset_id: typeof assetId === 'string' ? assetId : null,
                      } as any,
                      { autoCommit: false },
                    )
                  }
                }
              }
            }
          }

          await conn.commit()
          return NextResponse.json({ ok: true })
        }

        return NextResponse.json({ error: 'Unknown op' }, { status: 400 })
      })
    }

    if (op === 'updateObjective') {
      const { objectiveIndex, code, title } = payload
      if (typeof objectiveIndex !== 'number') {
        return NextResponse.json(
          { error: 'objectiveIndex is required' },
          { status: 400 },
        )
      }

      const setPayload: Record<string, unknown> = {}

      if (code !== undefined) {
        if (typeof code !== 'string') {
          return NextResponse.json(
            { error: 'code must be a string' },
            { status: 400 },
          )
        }
        const trimmedCode = code.trim()
        if (!/^\d+\.\d+$/.test(trimmedCode)) {
          return NextResponse.json(
            { error: 'code must match format 1.1, 1.2, 2.1' },
            { status: 400 },
          )
        }

        const contract = await writeClient.fetch<{
          objectives?: {
            code?: string
            initiatives?: { code?: string }[]
          }[]
        }>(
          `*[_id == $id][0]{ objectives[] { code, initiatives[] { code } } }`,
          { id },
        )
        const objectives = contract?.objectives ?? []
        const currentObjective = objectives[objectiveIndex]
        const currentCode = currentObjective?.code?.trim() ?? ''
        const objectiveCodeInUseElsewhere = objectives.some(
          (o, i) =>
            i !== objectiveIndex && (o.code?.trim() ?? '') === trimmedCode,
        )
        if (trimmedCode !== currentCode && objectiveCodeInUseElsewhere) {
          return NextResponse.json(
            {
              error: `SSMARTA objective with code "${trimmedCode}" already exists`,
            },
            { status: 409 },
          )
        }

        const oldObjectiveCode =
          currentCode || String(objectiveIndex + 1)
        const initiatives = currentObjective?.initiatives ?? []

        if (trimmedCode !== oldObjectiveCode) {
          const remapped = initiatives.map(init =>
            remapInitiativeCodeForObjectiveRename(
              init.code ?? '',
              oldObjectiveCode,
              trimmedCode,
            ),
          )

          const allInitiativeCodesAfter: string[] = []
          for (let oi = 0; oi < objectives.length; oi++) {
            const inits = objectives[oi].initiatives ?? []
            for (let ii = 0; ii < inits.length; ii++) {
              if (oi === objectiveIndex) {
                allInitiativeCodesAfter.push(remapped[ii] ?? '')
              } else {
                allInitiativeCodesAfter.push(inits[ii].code?.trim() ?? '')
              }
            }
          }
          const dupMsg = duplicateAmongStrings(allInitiativeCodesAfter)
          if (dupMsg) {
            return NextResponse.json({ error: dupMsg }, { status: 409 })
          }

          for (let j = 0; j < remapped.length; j++) {
            const prev = initiatives[j]?.code?.trim() ?? ''
            if (remapped[j] !== prev) {
              setPayload[
                `objectives[${objectiveIndex}].initiatives[${j}].code`
              ] = remapped[j]
            }
          }
        }

        setPayload[`objectives[${objectiveIndex}].code`] = trimmedCode
      }

      if (title !== undefined) {
        if (typeof title !== 'string' || !title.trim()) {
          return NextResponse.json(
            { error: 'title must be a non-empty string' },
            { status: 400 },
          )
        }
        setPayload[`objectives[${objectiveIndex}].title`] = title.trim()
      }

      if (Object.keys(setPayload).length > 0) {
        await writeClient.patch(id).set(setPayload).commit()
      }
      return NextResponse.json({ ok: true })
    }

    if (op === 'updateInitiative') {
      const { objectiveIndex, initiativeIndex, code, title } = payload
      if (
        typeof objectiveIndex !== 'number' ||
        typeof initiativeIndex !== 'number'
      ) {
        return NextResponse.json(
          { error: 'objectiveIndex and initiativeIndex are required' },
          { status: 400 },
        )
      }

      const setPayload: Record<string, unknown> = {}

      if (code !== undefined) {
        if (typeof code !== 'string') {
          return NextResponse.json(
            { error: 'code must be a string' },
            { status: 400 },
          )
        }
        const trimmedCode = code.trim()
        if (!/^\d+\.\d+\.\d+$/.test(trimmedCode)) {
          return NextResponse.json(
            { error: 'code must match format 1.1.1, 1.1.2, 1.1.3' },
            { status: 400 },
          )
        }

        const contract = await writeClient.fetch<{
          objectiveCode?: string
          initiatives?: { code?: string }[]
        }>(
          `*[_id == $id][0]{ "objectiveCode": objectives[$objIdx].code, "initiatives": objectives[$objIdx].initiatives[] { code } }`,
          { id, objIdx: objectiveIndex },
        )
        const objectiveCode =
          contract?.objectiveCode?.trim() ?? String(objectiveIndex + 1)
        if (!initiativeCodeMatchesObjective(trimmedCode, objectiveCode)) {
          return NextResponse.json(
            {
              error: `Initiative code must nest under this objective (e.g. "${objectiveCode}.1"), not another branch.`,
            },
            { status: 400 },
          )
        }

        const initiatives = contract?.initiatives ?? []
        const existingCodes = initiatives.map(i => i.code?.trim()).filter(Boolean)
        const currentCode = existingCodes[initiativeIndex] ?? null
        if (
          trimmedCode !== (currentCode ?? '').trim() &&
          existingCodes.includes(trimmedCode)
        ) {
          return NextResponse.json(
            { error: `Initiative with code "${trimmedCode}" already exists.` },
            { status: 409 },
          )
        }

        setPayload[
          `objectives[${objectiveIndex}].initiatives[${initiativeIndex}].code`
        ] = trimmedCode
      }

      if (title !== undefined) {
        if (typeof title !== 'string' || !title.trim()) {
          return NextResponse.json(
            { error: 'title must be a non-empty string' },
            { status: 400 },
          )
        }
        setPayload[
          `objectives[${objectiveIndex}].initiatives[${initiativeIndex}].title`
        ] = title.trim()
      }

      if (Object.keys(setPayload).length > 0) {
        await writeClient.patch(id).set(setPayload).commit()
      }
      return NextResponse.json({ ok: true })
    }

    if (op === 'deleteObjective') {
      const { objectiveIndex } = payload
      if (typeof objectiveIndex !== 'number') {
        return NextResponse.json(
          { error: 'objectiveIndex is required' },
          { status: 400 },
        )
      }
      await writeClient.patch(id).unset([`objectives[${objectiveIndex}]`]).commit()
      return NextResponse.json({ ok: true })
    }

    if (op === 'deleteInitiative') {
      const { objectiveIndex, initiativeIndex } = payload
      if (
        typeof objectiveIndex !== 'number' ||
        typeof initiativeIndex !== 'number'
      ) {
        return NextResponse.json(
          { error: 'objectiveIndex and initiativeIndex are required' },
          { status: 400 },
        )
      }
      await writeClient
        .patch(id)
        .unset([
          `objectives[${objectiveIndex}].initiatives[${initiativeIndex}]`,
        ])
        .commit()
      return NextResponse.json({ ok: true })
    }

    if (op === 'addObjective') {
      const { code, title, order } = payload
      if (!code || typeof code !== 'string') {
        return NextResponse.json({ error: 'code is required' }, { status: 400 })
      }
      const trimmedCode = code.trim()
      if (!/^\d+\.\d+$/.test(trimmedCode)) {
        return NextResponse.json(
          { error: 'code must match format 1.1, 1.2, 2.1' },
          { status: 400 },
        )
      }
      if (!title || typeof title !== 'string') {
        return NextResponse.json(
          { error: 'title is required' },
          { status: 400 },
        )
      }
      const contract = await writeClient.fetch<{
        objectives?: { code?: string }[]
      }>(`*[_id == $id][0]{ objectives[] { code } }`, { id })
      const existingCodes = (contract?.objectives ?? [])
        .map(o => o.code?.trim())
        .filter(Boolean)
      if (existingCodes.includes(trimmedCode)) {
        return NextResponse.json(
          {
            error: `SSMARTA objective with code "${trimmedCode}" already exists`,
          },
          { status: 409 },
        )
      }
      await writeClient
        .patch(id)
        .setIfMissing({ objectives: [] })
        .append('objectives', [
          {
            _type: 'ssmartaObjective',
            _key: crypto.randomUUID(),
            code: code.trim(),
            title: title.trim(),
            order: typeof order === 'number' ? order : undefined,
            initiatives: [],
          },
        ])
        .commit()
      return NextResponse.json({ ok: true })
    }

    if (op === 'addInitiative') {
      const { objectiveIndex, code, title, order } = payload
      if (
        typeof objectiveIndex !== 'number' ||
        !code ||
        typeof code !== 'string' ||
        !title ||
        typeof title !== 'string'
      ) {
        return NextResponse.json(
          { error: 'objectiveIndex, code, and title are required' },
          { status: 400 },
        )
      }
      const trimmedCode = code.trim()
      if (!/^\d+\.\d+\.\d+$/.test(trimmedCode)) {
        return NextResponse.json(
          { error: 'code must match format 1.1.1, 1.1.2' },
          { status: 400 },
        )
      }
      const contract = await writeClient.fetch<{
        objectiveCode?: string
        initiatives?: { code?: string }[]
      }>(
        `*[_id == $id][0]{ "objectiveCode": objectives[$objIdx].code, "initiatives": objectives[$objIdx].initiatives[] { code } }`,
        { id, objIdx: objectiveIndex },
      )
      const objectiveCode =
        contract?.objectiveCode?.trim() ?? String(objectiveIndex + 1)
      if (!initiativeCodeMatchesObjective(trimmedCode, objectiveCode)) {
        return NextResponse.json(
          {
            error: `Initiative code must start with "${objectiveCode}." (under this SSMARTA objective).`,
          },
          { status: 400 },
        )
      }
      const initiatives = contract?.initiatives ?? []
      const existingCodes = initiatives.map(i => i.code?.trim()).filter(Boolean)
      if (existingCodes.includes(trimmedCode)) {
        return NextResponse.json(
          { error: `Initiative with code "${trimmedCode}" already exists.` },
          { status: 409 },
        )
      }
      await writeClient
        .patch(id)
        .setIfMissing({
          [`objectives[${objectiveIndex}].initiatives`]: [],
        })
        .append(`objectives[${objectiveIndex}].initiatives`, [
          {
            _type: 'contractInitiative',
            _key: crypto.randomUUID(),
            code: code.trim(),
            title: title.trim(),
            order: typeof order === 'number' ? order : undefined,
            measurableActivities: [],
          },
        ])
        .commit()
      return NextResponse.json({ ok: true })
    }

    if (op === 'addMeasurableActivity') {
      const {
        objectiveIndex,
        initiativeIndex,
        activityType,
        title,
        aim,
        targetDate,
        order,
      } = payload
      if (
        typeof objectiveIndex !== 'number' ||
        typeof initiativeIndex !== 'number' ||
        !title ||
        typeof title !== 'string' ||
        !['kpi', 'cross-cutting'].includes(activityType)
      ) {
        return NextResponse.json(
          {
            error:
              'objectiveIndex, initiativeIndex, title, and activityType (kpi|cross-cutting) are required',
          },
          { status: 400 },
        )
      }
      const path = `objectives[${objectiveIndex}].initiatives[${initiativeIndex}].measurableActivities`
      const doc: Record<string, unknown> = {
        _type: 'measurableActivity',
        _key: crypto.randomUUID(),
        activityType,
        title: title.trim(),
        order: typeof order === 'number' ? order : undefined,
        targetDate: targetDate || undefined,
        status: 'not_started',
        reportingFrequency: 'monthly',
      }
      if (activityType === 'kpi' && aim?.trim()) {
        doc.aim = aim.trim()
      }
      await writeClient
        .patch(id)
        .setIfMissing({ [path]: [] })
        .append(path, [doc])
        .commit()
      return NextResponse.json({ ok: true })
    }

    if (op === 'updateActivity') {
      const {
        objectiveIndex,
        initiativeIndex,
        activityIndex,
        title,
        aim,
        targetDate,
        status,
        reportingFrequency,
      } = payload
      if (
        typeof objectiveIndex !== 'number' ||
        typeof initiativeIndex !== 'number' ||
        typeof activityIndex !== 'number'
      ) {
        return NextResponse.json(
          {
            error:
              'objectiveIndex, initiativeIndex, and activityIndex are required',
          },
          { status: 400 },
        )
      }
      const basePath = `objectives[${objectiveIndex}].initiatives[${initiativeIndex}].measurableActivities[${activityIndex}]`
      const setPayload: Record<string, unknown> = {}
      if (title !== undefined && typeof title === 'string') {
        setPayload[`${basePath}.title`] = title.trim()
      }
      if (aim !== undefined) {
        setPayload[`${basePath}.aim`] =
          typeof aim === 'string' ? aim.trim() : undefined
      }
      if (targetDate !== undefined) {
        setPayload[`${basePath}.targetDate`] = targetDate || undefined
      }
      if (
        status !== undefined &&
        ['not_started', 'in_progress', 'completed'].includes(status)
      ) {
        setPayload[`${basePath}.status`] = status
      }
      if (
        reportingFrequency !== undefined &&
        ['weekly', 'monthly', 'quarterly', 'n/a'].includes(reportingFrequency)
      ) {
        setPayload[`${basePath}.reportingFrequency`] = reportingFrequency
      }
      if (Object.keys(setPayload).length > 0) {
        await writeClient.patch(id).set(setPayload).commit()
      }
      return NextResponse.json({ ok: true })
    }

    if (op === 'updateActivityTasks') {
      const { objectiveIndex, initiativeIndex, activityIndex, tasks } = payload
      if (
        typeof objectiveIndex !== 'number' ||
        typeof initiativeIndex !== 'number' ||
        typeof activityIndex !== 'number' ||
        !Array.isArray(tasks)
      ) {
        return NextResponse.json(
          {
            error:
              'objectiveIndex, initiativeIndex, activityIndex, and tasks (array) are required',
          },
          { status: 400 },
        )
      }
      const path = `objectives[${objectiveIndex}].initiatives[${initiativeIndex}].measurableActivities[${activityIndex}].tasks`
      const PRIORITIES = ['highest', 'high', 'medium', 'low', 'lowest']
      const TASK_STATUSES = [
        'to_do',
        'inputs_submitted',
        'in_progress',
        'delivered',
        'in_review',
        'done',
      ]
      const normalizedTasks = tasks
        .map((t: unknown, i: number) => {
        if (typeof t === 'string') {
          return {
            _type: 'detailedTask',
            _key: `task-${i}-${crypto.randomUUID().slice(0, 8)}`,
            task: t,
            priority: 'medium',
            status: 'not_started',
          }
        }
        if (t && typeof t === 'object' && 'task' in t) {
          const obj = t as {
            task: string
            priority?: string
            assignee?: string | null
            status?: string
              targetDate?: string
              reportingFrequency?: string
              reportingPeriodStart?: string
              expectedDeliverable?: string
              periodDeliverables?: Array<{
                _key?: string
                periodKey?: string
                status?: string
                submittedAt?: string
                deliverable?: Array<{
                  _key?: string
                  file?: { asset?: { _ref?: string; _id?: string } }
                  tag?: string
                  locked?: boolean
                }>
                deliverableReviewThread?: Array<{
                  _key?: string
                  author?: string | { _id?: string } | null
                  role?: string
                  action?: string
                  message?: string
                  createdAt?: string
                  file?: { asset?: { _ref?: string; _id?: string } }
                }>
              }>
              _key?: string
              inputs?: {
                file?: { asset?: { _ref?: string; _id?: string } }
                submittedAt?: string
              }
              inputsReviewThread?: Array<{
                _key?: string
                author?: string | null
                role?: string
                action?: string
                message?: string
                createdAt?: string
                file?: { asset?: { _ref?: string; _id?: string } }
              }>
              deliverableReviewThread?: Array<{
                _key?: string
                author?: string | null
                role?: string
                action?: string
                message?: string
                createdAt?: string
                file?: { asset?: { _ref?: string; _id?: string } }
              }>
              deliverable?: Array<{
              _key?: string
              file?: { asset?: { _ref?: string } }
              tag?: string
                locked?: boolean
            }>
          }
            const FREQ_VALUES = ['weekly', 'monthly', 'quarterly', 'n/a']
          const task: Record<string, unknown> = {
            _type: 'detailedTask',
            _key: obj._key ?? `task-${i}-${crypto.randomUUID().slice(0, 8)}`,
            task: String(obj.task || '').trim(),
              priority: PRIORITIES.includes(obj.priority || '')
                ? obj.priority
                : 'medium',
              status: TASK_STATUSES.includes(obj.status || '')
                ? obj.status
                : 'to_do',
            }
            if (typeof obj.targetDate === 'string') task.targetDate = obj.targetDate
            if (FREQ_VALUES.includes(obj.reportingFrequency || ''))
              task.reportingFrequency = obj.reportingFrequency
            if (typeof obj.reportingPeriodStart === 'string')
              task.reportingPeriodStart = obj.reportingPeriodStart
            if (typeof obj.expectedDeliverable === 'string')
              task.expectedDeliverable = obj.expectedDeliverable
            if (Array.isArray(obj.periodDeliverables))
              task.periodDeliverables = obj.periodDeliverables
            if (obj.inputs && typeof obj.inputs === 'object') {
              const assetRef =
                obj.inputs.file?.asset?._ref ?? obj.inputs.file?.asset?._id
              if (assetRef) {
                task.inputs = {
                  file: {
                    _type: 'file',
                    asset: { _type: 'reference', _ref: assetRef },
                  },
                  submittedAt: obj.inputs.submittedAt ?? new Date().toISOString(),
                }
              }
            }
            if (Array.isArray(obj.inputsReviewThread)) {
              task.inputsReviewThread = obj.inputsReviewThread
                .map(
                  (
                    entry: {
                      _key?: string
                      author?: string | null
                      role?: string
                      action?: string
                      message?: string
                      createdAt?: string
                      file?: { asset?: { _ref?: string; _id?: string } }
                    },
                    ei: number,
                  ) => {
                    if (!entry.action) return null
                    const assetRef =
                      entry.file?.asset?._ref ?? entry.file?.asset?._id
                    const authorRef =
                      typeof entry.author === 'string'
                        ? entry.author
                        : (entry.author as unknown as { _id?: string } | null)?._id
                    const out: Record<string, unknown> = {
                      _key: entry._key ?? `thread-${ei}-${crypto.randomUUID().slice(0, 8)}`,
                      author: authorRef
                        ? { _type: 'reference', _ref: authorRef }
                        : undefined,
                      role: ['officer', 'supervisor'].includes(entry.role || '')
                        ? entry.role
                        : undefined,
                      action: ['submit', 'reject', 'approve', 'respond'].includes(entry.action)
                        ? entry.action
                        : undefined,
                      message: typeof entry.message === 'string' ? entry.message : undefined,
                      createdAt: entry.createdAt ?? new Date().toISOString(),
                    }
                    if (assetRef) {
                      out.file = {
                        _type: 'file',
                        asset: { _type: 'reference', _ref: assetRef },
                      }
                    }
                    return out
                  },
                )
                .filter(Boolean)
            }
            if (Array.isArray(obj.deliverableReviewThread)) {
              task.deliverableReviewThread = obj.deliverableReviewThread
                .map(
                  (
                    entry: {
                      _key?: string
                      author?: string | null
                      role?: string
                      action?: string
                      message?: string
                      createdAt?: string
                      file?: { asset?: { _ref?: string; _id?: string } }
                    },
                    ei: number,
                  ) => {
                    if (!entry.action) return null
                    const assetRef =
                      entry.file?.asset?._ref ?? entry.file?.asset?._id
                    const authorRef =
                      typeof entry.author === 'string'
                        ? entry.author
                        : (entry.author as unknown as
                            | { _id?: string }
                            | null)?._id
                    const out: Record<string, unknown> = {
                      _key:
                        entry._key ??
                        `dr-thread-${ei}-${crypto.randomUUID().slice(0, 8)}`,
                      author: authorRef
                        ? { _type: 'reference', _ref: authorRef }
                        : undefined,
                      role: ['officer', 'supervisor'].includes(entry.role || '')
                        ? entry.role
                        : undefined,
                      action: ['submit', 'reject', 'approve', 'respond'].includes(
                        entry.action,
                      )
                        ? entry.action
                        : undefined,
                      message:
                        typeof entry.message === 'string'
                          ? entry.message
                          : undefined,
                      createdAt:
                        entry.createdAt ?? new Date().toISOString(),
                    }
                    if (assetRef) {
                      out.file = {
                        _type: 'file',
                        asset: { _type: 'reference', _ref: assetRef },
                      }
                    }
                    return out
                  },
                )
                .filter(Boolean)
          }
          if (obj.assignee && typeof obj.assignee === 'string') {
            task.assignee = { _type: 'reference', _ref: obj.assignee }
          }
            if (Array.isArray(obj.deliverable)) {
              task.deliverable = obj.deliverable
                .map(
                  (
                    ev: {
                      _key?: string
                      file?: { asset?: { _ref?: string } }
                      tag?: string
                      locked?: boolean
                    },
                    ei: number,
                  ) => {
                const assetRef = ev.file?.asset?._ref
                if (!assetRef) return null
                return {
                      _key:
                        ev._key ??
                        `ev-${ei}-${crypto.randomUUID().slice(0, 8)}`,
                  file: {
                    _type: 'file',
                    asset: { _type: 'reference', _ref: assetRef },
                  },
                  tag: ev.tag === 'main' ? 'main' : 'support',
                      locked: ev.locked === true,
                }
                  },
                )
              .filter(Boolean)
          }
          return task
        }
        return null
        })
        .filter(Boolean)
      await writeClient
        .patch(id)
        .set({ [path]: normalizedTasks })
        .commit()
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: 'Unknown op' }, { status: 400 })
  } catch (error) {
    console.error('Error patching section contract', error)
    return NextResponse.json(
      { error: 'Failed to update contract' },
      { status: 500 },
    )
  }
}
