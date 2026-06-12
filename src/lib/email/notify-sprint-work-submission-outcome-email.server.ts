import 'server-only'

import { queueSprintWorkSubmissionOutcomeEmail } from '@/lib/email/messages/sprint-work-submission-outcome.server'
import { getSprintTaskStatusLabel } from '@/lib/sprint-task-status'
import type { SprintWorkSubmissionReviewOutcome } from '@/lib/email/templates/sprint-work-submission-outcome'
import { client } from '@/sanity/lib/client'

interface NotifyOfficerWorkSubmissionOutcomeEmailInput {
  sprintId: string
  taskKey: string
  submissionKey: string
  reviewOutcome: SprintWorkSubmissionReviewOutcome
  supervisorFeedback: string
  taskStatusLabel: string
  reviewerStaffId?: string | null
}

export function notifyOfficerWorkSubmissionOutcomeEmail(
  input: NotifyOfficerWorkSubmissionOutcomeEmailInput,
): void {
  void loadAndQueueOfficerWorkSubmissionOutcomeEmail(input).catch(err => {
    console.error('[email] notifyOfficerWorkSubmissionOutcomeEmail failed', err)
  })
}

async function loadAndQueueOfficerWorkSubmissionOutcomeEmail(
  input: NotifyOfficerWorkSubmissionOutcomeEmailInput,
): Promise<void> {
  const sprintMeta = await client.fetch<{
    weekLabel?: string
    sectionName?: string
    supervisorName?: string
    taskDescription?: string
    submissionDescription?: string
    evidenceAssetId?: string
    assigneeEmail?: string
    assigneeName?: string
  } | null>(
    /* groq */ `*[_type == "weeklySprint" && _id == $sprintId][0]{
      weekLabel,
      "sectionName": section->name,
      "supervisorName": coalesce(supervisor->fullName, supervisor->firstName + " " + supervisor->lastName),
      "taskDescription": tasks[_key == $taskKey][0].description,
      "submissionDescription": tasks[_key == $taskKey][0].workSubmissions[_key == $submissionKey][0].description,
      "evidenceAssetId": tasks[_key == $taskKey][0].workSubmissions[_key == $submissionKey][0].output.asset._ref,
      "assigneeEmail": tasks[_key == $taskKey][0].assignee->email,
      "assigneeName": coalesce(
        tasks[_key == $taskKey][0].assignee->fullName,
        tasks[_key == $taskKey][0].assignee->firstName + " " + tasks[_key == $taskKey][0].assignee->lastName
      )
    }`,
    {
      sprintId: input.sprintId,
      taskKey: input.taskKey,
      submissionKey: input.submissionKey,
    },
  )

  const officerEmail = sprintMeta?.assigneeEmail?.trim().toLowerCase()
  if (!officerEmail) return

  const reviewer = input.reviewerStaffId
    ? await client.fetch<{ fullName?: string } | null>(
        /* groq */ `*[_id == $staffId][0]{
          "fullName": coalesce(fullName, firstName + " " + lastName)
        }`,
        { staffId: input.reviewerStaffId },
      )
    : null

  const asset = sprintMeta?.evidenceAssetId
    ? await client.fetch<{ originalFilename?: string; url?: string } | null>(
        /* groq */ `*[_id == $assetId][0]{ originalFilename, url }`,
        { assetId: sprintMeta.evidenceAssetId },
      )
    : null

  const evidenceLabel =
    asset?.originalFilename?.trim() || 'Submitted evidence file'

  queueSprintWorkSubmissionOutcomeEmail({
    to: officerEmail,
    officerName: sprintMeta?.assigneeName?.trim() || 'Officer',
    supervisorName:
      reviewer?.fullName?.trim() ||
      sprintMeta?.supervisorName?.trim() ||
      'Supervisor',
    sectionName: sprintMeta?.sectionName?.trim() || 'Section',
    weekLabel: sprintMeta?.weekLabel?.trim() || 'Sprint week',
    reviewOutcome: input.reviewOutcome,
    row: {
      taskDescription:
        sprintMeta?.taskDescription?.trim() || 'Sprint activity',
      submissionText:
        sprintMeta?.submissionDescription?.trim() || 'Work submission',
      evidenceLabel,
      evidenceUrl: asset?.url,
      supervisorFeedback: input.supervisorFeedback.trim() || '—',
      taskStatusLabel:
        input.taskStatusLabel ||
        getSprintTaskStatusLabel(
          input.reviewOutcome === 'approved' ? 'done' : 'in_progress',
        ),
    },
    idempotencyKey: `sprint-work-submission-outcome:${input.sprintId}:${input.taskKey}:${input.submissionKey}:${input.reviewOutcome}:${Date.now()}`,
  })
}
