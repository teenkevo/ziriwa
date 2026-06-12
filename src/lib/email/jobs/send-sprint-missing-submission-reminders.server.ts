import 'server-only'

import { sendSprintMissingSubmissionsEmail } from '@/lib/email/messages/sprint-missing-submissions.server'
import { fetchSprintMissingSubmissionBundles } from '@/lib/sprint-missing-submissions'

export interface SprintMissingSubmissionReminderResult {
  date: string
  recipientsTargeted: number
  emailsSent: number
  skipped: number
  errors: string[]
}

export async function sendSprintMissingSubmissionReminders(
  today = new Date().toISOString().slice(0, 10),
): Promise<SprintMissingSubmissionReminderResult> {
  const bundles = await fetchSprintMissingSubmissionBundles(today)

  const result: SprintMissingSubmissionReminderResult = {
    date: today,
    recipientsTargeted: bundles.length,
    emailsSent: 0,
    skipped: 0,
    errors: [],
  }

  for (const bundle of bundles) {
    const sendResult = await sendSprintMissingSubmissionsEmail({
      to: bundle.recipientEmail,
      recipientName: bundle.recipientName,
      recipientRole: bundle.recipientRole,
      weekLabel: bundle.weekLabel,
      rows: bundle.rows,
      idempotencyKey: `sprint-missing-submissions:${bundle.recipientRole}:${bundle.recipientId}:${today}`,
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
