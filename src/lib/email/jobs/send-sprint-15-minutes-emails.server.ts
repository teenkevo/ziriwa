import 'server-only'

import { sendSprint15MinutesRemainingEmail } from '@/lib/email/messages/sprint-status.server'
import { fetchSprintStatusEmailBundles } from '@/lib/sprint-status-email'
import { isSprint15MinutesRemaining } from '@/lib/sprint-week'

export interface Sprint15MinutesEmailResult {
  date: string
  recipientsTargeted: number
  emailsSent: number
  skipped: number
  errors: string[]
}

export async function sendSprint15MinutesEmails(
  now = new Date(),
): Promise<Sprint15MinutesEmailResult> {
  const today = now.toISOString().slice(0, 10)
  const bundles = (await fetchSprintStatusEmailBundles(today, now)).filter(
    bundle => isSprint15MinutesRemaining(bundle.weekEnd, now),
  )

  const result: Sprint15MinutesEmailResult = {
    date: today,
    recipientsTargeted: bundles.length,
    emailsSent: 0,
    skipped: 0,
    errors: [],
  }

  for (const bundle of bundles) {
    const sendResult = await sendSprint15MinutesRemainingEmail({
      to: bundle.recipientEmail,
      recipientName: bundle.recipientName,
      recipientRole: bundle.recipientRole,
      sectionName: bundle.sectionName,
      weekLabel: bundle.weekLabel,
      rows: bundle.rows,
      summary: bundle.summary,
      idempotencyKey: `sprint-15-minutes:${bundle.sprintId}:${bundle.recipientRole}:${bundle.recipientId}:${bundle.weekStart}`,
    })

    if (!sendResult.ok) {
      result.errors.push(`${bundle.recipientEmail}: ${sendResult.error}`)
      continue
    }

    if (sendResult.skipped) {
      result.skipped++
      continue
    }

    result.emailsSent++
  }

  return result
}
