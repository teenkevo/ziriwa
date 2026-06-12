import 'server-only'

import { sendTemplatedEmail } from '@/lib/email/send-email.server'
import type { SprintMissingSubmissionsEmailData } from '@/lib/email/templates/sprint-missing-submissions'
import type { EmailRecipient, SendEmailResult } from '@/lib/email/types'

type SprintMissingSubmissionsEmailInput = SprintMissingSubmissionsEmailData & {
  to: EmailRecipient
  idempotencyKey?: string
}

export function sendSprintMissingSubmissionsEmail(
  input: SprintMissingSubmissionsEmailInput,
): Promise<SendEmailResult> {
  const { to, idempotencyKey, ...data } = input

  return sendTemplatedEmail({
    templateId: 'sprint-missing-submissions',
    to,
    data,
    tags: [
      { name: 'feature', value: 'sprint-missing-submissions' },
      { name: 'role', value: data.recipientRole },
      {
        name: 'week',
        value: data.rows[0]?.weekStart ?? data.weekLabel,
      },
    ],
    idempotencyKey,
  })
}
