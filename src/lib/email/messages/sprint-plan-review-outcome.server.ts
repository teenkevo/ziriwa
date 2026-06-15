import 'server-only'

import { queueTemplatedEmail } from '@/lib/email/queue-email.server'
import { sendTemplatedEmail } from '@/lib/email/send-email.server'
import type { SprintPlanReviewOutcomeEmailData } from '@/lib/email/templates/sprint-plan-review-outcome'
import type { EmailRecipient, SendEmailResult } from '@/lib/email/types'

type SprintPlanReviewOutcomeEmailInput = SprintPlanReviewOutcomeEmailData & {
  to: EmailRecipient
  idempotencyKey?: string
}

export function queueSprintPlanReviewOutcomeEmail(
  input: SprintPlanReviewOutcomeEmailInput,
): void {
  const { to, idempotencyKey, ...data } = input

  queueTemplatedEmail({
    templateId: 'sprint-plan-review-outcome',
    to,
    data,
    tags: [{ name: 'feature', value: 'sprint-plan-review-outcome' }],
    idempotencyKey,
  })
}

export function sendSprintPlanReviewOutcomeEmail(
  input: SprintPlanReviewOutcomeEmailInput,
): Promise<SendEmailResult> {
  const { to, idempotencyKey, ...data } = input

  return sendTemplatedEmail({
    templateId: 'sprint-plan-review-outcome',
    to,
    data,
    tags: [{ name: 'feature', value: 'sprint-plan-review-outcome' }],
    idempotencyKey,
  })
}
