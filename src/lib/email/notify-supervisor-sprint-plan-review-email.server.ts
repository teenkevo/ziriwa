import 'server-only'

import { queueSprintPlanReviewOutcomeEmail } from '@/lib/email/messages/sprint-plan-review-outcome.server'
import type { SprintPlanReviewOutcome } from '@/lib/email/templates/sprint-plan-review-outcome'
import { getSprintActivityCategoryLabel } from '@/lib/sprint-task-validation'
import { client } from '@/sanity/lib/client'

const PLAN_STATUS_LABELS: Record<SprintPlanReviewOutcome, string> = {
  accepted: 'Accepted',
  rejected: 'Rejected',
  revisions_requested: 'Revisions requested',
}

interface NotifySupervisorSprintPlanReviewEmailInput {
  sprintId: string
  taskKey: string
  reviewStatus: SprintPlanReviewOutcome
  revisionReason?: string
  managerStaffId?: string | null
}

export function notifySupervisorSprintPlanReviewEmail(
  input: NotifySupervisorSprintPlanReviewEmailInput,
): void {
  void loadAndQueueSupervisorSprintPlanReviewEmail(input).catch(err => {
    console.error('[email] notifySupervisorSprintPlanReviewEmail failed', err)
  })
}

async function loadAndQueueSupervisorSprintPlanReviewEmail(
  input: NotifySupervisorSprintPlanReviewEmailInput,
): Promise<void> {
  const sprintMeta = await client.fetch<{
    weekLabel?: string
    sectionName?: string
    sectionId?: string
    supervisorEmail?: string
    supervisorName?: string
    taskDescription?: string
    taskCategory?: string
    taskInitiative?: string
    taskActivity?: string
  } | null>(
    /* groq */ `*[_type == "weeklySprint" && _id == $sprintId][0]{
      weekLabel,
      "sectionName": section->name,
      "sectionId": section._ref,
      "supervisorEmail": supervisor->email,
      "supervisorName": coalesce(supervisor->fullName, supervisor->firstName + " " + supervisor->lastName),
      "taskDescription": tasks[_key == $taskKey][0].description,
      "taskCategory": tasks[_key == $taskKey][0].activityCategory,
      "taskInitiative": tasks[_key == $taskKey][0].initiativeTitle,
      "taskActivity": tasks[_key == $taskKey][0].activityTitle
    }`,
    { sprintId: input.sprintId, taskKey: input.taskKey },
  )

  if (!sprintMeta) return

  const manager = input.managerStaffId
    ? await client.fetch<{ fullName?: string } | null>(
        /* groq */ `*[_id == $staffId][0]{
          "fullName": coalesce(fullName, firstName + " " + lastName)
        }`,
        { staffId: input.managerStaffId },
      )
    : null

  const supervisors = sprintMeta.sectionId
    ? await client.fetch<Array<{ email?: string; name?: string }>>(
        /* groq */ `*[_type == "staff" && role == "supervisor" && status == "active" && section._ref == $sectionId]{
          email,
          "name": coalesce(fullName, firstName + " " + lastName)
        }`,
        { sectionId: sprintMeta.sectionId },
      )
    : []

  const recipients = new Map<string, string>()
  const sprintSupervisorEmail = sprintMeta.supervisorEmail?.trim().toLowerCase()
  if (sprintSupervisorEmail) {
    recipients.set(
      sprintSupervisorEmail,
      sprintMeta.supervisorName?.trim() || 'Supervisor',
    )
  }
  for (const supervisor of supervisors) {
    const email = supervisor.email?.trim().toLowerCase()
    if (!email) continue
    recipients.set(email, supervisor.name?.trim() || 'Supervisor')
  }

  if (recipients.size === 0) return

  const managerName = manager?.fullName?.trim() || 'Manager'
  const emailData = {
    managerName,
    sectionName: sprintMeta.sectionName?.trim() || 'Section',
    weekLabel: sprintMeta.weekLabel?.trim() || 'Sprint week',
    reviewOutcome: input.reviewStatus,
    row: {
      taskDescription: sprintMeta.taskDescription?.trim() || 'Sprint task',
      categoryLabel:
        getSprintActivityCategoryLabel(sprintMeta.taskCategory) || '—',
      initiativeTitle: sprintMeta.taskInitiative?.trim() || '—',
      activityTitle: sprintMeta.taskActivity?.trim() || '—',
      reviewStatusLabel: PLAN_STATUS_LABELS[input.reviewStatus],
      revisionReason:
        input.reviewStatus === 'revisions_requested'
          ? input.revisionReason?.trim() || '—'
          : '—',
    },
  }

  for (const [email, supervisorName] of recipients) {
    queueSprintPlanReviewOutcomeEmail({
      to: email,
      supervisorName,
      ...emailData,
      idempotencyKey: `sprint-plan-review-outcome:${input.sprintId}:${input.taskKey}:${input.reviewStatus}:${email}:${Date.now()}`,
    })
  }
}
