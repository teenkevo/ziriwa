import 'server-only'

import { Resend } from 'resend'

import { getResendApiKey } from '@/lib/email/env'

let resendClient: Resend | null = null

export function getResendClient(): Resend | null {
  const apiKey = getResendApiKey()
  if (!apiKey) return null

  if (!resendClient) {
    resendClient = new Resend(apiKey)
  }

  return resendClient
}
