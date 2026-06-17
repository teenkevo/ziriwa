import { NextRequest, NextResponse } from 'next/server'
import { auth, currentUser } from '@clerk/nextjs/server'
import { writeClient } from '@/sanity/lib/write-client'
import {
  buildSprintTaskWriteFields,
  isEmergencySprintCategory,
  sprintTaskHasRequiredLinks,
  validateSprintTaskPayload,
} from '@/lib/sprint-task-validation'
import { getSprintWeekStartLocal, isSprintWeekStarted } from '@/lib/sprint-week'
import { assertAuth } from '@/lib/authz/guards.server'
import { canSubmitDetailedTaskWork } from '@/lib/section-access'
import { notifyManagerSprintPlanSubmittedEmail } from '@/lib/email/notify-manager-sprint-plan-submitted-email.server'
import { notifyOfficerWorkSubmissionOutcomeEmail } from '@/lib/email/notify-sprint-work-submission-outcome-email.server'
import { notifySupervisorSprintPlanReviewEmail } from '@/lib/email/notify-supervisor-sprint-plan-review-email.server'
import { notifySupervisorWorkSubmissionEmail } from '@/lib/email/notify-sprint-work-submission-email.server'
import { getRichTextPlainText } from '@/lib/rich-text'
import { getSprintTaskStatusLabel } from '@/lib/sprint-task-status'
import { audit } from '@/lib/audit-log/events'
import { isSectionInProject } from '@/lib/project-access.server'
import {
  assertSprintCreateAllowed,
  assertSprintManagerPlanReviewAllowed,
  assertSprintSupervisorPlanReviseAllowed,
  assertSprintSupervisorTaskUpdate,
  getSectionAccessForViewer,
  getSectionIdFromWeeklySprint,
  sectionAccessDenied,
} from '@/lib/section-access.server'
import {
  linkStakeholderEntryToWorkSubmission,
  resolveStakeholderIndexForSectionLink,
} from '@/lib/stakeholder-work-submission-link.server'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const body = await req.json()
    const { action } = body

    const authResult = await assertAuth()
    if (authResult instanceof NextResponse) return authResult

    const sectionId = await getSectionIdFromWeeklySprint(id)
    if (!sectionId) {
      return NextResponse.json({ error: 'Sprint not found' }, { status: 404 })
    }
    const access = await getSectionAccessForViewer(sectionId)
    const isProjectSection = await isSectionInProject(sectionId)

    if (action === 'submit' || action === 'update-draft-sprint') {
      const denied = assertSprintCreateAllowed(access)
      if (denied) return denied
    }

    if (action === 'submit') {
      const doc = await writeClient.getDocument(id)
      if (!doc || doc._type !== 'weeklySprint') {
        return NextResponse.json({ error: 'Sprint not found' }, { status: 404 })
      }
      const tasks = (doc.tasks as Array<Record<string, unknown>>) || []
      const invalid = tasks.some(
        t => !sprintTaskHasRequiredLinks(t, { isProjectSection }),
      )
      if (invalid) {
        return NextResponse.json(
          {
            error: isProjectSection
              ? 'Every task must have an activity category. Non-emergency tasks must also be linked to a contract initiative and measurable activity before marking as ready'
              : 'Every task must have an activity category. Non-emergency tasks must also be linked to a contract initiative and measurable activity before submitting',
          },
          { status: 400 },
        )
      }
      const reviewedAt = new Date().toISOString()
      const patch = writeClient.patch(id)

      if (isProjectSection) {
        const readyTasks = tasks.map(task => {
          if (task.status === 'accepted') return task
          return {
            ...task,
            status: 'accepted',
            reviewedAt,
            taskStatus: task.taskStatus ?? 'to_do',
            priority: task.priority ?? 'medium',
            revisionReason: '',
          }
        })
        patch.set({ status: 'reviewed', tasks: readyTasks })
      } else {
        patch.set({ status: 'submitted' })
      }

      await patch.commit()
      const submitMeta = await writeClient.fetch<{ weekLabel?: string } | null>(
        `*[_id == $id][0]{ weekLabel }`,
        { id },
      )
      if (isProjectSection) {
        audit.weeklySprint.updated(
          id,
          submitMeta?.weekLabel ?? 'Weekly sprint',
          'submit-ready',
          sectionId,
        )
      } else {
        audit.weeklySprint.submitted(
          id,
          submitMeta?.weekLabel ?? 'Weekly sprint',
          sectionId,
        )
        notifyManagerSprintPlanSubmittedEmail({ sprintId: id })
      }
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
        const err = validateSprintTaskPayload(t, { isProjectSection })
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
          initiativeKey?: string
          initiativeTitle?: string
          activityKey?: string
          activityTitle?: string
        }) => ({
          _type: 'sprintTask',
          _key: nextKey(t._key),
          ...buildSprintTaskWriteFields(t),
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

      audit.weeklySprint.updated(
        id,
        weekLabel,
        'update-draft-sprint',
        sectionId,
      )
      return NextResponse.json({ success: true })
    }

    if (action === 'review-task') {
      const reviewDenied = assertSprintManagerPlanReviewAllowed(access)
      if (reviewDenied) return reviewDenied

      const { taskKey, reviewStatus, revisionReason } = body

      if (!taskKey || !reviewStatus) {
        return NextResponse.json(
          { error: 'taskKey and reviewStatus are required' },
          { status: 400 },
        )
      }

      const validStatuses = [
        'accepted',
        'rejected',
        'revisions_requested',
        'pending',
      ]
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

      const currentTaskStatus = tasks[taskIndex]?.status
      if (
        reviewStatus === 'pending' &&
        currentTaskStatus !== 'revisions_requested'
      ) {
        return NextResponse.json(
          {
            error:
              'Only tasks with revisions requested can be returned to pending',
          },
          { status: 400 },
        )
      }

      const patchPath = `tasks[_key=="${taskKey}"]`
      const setFields: Record<string, unknown> = {
        [`${patchPath}.status`]: reviewStatus,
        [`${patchPath}.revisionReason`]:
          reviewStatus === 'revisions_requested' ? revisionReason.trim() : '',
      }

      if (reviewStatus !== 'pending') {
        setFields[`${patchPath}.reviewedAt`] = new Date().toISOString()
      }

      if (reviewStatus === 'accepted') {
        setFields[`${patchPath}.taskStatus`] = 'to_do'
        setFields[`${patchPath}.priority`] = 'medium'
      }

      const patch = writeClient.patch(id).set(setFields)
      if (reviewStatus === 'pending') {
        patch.unset([`${patchPath}.reviewedAt`])
      }

      const resolvedTaskStatus =
        reviewStatus === 'pending' ? 'pending' : reviewStatus
      const anyPending = tasks.some(
        (t: Record<string, unknown>, i: number) =>
          (i === taskIndex ? resolvedTaskStatus : t.status) === 'pending',
      )
      const allReviewed = tasks.every(
        (t: Record<string, unknown>, i: number) =>
          (i === taskIndex ? resolvedTaskStatus : t.status) !== 'pending',
      )
      if (anyPending) {
        patch.set({ status: 'submitted' })
      } else if (allReviewed) {
        patch.set({ status: 'reviewed' })
      }

      await patch.commit()

      if (sectionId && reviewStatus !== 'pending') {
        const sprintMeta = await writeClient.fetch<{
          weekLabel?: string
          supervisorId?: string
          sectionSlug?: string
        } | null>(
          `*[_type == "weeklySprint" && _id == $id][0]{
            weekLabel,
            "supervisorId": supervisor._ref,
            "sectionSlug": section->slug.current
          }`,
          { id },
        )
        const taskDesc = getRichTextPlainText(
          typeof tasks[taskIndex]?.description === 'string'
            ? tasks[taskIndex]?.description
            : undefined,
          'Sprint task',
        )
        notifySupervisorSprintPlanReviewEmail({
          sprintId: id,
          taskKey,
          reviewStatus: reviewStatus as
            | 'accepted'
            | 'rejected'
            | 'revisions_requested',
          revisionReason:
            reviewStatus === 'revisions_requested'
              ? revisionReason?.trim()
              : undefined,
          managerStaffId: access.viewerStaffId,
        })
        audit.weeklySprint.reviewed(
          id,
          sprintMeta?.weekLabel ?? 'Weekly sprint',
          taskDesc,
          reviewStatus,
          sectionId,
        )
      }

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

      if (updates.assignee !== undefined || updates.priority !== undefined) {
        const denied = assertSprintSupervisorTaskUpdate(access)
        if (denied) return denied
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

      if (updates.taskStatus !== undefined) {
        if (!access.canSuperviseDetailedTasks) {
          return sectionAccessDenied(
            'Only supervisors can update sprint task status',
          )
        }
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
      const {
        taskKey,
        description,
        outputFileId,
        revenueAssessed,
        stakeholderEngagementId,
        stakeholderKey,
      } = body
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

      const assigneeRef = (task.assignee as { _ref?: string } | undefined)?._ref
      if (!access.viewerStaffId || assigneeRef !== access.viewerStaffId) {
        return sectionAccessDenied(
          'Only the assigned officer can submit work for this task',
        )
      }

      const hasStakeholderLink = Boolean(stakeholderEngagementId || stakeholderKey)
      if (hasStakeholderLink) {
        if (
          typeof stakeholderEngagementId !== 'string' ||
          typeof stakeholderKey !== 'string' ||
          !stakeholderEngagementId.trim() ||
          !stakeholderKey.trim()
        ) {
          return NextResponse.json(
            {
              error:
                'stakeholderEngagementId and stakeholderKey are required when linking a stakeholder',
            },
            { status: 400 },
          )
        }
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
      const submissionKey = crypto.randomUUID()
      const newSubmission: Record<string, unknown> = {
        _key: submissionKey,
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

      let stakeholderIndex: number | null = null
      if (hasStakeholderLink && sectionId) {
        try {
          stakeholderIndex = await resolveStakeholderIndexForSectionLink({
            engagementId: stakeholderEngagementId.trim(),
            stakeholderKey: stakeholderKey.trim(),
            sectionId,
          })
          newSubmission.linkedStakeholder = {
            _type: 'workSubmissionStakeholderLink',
            engagement: {
              _type: 'reference',
              _ref: stakeholderEngagementId.trim(),
            },
            stakeholderKey: stakeholderKey.trim(),
          }
        } catch (error) {
          return NextResponse.json(
            {
              error:
                error instanceof Error
                  ? error.message
                  : 'Invalid stakeholder link',
            },
            { status: 400 },
          )
        }
      }

      await writeClient
        .patch(id)
        .set({
          [`tasks[_key=="${taskKey}"].workSubmissions`]: [
            ...existing,
            newSubmission,
          ],
          [`tasks[_key=="${taskKey}"].taskStatus`]: 'in_review',
        })
        .commit()

      if (
        stakeholderIndex !== null &&
        typeof stakeholderEngagementId === 'string'
      ) {
        await linkStakeholderEntryToWorkSubmission({
          engagementId: stakeholderEngagementId.trim(),
          stakeholderIndex,
          sprintId: id,
          taskKey,
          submissionKey,
        })
      }

      notifySupervisorWorkSubmissionEmail({
        sprintId: id,
        taskKey,
        submissionText: description.trim(),
        evidenceAssetId: outputFileId,
        officerStaffId: access.viewerStaffId!,
        submissionKey: String(newSubmission._key),
      })

      return NextResponse.json({ success: true, key: newSubmission._key })
    }

    if (action === 'approve-work-submission') {
      const denied = assertSprintSupervisorTaskUpdate(access)
      if (denied) return denied

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
      const hasPending = updated.some(s => (s.status ?? 'pending') === 'pending')

      const taskStatusAfterReview = allApproved
        ? 'done'
        : hasPending
          ? 'in_review'
          : 'in_progress'

      const setFields: Record<string, unknown> = {
        [`tasks[_key=="${taskKey}"].workSubmissions`]: updated,
        [`tasks[_key=="${taskKey}"].taskStatus`]: taskStatusAfterReview,
      }

      await writeClient.patch(id).set(setFields).commit()
      const assigneeRefApprove = (task.assignee as { _ref?: string } | undefined)
        ?._ref
      if (assigneeRefApprove) {
        notifyOfficerWorkSubmissionOutcomeEmail({
          sprintId: id,
          taskKey,
          submissionKey,
          reviewOutcome: 'approved',
          supervisorFeedback: message?.trim() || 'Approved',
          taskStatusLabel: getSprintTaskStatusLabel(
            taskStatusAfterReview as 'done' | 'in_review' | 'in_progress',
          ),
          reviewerStaffId: access.viewerStaffId,
        })
      }
      return NextResponse.json({ success: true })
    }

    if (action === 'reject-work-submission') {
      const denied = assertSprintSupervisorTaskUpdate(access)
      if (denied) return denied

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
        .set({
          [`tasks[_key=="${taskKey}"].workSubmissions`]: updated,
          [`tasks[_key=="${taskKey}"].taskStatus`]: 'in_progress',
        })
        .commit()

      const assigneeRefReject = (task.assignee as { _ref?: string } | undefined)
        ?._ref
      if (assigneeRefReject) {
        notifyOfficerWorkSubmissionOutcomeEmail({
          sprintId: id,
          taskKey,
          submissionKey,
          reviewOutcome: 'rejected',
          supervisorFeedback: message.trim(),
          taskStatusLabel: getSprintTaskStatusLabel('in_progress'),
          reviewerStaffId: access.viewerStaffId,
        })
      }
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

      const tasksForAuth = (doc.tasks as Array<Record<string, unknown>>) || []
      const taskForAuth = tasksForAuth.find(
        (t: Record<string, unknown>) => t._key === taskKey,
      )
      const assigneeRef = (taskForAuth?.assignee as { _ref?: string } | undefined)
        ?._ref
      if (!canSubmitDetailedTaskWork(access, assigneeRef)) {
        return sectionAccessDenied(
          'Only the assigned officer can respond to submission feedback',
        )
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
      const existingSubmission = submissions.find(s => s._key === submissionKey)
      const existingAssetRef = (
        existingSubmission?.output as { asset?: { _ref?: string } } | undefined
      )?.asset?._ref

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
        .set({
          [`tasks[_key=="${taskKey}"].workSubmissions`]: updated,
          [`tasks[_key=="${taskKey}"].taskStatus`]: 'in_review',
        })
        .commit()

      const evidenceAssetId = outputFileId ?? existingAssetRef
      const submissionText =
        message?.trim() ||
        String(existingSubmission?.description ?? '').trim() ||
        'Updated work submission'

      if (evidenceAssetId && access.viewerStaffId) {
        notifySupervisorWorkSubmissionEmail({
          sprintId: id,
          taskKey,
          submissionText,
          evidenceAssetId,
          officerStaffId: access.viewerStaffId,
          submissionKey,
        })
      }

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
        contractTaskKey,
        contractTaskTitle,
      } = body

      if (!taskKey || typeof taskKey !== 'string') {
        return NextResponse.json(
          { error: 'taskKey is required' },
          { status: 400 },
        )
      }

      const docForReviseAuth = await writeClient.getDocument(id)
      if (!docForReviseAuth || docForReviseAuth._type !== 'weeklySprint') {
        return NextResponse.json({ error: 'Sprint not found' }, { status: 404 })
      }
      const reviseTasks =
        (docForReviseAuth.tasks as Array<Record<string, unknown>>) || []
      const reviseTask = reviseTasks.find(
        (t: Record<string, unknown>) => t._key === taskKey,
      )
      if (!reviseTask) {
        return NextResponse.json({ error: 'Task not found' }, { status: 404 })
      }

      const sprintSupervisorRef = (
        docForReviseAuth.supervisor as { _ref?: string } | undefined
      )?._ref
      const reviseDenied = assertSprintSupervisorPlanReviseAllowed(
        access,
        sprintSupervisorRef,
      )
      if (reviseDenied) return reviseDenied

      const err = validateSprintTaskPayload(
        {
          description,
          activityCategory,
          initiativeKey,
          activityKey,
          contractTaskKey,
        },
        { isProjectSection },
      )
      if (err) {
        return NextResponse.json({ error: err }, { status: 400 })
      }

      const linkFields = buildSprintTaskWriteFields({
        description: String(description).trim(),
        activityCategory,
        initiativeKey,
        initiativeTitle,
        activityKey,
        activityTitle,
        contractTaskKey,
        contractTaskTitle,
      })

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
        [`${patchPath}.status`]: 'pending',
        [`${patchPath}.revisionReason`]: '',
      })

      if (isEmergencySprintCategory(activityCategory)) {
        patch.unset([
          `${patchPath}.initiativeKey`,
          `${patchPath}.initiativeTitle`,
          `${patchPath}.activityKey`,
          `${patchPath}.activityTitle`,
          `${patchPath}.contractTaskKey`,
          `${patchPath}.contractTaskTitle`,
        ])
      } else {
        patch.set(
          Object.fromEntries(
            Object.entries(linkFields)
              .filter(([k]) => k !== 'description' && k !== 'activityCategory')
              .map(([k, v]) => [`${patchPath}.${k}`, v]),
          ),
        )
      }

      if (doc.status === 'reviewed') {
        patch.set({ status: 'submitted' })
      }

      await patch.commit()

      if (!isProjectSection) {
        notifyManagerSprintPlanSubmittedEmail({
          sprintId: id,
          isResubmission: true,
        })
      }

      return NextResponse.json({ success: true })
    }

    if (action === 'add-plan-task') {
      const {
        description,
        activityCategory,
        initiativeKey,
        initiativeTitle,
        activityKey,
        activityTitle,
        contractTaskKey,
        contractTaskTitle,
      } = body

      const doc = await writeClient.getDocument(id)
      if (!doc || doc._type !== 'weeklySprint') {
        return NextResponse.json({ error: 'Sprint not found' }, { status: 404 })
      }

      const sprintSupervisorRef = (
        doc.supervisor as { _ref?: string } | undefined
      )?._ref
      const planTaskDenied = assertSprintSupervisorPlanReviseAllowed(
        access,
        sprintSupervisorRef,
      )
      if (planTaskDenied) return planTaskDenied

      if (doc.status !== 'submitted' && doc.status !== 'reviewed') {
        return NextResponse.json(
          {
            error:
              'Can only add plan tasks to sprints that are submitted or in review',
          },
          { status: 400 },
        )
      }

      const err = validateSprintTaskPayload(
        {
          description,
          activityCategory,
          initiativeKey,
          activityKey,
          contractTaskKey,
        },
        { isProjectSection },
      )
      if (err) {
        return NextResponse.json({ error: err }, { status: 400 })
      }

      const tasks = (doc.tasks as Array<Record<string, unknown>>) || []
      const newTask: Record<string, unknown> = {
        _type: 'sprintTask',
        _key: crypto.randomUUID(),
        ...buildSprintTaskWriteFields({
          description: String(description),
          activityCategory,
          initiativeKey,
          initiativeTitle,
          activityKey,
          activityTitle,
          contractTaskKey,
          contractTaskTitle,
        }),
        status: 'pending',
      }

      const patch = writeClient.patch(id).set({ tasks: [...tasks, newTask] })
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
        contractTaskKey,
        contractTaskTitle,
      } = body

      const err = validateSprintTaskPayload(
        {
          description,
          activityCategory,
          initiativeKey,
          activityKey,
          contractTaskKey,
        },
        { isProjectSection },
      )
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
        ...buildSprintTaskWriteFields({
          description: String(description),
          activityCategory,
          initiativeKey,
          initiativeTitle,
          activityKey,
          activityTitle,
          contractTaskKey,
          contractTaskTitle,
        }),
        status: 'accepted',
        reviewedAt: new Date().toISOString(),
        taskStatus: isSprintWeekStarted(doc.weekStart as string)
          ? 'in_progress'
          : 'to_do',
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

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authResult = await assertAuth()
    if (authResult instanceof NextResponse) return authResult

    const { id } = await params
    const sectionId = await getSectionIdFromWeeklySprint(id)
    if (!sectionId) {
      return NextResponse.json({ error: 'Sprint not found' }, { status: 404 })
    }

    const access = await getSectionAccessForViewer(sectionId)
    const createDenied = assertSprintCreateAllowed(access)
    if (createDenied) return createDenied

    const doc = await writeClient.getDocument(id)
    if (!doc || doc._type !== 'weeklySprint') {
      return NextResponse.json({ error: 'Sprint not found' }, { status: 404 })
    }

    if (doc.status !== 'draft') {
      return NextResponse.json(
        { error: 'Only draft sprints can be deleted' },
        { status: 400 },
      )
    }

    const supervisorRef = (doc.supervisor as { _ref?: string } | undefined)?._ref
    if (
      !access.isGlobalAdmin &&
      supervisorRef &&
      access.viewerStaffId &&
      supervisorRef !== access.viewerStaffId
    ) {
      return sectionAccessDenied('Only the sprint creator can delete this draft')
    }

    const weekLabel =
      typeof doc.weekLabel === 'string' ? doc.weekLabel : 'Weekly sprint'
    await writeClient.delete(id)
    audit.weeklySprint.deleted(id, weekLabel, sectionId)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE weekly sprint', error)
    return NextResponse.json(
      { error: 'Failed to delete sprint' },
      { status: 500 },
    )
  }
}
