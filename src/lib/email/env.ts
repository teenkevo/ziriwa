import 'server-only'

function parseCsv(raw: string | undefined): string[] {
  if (!raw) return []
  return raw
    .split(',')
    .map(value => value.trim())
    .filter(Boolean)
}

export function isEmailSendingEnabled(): boolean {
  const flag = process.env.EMAIL_ENABLED?.trim().toLowerCase()
  if (flag === 'false' || flag === '0') return false
  return Boolean(getResendApiKey())
}

export function getResendApiKey(): string | undefined {
  const key = process.env.RESEND_API_KEY?.trim()
  return key || undefined
}

/** Default From header, e.g. `Ziriwa <notifications@yourdomain.com>`. */
export function getEmailFromAddress(): string | undefined {
  return process.env.EMAIL_FROM?.trim() || undefined
}

export function getEmailReplyToAddress(): string | undefined {
  return process.env.EMAIL_REPLY_TO?.trim() || undefined
}

/**
 * In non-production, redirect all outbound mail to these addresses when set.
 * Comma-separated list.
 */
export function getEmailDevRedirectRecipients(): string[] {
  return parseCsv(process.env.EMAIL_DEV_REDIRECT_TO)
}

export function shouldRedirectEmailInDev(): boolean {
  return process.env.NODE_ENV !== 'production'
}
