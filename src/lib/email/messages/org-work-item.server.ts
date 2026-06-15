import 'server-only'

import { queueTemplatedEmail } from '@/lib/email/queue-email.server'
import type { OrgWorkItemEmailData } from '@/lib/email/templates/org-work-item'
import type { EmailRecipient } from '@/lib/email/types'

type OrgWorkItemEmailInput = OrgWorkItemEmailData & {
  to: EmailRecipient
  idempotencyKey?: string
}

export function queueOrgWorkItemEmail(input: OrgWorkItemEmailInput): void {
  const { to, idempotencyKey, ...data } = input

  queueTemplatedEmail({
    templateId: 'org-work-item',
    to,
    data,
    tags: [{ name: 'feature', value: 'org-work-item' }],
    idempotencyKey,
  })
}
