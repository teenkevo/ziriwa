import 'server-only'

import { queueSprintPlanSubmittedEmail } from '@/lib/email/messages/sprint-plan-submitted.server'
import type { SprintPlanSubmittedTaskRow } from '@/lib/email/templates/sprint-plan-submitted'
import { getSprintActivityCategoryLabel } from '@/lib/sprint-task-validation'
import { client } from '@/sanity/lib/client'

const PLAN_STATUS_LABELS: Record<string, string> = {
  pending: 'Pending review',
  accepted: 'Accepted',
  rejected: 'Rejected',
  revisions_requested: 'Revisions requested',
}

interface NotifyManagerSprintPlanSubmittedEmailInput {
  sprintId: string
  isResubmission?: boolean
}

export function notifyManagerSprintPlanSubmittedEmail(
  input: NotifyManagerSprintPlanSubmittedEmailInput,
): void {
  void loadAndQueueManagerSprintPlanSubmittedEmail(input).catch(err => {
    console.error('[email] notifyManagerSprintPlanSubmittedEmail failed', err)
  })
}

async function loadAndQueueManagerSprintPlanSubmittedEmail(
  input: NotifyManagerSprintPlanSubmittedEmailInput,
): Promise<void> {
  const sprintMeta = await client.fetch<{
    weekLabel?: string
    sectionName?: string
    managerEmail?: string
    managerName?: string
    supervisorName?: string
    tasks?: Array<{
      description?: string
      activityCategory?: string
      initiativeTitle?: string
      activityTitle?: string
      status?: string
    }>
  } | null>(
    /* groq */ `*[_type == "weeklySprint" && _id == $sprintId][0]{
      weekLabel,
      "sectionName": section->name,
      "managerEmail": section->manager->email,
      "managerName": coalesce(section->manager->fullName, section->manager->firstName + " " + section->manager->lastName),
      "supervisorName": coalesce(supervisor->fullName, supervisor->firstName + " " + supervisor->lastName),
      tasks[]{
        description,
        activityCategory,
        initiativeTitle,
        activityTitle,
        status
      }
    }`,
    { sprintId: input.sprintId },
  )

  const managerEmail = sprintMeta?.managerEmail?.trim().toLowerCase()
  if (!managerEmail) return

  const tasks = sprintMeta?.tasks ?? []
  const rows: SprintPlanSubmittedTaskRow[] = tasks.map(task => ({
    description: task.description?.trim() || 'Sprint task',
    categoryLabel:
      getSprintActivityCategoryLabel(task.activityCategory) || '—',
    initiativeTitle: task.initiativeTitle?.trim() || '—',
    activityTitle: task.activityTitle?.trim() || '—',
    statusLabel:
      PLAN_STATUS_LABELS[task.status ?? 'pending'] ?? 'Pending review',
  }))

  if (rows.length === 0) return

  queueSprintPlanSubmittedEmail({
    to: managerEmail,
    managerName: sprintMeta?.managerName?.trim() || 'Manager',
    supervisorName: sprintMeta?.supervisorName?.trim() || 'Supervisor',
    sectionName: sprintMeta?.sectionName?.trim() || 'Section',
    weekLabel: sprintMeta?.weekLabel?.trim() || 'Sprint week',
    isResubmission: input.isResubmission,
    rows,
    idempotencyKey: `sprint-plan-submitted:${input.sprintId}:${input.isResubmission ? 'resubmit' : 'submit'}:${Date.now()}`,
  })
}
