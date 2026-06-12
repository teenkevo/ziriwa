import 'server-only'

import { queueTemplatedEmail } from '@/lib/email/queue-email.server'
import { sendTemplatedEmail } from '@/lib/email/send-email.server'
import type { Sprint30MinutesRemainingEmailData } from '@/lib/email/templates/sprint-30-minutes-remaining'
import type { SprintCompletedEmailData } from '@/lib/email/templates/sprint-completed'
import type { EmailRecipient, SendEmailResult } from '@/lib/email/types'

type Sprint30MinutesEmailInput = Sprint30MinutesRemainingEmailData & {
  to: EmailRecipient
  idempotencyKey?: string
}

type SprintCompletedEmailInput = SprintCompletedEmailData & {
  to: EmailRecipient
  idempotencyKey?: string
}

export function queueSprint30MinutesRemainingEmail(
  input: Sprint30MinutesEmailInput,
): void {
  const { to, idempotencyKey, ...data } = input

  queueTemplatedEmail({
    templateId: 'sprint-30-minutes-remaining',
    to,
    data,
    tags: [
      { name: 'feature', value: 'sprint-30-minutes-remaining' },
      { name: 'role', value: data.recipientRole },
    ],
    idempotencyKey,
  })
}

export function sendSprint30MinutesRemainingEmail(
  input: Sprint30MinutesEmailInput,
): Promise<SendEmailResult> {
  const { to, idempotencyKey, ...data } = input

  return sendTemplatedEmail({
    templateId: 'sprint-30-minutes-remaining',
    to,
    data,
    tags: [
      { name: 'feature', value: 'sprint-30-minutes-remaining' },
      { name: 'role', value: data.recipientRole },
    ],
    idempotencyKey,
  })
}

export function queueSprintCompletedEmail(input: SprintCompletedEmailInput): void {
  const { to, idempotencyKey, ...data } = input

  queueTemplatedEmail({
    templateId: 'sprint-completed',
    to,
    data,
    tags: [
      { name: 'feature', value: 'sprint-completed' },
      { name: 'role', value: data.recipientRole },
    ],
    idempotencyKey,
  })
}

export function sendSprintCompletedEmail(
  input: SprintCompletedEmailInput,
): Promise<SendEmailResult> {
  const { to, idempotencyKey, ...data } = input

  return sendTemplatedEmail({
    templateId: 'sprint-completed',
    to,
    data,
    tags: [
      { name: 'feature', value: 'sprint-completed' },
      { name: 'role', value: data.recipientRole },
    ],
    idempotencyKey,
  })
}
