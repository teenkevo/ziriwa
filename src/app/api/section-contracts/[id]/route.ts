import { NextRequest, NextResponse } from 'next/server'
import { writeClient } from '@/sanity/lib/write-client'

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
          objectives?: { code?: string }[]
        }>(`*[_id == $id][0]{ objectives[] { code } }`, { id })
        const existingCodes = (contract?.objectives ?? [])
          .map(o => o.code?.trim())
          .filter(Boolean)
        const currentCode = existingCodes[objectiveIndex] ?? null
        if (
          trimmedCode !== (currentCode ?? '').trim() &&
          existingCodes.includes(trimmedCode)
        ) {
          return NextResponse.json(
            {
              error: `SSMARTA objective with code "${trimmedCode}" already exists`,
            },
            { status: 409 },
          )
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
          initiatives?: { code?: string }[]
        }>(
          `*[_id == $id][0]{ "initiatives": objectives[$objIdx].initiatives[] { code } }`,
          { id, objIdx: objectiveIndex },
        )
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
        initiatives?: { code?: string }[]
      }>(
        `*[_id == $id][0]{ "initiatives": objectives[$objIdx].initiatives[] { code } }`,
        { id, objIdx: objectiveIndex },
      )
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
