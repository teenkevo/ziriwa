import 'server-only'

import { queueSprintWorkSubmissionReviewEmail } from '@/lib/email/messages/sprint-work-submission-review.server'
import { client } from '@/sanity/lib/client'

interface NotifySupervisorWorkSubmissionEmailInput {
  sprintId: string
  taskKey: string
  submissionText: string
  evidenceAssetId: string
  officerStaffId: string
  submissionKey?: string
}

export function notifySupervisorWorkSubmissionEmail(
  input: NotifySupervisorWorkSubmissionEmailInput,
): void {
  void loadAndQueueSupervisorWorkSubmissionEmail(input).catch(err => {
    console.error('[email] notifySupervisorWorkSubmissionEmail failed', err)
  })
}

async function loadAndQueueSupervisorWorkSubmissionEmail(
  input: NotifySupervisorWorkSubmissionEmailInput,
): Promise<void> {
  const [sprintMeta, officer, asset] = await Promise.all([
    client.fetch<{
      weekLabel?: string
      sectionName?: string
      supervisorEmail?: string
      supervisorName?: string
      taskDescription?: string
    } | null>(
      /* groq */ `*[_type == "weeklySprint" && _id == $sprintId][0]{
        weekLabel,
        "sectionName": section->name,
        "supervisorEmail": supervisor->email,
        "supervisorName": coalesce(supervisor->fullName, supervisor->firstName + " " + supervisor->lastName),
        "taskDescription": tasks[_key == $taskKey][0].description
      }`,
      { sprintId: input.sprintId, taskKey: input.taskKey },
    ),
    client.fetch<{ fullName?: string } | null>(
      /* groq */ `*[_id == $staffId][0]{
        "fullName": coalesce(fullName, firstName + " " + lastName)
      }`,
      { staffId: input.officerStaffId },
    ),
    client.fetch<{ originalFilename?: string; url?: string } | null>(
      /* groq */ `*[_id == $assetId][0]{ originalFilename, url }`,
      { assetId: input.evidenceAssetId },
    ),
  ])

  const supervisorEmail = sprintMeta?.supervisorEmail?.trim().toLowerCase()
  if (!supervisorEmail) return

  const evidenceLabel =
    asset?.originalFilename?.trim() || 'Submitted evidence file'

  queueSprintWorkSubmissionReviewEmail({
    to: supervisorEmail,
    supervisorName: sprintMeta?.supervisorName?.trim() || 'Supervisor',
    officerName: officer?.fullName?.trim() || 'Officer',
    sectionName: sprintMeta?.sectionName?.trim() || 'Section',
    weekLabel: sprintMeta?.weekLabel?.trim() || 'Sprint week',
    row: {
      taskDescription:
        sprintMeta?.taskDescription?.trim() || 'Sprint activity',
      submissionText: input.submissionText.trim(),
      evidenceLabel,
      evidenceUrl: asset?.url,
    },
    idempotencyKey: `sprint-work-submission-review:${input.sprintId}:${input.taskKey}:${input.submissionKey ?? 'new'}:${Date.now()}`,
  })
}
