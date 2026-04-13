import { NextRequest, NextResponse } from 'next/server'
import { auth, currentUser } from '@clerk/nextjs/server'
import { writeClient } from '@/sanity/lib/write-client'
import {
  sprintTaskHasRequiredLinks,
  validateSprintTaskPayload,
} from '@/lib/sprint-task-validation'
import { getSprintWeekStartLocal, isSprintWeekStarted } from '@/lib/sprint-week'
import { getAppRole } from '@/lib/clerk-app-role.server'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const body = await req.json()
    const { action } = body

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
