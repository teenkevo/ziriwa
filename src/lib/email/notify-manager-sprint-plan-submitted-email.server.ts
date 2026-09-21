import 'server-only'

import { queueSprintPlanSubmittedEmail } from '@/lib/email/messages/sprint-plan-submitted.server'
import type { SprintPlanSubmittedTaskRow } from '@/lib/email/templates/sprint-plan-submitted'
import { getRichTextPlainText } from '@/lib/rich-text'
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
    sectionSlug?: string
    isPlanningSection?: boolean
    managerEmail?: string
    managerName?: string
    assistantCommissionerEmail?: string
    assistantCommissionerName?: string
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
      "sectionSlug": section->slug.current,
      "isPlanningSection": coalesce(section->isPlanningSection, false),
      "managerEmail": section->manager->email,
      "managerName": coalesce(section->manager->fullName, section->manager->firstName + " " + section->manager->lastName),
      "assistantCommissionerEmail": section->division->assistantCommissioner->email,
      "assistantCommissionerName": coalesce(
        section->division->assistantCommissioner->fullName,
        section->division->assistantCommissioner->firstName + " " + section->division->assistantCommissioner->lastName
      ),
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

  const isPlanningSection = Boolean(sprintMeta?.isPlanningSection)
  const reviewerEmail = (
    isPlanningSection
      ? sprintMeta?.assistantCommissionerEmail
      : sprintMeta?.managerEmail
  )
    ?.trim()
    .toLowerCase()
  if (!reviewerEmail) return

  const reviewerName = isPlanningSection
    ? sprintMeta?.assistantCommissionerName?.trim() || 'Assistant Commissioner'
    : sprintMeta?.managerName?.trim() || 'Manager'

  const sectionSlug = sprintMeta?.sectionSlug?.trim()
  const reviewHref = isPlanningSection
    ? sectionSlug
      ? `/sections/${sectionSlug}?tab=weekly-sprint`
      : '/assistant-commissioner/dashboard'
    : '/manager/sprints?tab=to-review'

  const tasks = sprintMeta?.tasks ?? []
  const rows: SprintPlanSubmittedTaskRow[] = tasks.map(task => ({
    description: getRichTextPlainText(task.description, 'Sprint task'),
    categoryLabel:
      getSprintActivityCategoryLabel(task.activityCategory) || '—',
    initiativeTitle: task.initiativeTitle?.trim() || '—',
    activityTitle: task.activityTitle?.trim() || '—',
    statusLabel:
      PLAN_STATUS_LABELS[task.status ?? 'pending'] ?? 'Pending review',
  }))

  if (rows.length === 0) return

  queueSprintPlanSubmittedEmail({
    to: reviewerEmail,
    managerName: reviewerName,
    supervisorName: sprintMeta?.supervisorName?.trim() || 'Supervisor',
    sectionName: sprintMeta?.sectionName?.trim() || 'Section',
    weekLabel: sprintMeta?.weekLabel?.trim() || 'Sprint week',
    isResubmission: input.isResubmission,
    reviewHref,
    rows,
    idempotencyKey: `sprint-plan-submitted:${input.sprintId}:${input.isResubmission ? 'resubmit' : 'submit'}:${Date.now()}`,
  })
}
