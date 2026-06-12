import 'server-only'

import { queueTemplatedEmail } from '@/lib/email/queue-email.server'
import { sendTemplatedEmail } from '@/lib/email/send-email.server'
import type { NotificationEmailData } from '@/lib/email/templates/notification'
import type { EmailRecipient, EmailTag, SendEmailResult } from '@/lib/email/types'

type NotificationEmailInput = NotificationEmailData & {
  to: EmailRecipient | EmailRecipient[]
  tags?: EmailTag[]
  idempotencyKey?: string
}

/**
 * Example feature helper: queue a generic notification email.
 * Add similar modules under `messages/` as you roll email out to features.
 */
export function queueNotificationEmail(input: NotificationEmailInput): void {
  const { to, tags, idempotencyKey, ...data } = input

  queueTemplatedEmail({
    templateId: 'notification',
    to,
    data,
    tags,
    idempotencyKey,
  })
}

export function sendNotificationEmail(
  input: NotificationEmailInput
): Promise<SendEmailResult> {
  const { to, tags, idempotencyKey, ...data } = input

  return sendTemplatedEmail({
    templateId: 'notification',
    to,
    data,
    tags,
    idempotencyKey,
  })
}
