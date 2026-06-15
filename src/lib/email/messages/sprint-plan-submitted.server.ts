import 'server-only'

import { queueTemplatedEmail } from '@/lib/email/queue-email.server'
import { sendTemplatedEmail } from '@/lib/email/send-email.server'
import type { SprintPlanSubmittedEmailData } from '@/lib/email/templates/sprint-plan-submitted'
import type { EmailRecipient, SendEmailResult } from '@/lib/email/types'

type SprintPlanSubmittedEmailInput = SprintPlanSubmittedEmailData & {
  to: EmailRecipient
  idempotencyKey?: string
}

export function queueSprintPlanSubmittedEmail(
  input: SprintPlanSubmittedEmailInput,
): void {
  const { to, idempotencyKey, ...data } = input

  queueTemplatedEmail({
    templateId: 'sprint-plan-submitted',
    to,
    data,
    tags: [{ name: 'feature', value: 'sprint-plan-submitted' }],
    idempotencyKey,
  })
}

export function sendSprintPlanSubmittedEmail(
  input: SprintPlanSubmittedEmailInput,
): Promise<SendEmailResult> {
  const { to, idempotencyKey, ...data } = input

  return sendTemplatedEmail({
    templateId: 'sprint-plan-submitted',
    to,
    data,
    tags: [{ name: 'feature', value: 'sprint-plan-submitted' }],
    idempotencyKey,
  })
}
