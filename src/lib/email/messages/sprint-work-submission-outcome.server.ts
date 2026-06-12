import 'server-only'

import { queueTemplatedEmail } from '@/lib/email/queue-email.server'
import { sendTemplatedEmail } from '@/lib/email/send-email.server'
import type { SprintWorkSubmissionOutcomeEmailData } from '@/lib/email/templates/sprint-work-submission-outcome'
import type { EmailRecipient, SendEmailResult } from '@/lib/email/types'

type SprintWorkSubmissionOutcomeEmailInput =
  SprintWorkSubmissionOutcomeEmailData & {
    to: EmailRecipient
    idempotencyKey?: string
  }

export function queueSprintWorkSubmissionOutcomeEmail(
  input: SprintWorkSubmissionOutcomeEmailInput,
): void {
  const { to, idempotencyKey, ...data } = input

  queueTemplatedEmail({
    templateId: 'sprint-work-submission-outcome',
    to,
    data,
    tags: [
      { name: 'feature', value: 'sprint-work-submission-outcome' },
      { name: 'outcome', value: data.reviewOutcome },
    ],
    idempotencyKey,
  })
}

export function sendSprintWorkSubmissionOutcomeEmail(
  input: SprintWorkSubmissionOutcomeEmailInput,
): Promise<SendEmailResult> {
  const { to, idempotencyKey, ...data } = input

  return sendTemplatedEmail({
    templateId: 'sprint-work-submission-outcome',
    to,
    data,
    tags: [
      { name: 'feature', value: 'sprint-work-submission-outcome' },
      { name: 'outcome', value: data.reviewOutcome },
    ],
    idempotencyKey,
  })
}
