import 'server-only'

import type { EmailTemplateId } from '@/lib/email/templates/registry'
import {
  sendEmail,
  sendTemplatedEmail,
  type SendTemplatedEmailInput,
} from '@/lib/email/send-email.server'
import type { SendEmailInput } from '@/lib/email/types'

/** Fire-and-forget email send; never throws to callers. */
export function queueEmail(input: SendEmailInput): void {
  void sendEmail(input).catch(err => {
    console.error('[email] queueEmail failed', err)
  })
}

/** Fire-and-forget templated email send; never throws to callers. */
export function queueTemplatedEmail<TId extends EmailTemplateId>(
  input: SendTemplatedEmailInput<TId>
): void {
  void sendTemplatedEmail(input).catch(err => {
    console.error('[email] queueTemplatedEmail failed', err)
  })
}
