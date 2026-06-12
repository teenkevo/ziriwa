import 'server-only'

import { getResendClient } from '@/lib/email/client.server'
import {
  getEmailDevRedirectRecipients,
  getEmailFromAddress,
  getEmailReplyToAddress,
  isEmailSendingEnabled,
  shouldRedirectEmailInDev,
} from '@/lib/email/env'
import {
  type EmailTemplateData,
  type EmailTemplateId,
  renderEmailTemplate,
} from '@/lib/email/templates/registry'
import type {
  EmailRecipient,
  EmailTag,
  SendEmailInput,
  SendEmailResult,
} from '@/lib/email/types'

function normalizeRecipients(
  value: EmailRecipient | EmailRecipient[]
): string[] {
  const list = Array.isArray(value) ? value : [value]
  return list.map(recipient => recipient.trim()).filter(Boolean)
}

function resolveRecipients(original: string[]): {
  to: string[]
  redirected: boolean
} {
  const devRedirects = getEmailDevRedirectRecipients()
  if (shouldRedirectEmailInDev() && devRedirects.length > 0) {
    console.info('[email] Dev redirect', { original, to: devRedirects })
    return { to: devRedirects, redirected: true }
  }

  return { to: original, redirected: false }
}

/** Resend allows only ASCII letters, numbers, underscores, and dashes in tag values. */
function sanitizeResendTagPart(value: string): string {
  return value
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 256)
}

function buildResendTags(tags: EmailTag[] | undefined) {
  if (!tags?.length) return undefined

  const sanitized = tags
    .map(tag => ({
      name: sanitizeResendTagPart(tag.name),
      value: sanitizeResendTagPart(tag.value),
    }))
    .filter(tag => tag.name.length > 0 && tag.value.length > 0)

  return sanitized.length > 0 ? sanitized : undefined
}

export async function sendEmail(
  input: SendEmailInput
): Promise<SendEmailResult> {
  const recipients = normalizeRecipients(input.to)
  if (recipients.length === 0) {
    return { ok: false, error: 'At least one recipient is required' }
  }

  if (!isEmailSendingEnabled()) {
    console.info('[email] Skipped (disabled)', {
      to: recipients,
      subject: input.subject,
    })
    return { ok: true, id: 'skipped', skipped: true }
  }

  const from = getEmailFromAddress()
  if (!from) {
    return { ok: false, error: 'EMAIL_FROM is not configured' }
  }

  const client = getResendClient()
  if (!client) {
    return { ok: false, error: 'RESEND_API_KEY is not configured' }
  }

  const { to, redirected } = resolveRecipients(recipients)
  const replyToSource = input.replyTo ?? getEmailReplyToAddress()
  const replyTo = replyToSource
    ? normalizeRecipients(replyToSource)
    : []

  const subject =
    redirected && shouldRedirectEmailInDev()
      ? `[DEV] ${input.subject} (to: ${recipients.join(', ')})`
      : input.subject

  const { data, error } = await client.emails.send({
    from,
    to,
    cc: normalizeRecipients(input.cc ?? []) || undefined,
    bcc: normalizeRecipients(input.bcc ?? []) || undefined,
    replyTo: replyTo?.length ? replyTo : undefined,
    subject,
    html: input.html,
    text: input.text,
    tags: buildResendTags(input.tags),
    headers: input.idempotencyKey
      ? { 'Idempotency-Key': input.idempotencyKey }
      : undefined,
  })

  if (error) {
    console.error('[email] Send failed', { error, subject, to })
    return { ok: false, error: error.message }
  }

  if (!data?.id) {
    return { ok: false, error: 'Resend did not return a message id' }
  }

  return { ok: true, id: data.id, redirected }
}

export type SendTemplatedEmailInput<TId extends EmailTemplateId> = {
  templateId: TId
  to: EmailRecipient | EmailRecipient[]
  data: EmailTemplateData<TId>
  cc?: EmailRecipient | EmailRecipient[]
  bcc?: EmailRecipient | EmailRecipient[]
  replyTo?: EmailRecipient | EmailRecipient[]
  tags?: EmailTag[]
  idempotencyKey?: string
}

export async function sendTemplatedEmail<TId extends EmailTemplateId>(
  input: SendTemplatedEmailInput<TId>
): Promise<SendEmailResult> {
  const rendered = renderEmailTemplate(input.templateId, input.data)

  return sendEmail({
    to: input.to,
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
    cc: input.cc,
    bcc: input.bcc,
    replyTo: input.replyTo,
    tags: [
      { name: 'template', value: input.templateId },
      ...(input.tags ?? []),
    ],
    idempotencyKey: input.idempotencyKey,
  })
}
