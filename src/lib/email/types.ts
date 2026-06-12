export type EmailRecipient = string

export type EmailTag = {
  name: string
  value: string
}

export type RenderedEmail = {
  subject: string
  html: string
  text: string
  previewText?: string
}

export type SendEmailInput = {
  to: EmailRecipient | EmailRecipient[]
  subject: string
  html: string
  text?: string
  cc?: EmailRecipient | EmailRecipient[]
  bcc?: EmailRecipient | EmailRecipient[]
  replyTo?: EmailRecipient | EmailRecipient[]
  tags?: EmailTag[]
  idempotencyKey?: string
}

export type SendEmailResult =
  | {
      ok: true
      id: string
      skipped?: boolean
      redirected?: boolean
    }
  | {
      ok: false
      error: string
    }

export interface EmailTemplateDefinition<TData> {
  id: string
  render: (data: TData) => RenderedEmail
}
