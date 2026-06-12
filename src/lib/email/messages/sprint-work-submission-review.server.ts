import 'server-only'

import { queueTemplatedEmail } from '@/lib/email/queue-email.server'
import { sendTemplatedEmail } from '@/lib/email/send-email.server'
import type { SprintWorkSubmissionReviewEmailData } from '@/lib/email/templates/sprint-work-submission-review'
import type { EmailRecipient, SendEmailResult } from '@/lib/email/types'

type SprintWorkSubmissionReviewEmailInput =
  SprintWorkSubmissionReviewEmailData & {
    to: EmailRecipient
    idempotencyKey?: string
  }

export function queueSprintWorkSubmissionReviewEmail(
  input: SprintWorkSubmissionReviewEmailInput,
): void {
  const { to, idempotencyKey, ...data } = input

  queueTemplatedEmail({
    templateId: 'sprint-work-submission-review',
    to,
    data,
    tags: [{ name: 'feature', value: 'sprint-work-submission-review' }],
    idempotencyKey,
  })
}

export function sendSprintWorkSubmissionReviewEmail(
  input: SprintWorkSubmissionReviewEmailInput,
): Promise<SendEmailResult> {
  const { to, idempotencyKey, ...data } = input

  return sendTemplatedEmail({
    templateId: 'sprint-work-submission-review',
    to,
    data,
    tags: [{ name: 'feature', value: 'sprint-work-submission-review' }],
    idempotencyKey,
  })
}
