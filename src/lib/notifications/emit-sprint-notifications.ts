import 'server-only'

import { client } from '@/sanity/lib/client'
import { createNotification } from '@/lib/notifications/create-notification'
import type { NotificationType } from '@/lib/notifications/types'

export async function notifySprintTaskAssigned(
  assigneeStaffId: string,
  taskDescription: string,
  sectionSlug?: string,
) {
  await createNotification({
    recipientStaffId: assigneeStaffId,
    type: 'sprint_task_assigned',
    title: 'New sprint task assigned',
    body: taskDescription.slice(0, 120),
    href: sectionSlug ? `/sections/${sectionSlug}?tab=weekly-sprint` : undefined,
  })
}

export async function notifySprintPriorityChanged(
  assigneeStaffId: string,
  taskDescription: string,
) {
  await createNotification({
    recipientStaffId: assigneeStaffId,
    type: 'sprint_task_priority_changed',
    title: 'Sprint task priority updated',
    body: taskDescription.slice(0, 120),
  })
}

export async function notifySprintWorkReview(
  assigneeStaffId: string,
  approved: boolean,
  message?: string,
) {
  await createNotification({
    recipientStaffId: assigneeStaffId,
    type: approved ? 'sprint_work_approved' : 'sprint_work_rejected',
    title: approved ? 'Work submission approved' : 'Work submission rejected',
    body: message?.trim() || undefined,
  })
}

export async function notifySupervisorsPendingSubmission(
  sectionId: string,
  officerName: string,
  taskDescription: string,
) {
  const supervisorIds = await client.fetch<string[]>(
    `*[_type == "staff" && role == "supervisor" && status == "active" && section._ref == $sectionId]._id`,
    { sectionId },
  )
  const managerId = await client.fetch<string | null>(
    `*[_type == "section" && _id == $sectionId][0].manager._ref`,
    { sectionId },
  )
  const recipients = new Set(supervisorIds)
  if (managerId) recipients.add(managerId)

  await Promise.all(
    [...recipients].map(id =>
      createNotification({
        recipientStaffId: id,
        type: 'sprint_submission_pending',
        title: 'Work awaiting review',
        body: `${officerName}: ${taskDescription.slice(0, 80)}`,
      }),
    ),
  )
}

const MANAGER_REVIEW_NOTIFY: Record<
  'accepted' | 'rejected' | 'revisions_requested',
  { type: NotificationType; title: string }
> = {
  accepted: {
    type: 'sprint_task_manager_approved',
    title: 'Sprint task approved by manager',
  },
  rejected: {
    type: 'sprint_task_manager_rejected',
    title: 'Sprint task rejected by manager',
  },
  revisions_requested: {
    type: 'sprint_task_manager_revisions_requested',
    title: 'Manager requested sprint task revisions',
  },
}

/** Notify section supervisors when the manager reviews a sprint plan task. */
export async function notifyManagerSprintTaskReview(input: {
  sectionId: string
  sectionSlug?: string | null
  weekLabel?: string
  taskDescription: string
  reviewStatus: 'accepted' | 'rejected' | 'revisions_requested'
  sprintSupervisorId?: string | null
  revisionReason?: string
}): Promise<void> {
  const config = MANAGER_REVIEW_NOTIFY[input.reviewStatus]
  const href = input.sectionSlug
    ? `/sections/${input.sectionSlug}?tab=weekly-sprint`
    : undefined

  const bodyParts = [
    input.weekLabel,
    input.taskDescription.slice(0, 100),
  ]
  if (input.reviewStatus === 'revisions_requested' && input.revisionReason?.trim()) {
    bodyParts.push(input.revisionReason.trim().slice(0, 120))
  }

  const supervisorIds = await client.fetch<string[]>(
    `*[_type == "staff" && role == "supervisor" && status == "active" && section._ref == $sectionId]._id`,
    { sectionId: input.sectionId },
  )

  const recipients = new Set(supervisorIds)
  if (input.sprintSupervisorId) recipients.add(input.sprintSupervisorId)

  await Promise.all(
    [...recipients].map(recipientStaffId =>
      createNotification({
        recipientStaffId,
        type: config.type,
        title: config.title,
        body: bodyParts.filter(Boolean).join(' · '),
        href,
        metadata: {
          reviewStatus: input.reviewStatus,
          weekLabel: input.weekLabel,
        },
      }),
    ),
  )
}

/** All sprint plan tasks reviewed by the manager — sprint marked reviewed. */
export async function notifySprintPlanReviewComplete(input: {
  sectionId: string
  sectionSlug?: string | null
  weekLabel: string
  sprintSupervisorId?: string | null
}): Promise<void> {
  const href = input.sectionSlug
    ? `/sections/${input.sectionSlug}?tab=weekly-sprint`
    : undefined

  const supervisorIds = await client.fetch<string[]>(
    `*[_type == "staff" && role == "supervisor" && status == "active" && section._ref == $sectionId]._id`,
    { sectionId: input.sectionId },
  )

  const recipients = new Set(supervisorIds)
  if (input.sprintSupervisorId) recipients.add(input.sprintSupervisorId)

  await Promise.all(
    [...recipients].map(recipientStaffId =>
      createNotification({
        recipientStaffId,
        type: 'sprint_plan_review_complete',
        title: 'Sprint plan review complete',
        body: `${input.weekLabel}: all tasks have been reviewed by your manager.`,
        href,
      }),
    ),
  )
}

/** @deprecated Use notifyManagerSprintTaskReview */
export async function notifySprintTaskReviewedByManager(
  supervisorIds: string[],
  taskDescription: string,
  reviewStatus: string,
) {
  const status =
    reviewStatus === 'accepted' ||
    reviewStatus === 'rejected' ||
    reviewStatus === 'revisions_requested'
      ? reviewStatus
      : 'accepted'

  await Promise.all(
    supervisorIds.map(id =>
      createNotification({
        recipientStaffId: id,
        type: 'sprint_task_reviewed',
        title: `Sprint task ${reviewStatus.replace(/_/g, ' ')}`,
        body: taskDescription.slice(0, 120),
      }),
    ),
  )
}
